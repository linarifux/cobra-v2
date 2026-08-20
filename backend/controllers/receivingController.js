import Receiving from '../models/Receiving.js';
import Inventory from '../models/Inventory.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { sendReceivingConfirmationEmail } from '../utils/emailService.js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// 1. Extract and AGGRESSIVELY CLEAN variables
// This removes any accidental quotes (' or ") and trims hidden trailing spaces
const region = process.env.AWS_REGION?.replace(/['"]/g, '').trim();
const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.replace(/['"]/g, '').trim();
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.replace(/['"]/g, '').trim();
const bucketName = process.env.AWS_S3_BUCKET_NAME?.replace(/['"]/g, '').trim();

// Safely Initialize AWS S3 Client using CLEANED variables
let s3Client;
if (accessKeyId && secretAccessKey) {
  s3Client = new S3Client({
    region: region || 'us-east-1',
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
    },
  });
}

console.log('S3 Client Initialized:', !!s3Client);

// @desc    Create a new receiving record
// @route   POST /api/v1/receiving
export const createReceiving = catchAsync(async (req, res, next) => {
  let receiving = await Receiving.create(req.body);

  // 1. UPDATE INVENTORY ALONG WITH AUDIT LEDGER
  const inventoryItem = await Inventory.findById(receiving.inventoryItem);
  
  if (inventoryItem) {
    inventoryItem.available += receiving.quantity;
    inventoryItem.unitsOnHand += receiving.quantity; // Keep internal fallback synced
    inventoryItem.qtyLastReceived = receiving.quantity;
    inventoryItem.dateLastReceived = receiving.dateReceived || Date.now();
    
    // Push the event to the embedded ledger
    inventoryItem.auditLedger.push({
      event: 'Inbound Receipt',
      referenceId: receiving.receivingId,
      quantityDelta: receiving.quantity
    });

    await inventoryItem.save();
  }

  // Populate the document before sending it back so the React 
  // frontend can immediately display the names without a hard refresh.
  receiving = await receiving.populate([
    { path: 'customer', select: 'customerName' },
    { path: 'vendor' }, // <-- Added Vendor
    { path: 'carrier' }, // <-- Added Carrier
    { 
      path: 'inventoryItem', 
      select: 'itemName description sku productCode division category1 category2 category3 typePiece',
      populate: [
        { path: 'division', select: 'divisionName' },
        { path: 'category1', select: 'categoryName' },
        { path: 'category2', select: 'categoryName' },
        { path: 'category3', select: 'categoryName' }
      ]
    },
    { path: 'locations', select: 'designation storageCategory' }
  ]);

  res.status(201).json({
    status: 'success',
    data: { receiving }
  });
});

// @desc    Get all receiving records
// @route   GET /api/v1/receiving
export const getAllReceiving = catchAsync(async (req, res, next) => {
  const receivingRecords = await Receiving.find()
    .sort({ dateReceived: -1 })
    .populate('customer', 'customerName contactEmail')
    .populate('vendor')
    .populate('carrier')
    .populate({
      path: 'inventoryItem',
      select: 'itemName description sku productCode unitCost price division category1 category2 category3 typePiece',
      populate: [
        { path: 'division', select: 'divisionName' },
        { path: 'category1', select: 'categoryName' },
        { path: 'category2', select: 'categoryName' },
        { path: 'category3', select: 'categoryName' }
      ]
    })
    .populate('locations', 'designation storageCategory');

    console.log(receivingRecords)
  res.status(200).json({
    status: 'success',
    results: receivingRecords.length,
    data: { receiving: receivingRecords }
  });
});

// @desc    Get a single receiving record by ID
// @route   GET /api/v1/receiving/:id
export const getReceivingById = catchAsync(async (req, res, next) => {
  const receiving = await Receiving.findById(req.params.id)
    .populate('customer', 'customerName contactEmail')
    .populate('vendor') // <-- Added Vendor
    .populate('carrier') // <-- Added Carrier
    .populate({
      path: 'inventoryItem',
      select: 'itemName description sku productCode unitCost price division category1 category2 category3 typePiece',
      populate: [
        { path: 'division', select: 'divisionName' },
        { path: 'category1', select: 'categoryName' },
        { path: 'category2', select: 'categoryName' },
        { path: 'category3', select: 'categoryName' }
      ]
    })
    .populate('locations', 'designation storageCategory');

  if (!receiving) {
    return next(new AppError('No receiving record found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { receiving }
  });
});

// @desc    Update a receiving record
// @route   PUT /api/v1/receiving/:id
export const updateReceiving = catchAsync(async (req, res, next) => {
  // 1. Fetch the OLD record first so we can calculate the difference
  let receiving = await Receiving.findById(req.params.id);
  if (!receiving) {
    return next(new AppError('No receiving record found with that ID', 404));
  }

  const oldQuantity = receiving.quantity;
  const oldInventoryId = receiving.inventoryItem.toString();

  // 2. Apply updates and save
  Object.keys(req.body).forEach(key => {
    receiving[key] = req.body[key];
  });
  await receiving.save();

  const newQuantity = receiving.quantity;
  const newInventoryId = receiving.inventoryItem.toString();

  // 3. INVENTORY SYNC LOGIC
  if (oldInventoryId === newInventoryId) {
    const delta = newQuantity - oldQuantity;
    if (delta !== 0) {
      const inventoryItem = await Inventory.findById(newInventoryId);
      if (inventoryItem) {
        inventoryItem.available += delta;
        inventoryItem.unitsOnHand += delta;
        inventoryItem.auditLedger.push({
          event: 'Receipt Modification',
          referenceId: receiving.receivingId,
          quantityDelta: delta
        });
        await inventoryItem.save();
      }
    }
  } else {
    // Remove quantity from the old item
    const oldInv = await Inventory.findById(oldInventoryId);
    if (oldInv) {
      oldInv.available -= oldQuantity;
      oldInv.unitsOnHand -= oldQuantity;
      oldInv.auditLedger.push({
        event: 'Receipt Reassigned (Removed)',
        referenceId: receiving.receivingId,
        quantityDelta: -oldQuantity
      });
      await oldInv.save();
    }
    // Add quantity to the new item
    const newInv = await Inventory.findById(newInventoryId);
    if (newInv) {
      newInv.available += newQuantity;
      newInv.unitsOnHand += newQuantity;
      newInv.qtyLastReceived = newQuantity;
      newInv.dateLastReceived = receiving.dateReceived || Date.now();
      newInv.auditLedger.push({
        event: 'Receipt Reassigned (Added)',
        referenceId: receiving.receivingId,
        quantityDelta: newQuantity
      });
      await newInv.save();
    }
  }

  // 4. Repopulate before sending the response
  receiving = await receiving.populate([
    { path: 'customer', select: 'customerName' },
    { path: 'vendor' }, // <-- Added Vendor
    { path: 'carrier' }, // <-- Added Carrier
    { 
      path: 'inventoryItem', 
      select: 'itemName description sku productCode division category1 category2 category3 typePiece',
      populate: [
        { path: 'division', select: 'divisionName' },
        { path: 'category1', select: 'categoryName' },
        { path: 'category2', select: 'categoryName' },
        { path: 'category3', select: 'categoryName' }
      ]
    },
    { path: 'locations', select: 'designation storageCategory' }
  ]);

  res.status(200).json({
    status: 'success',
    data: { receiving }
  });
});

// @desc    Delete a receiving record
// @route   DELETE /api/v1/receiving/:id
export const deleteReceiving = catchAsync(async (req, res, next) => {
  const receiving = await Receiving.findById(req.params.id);

  if (!receiving) {
    return next(new AppError('No receiving record found with that ID', 404));
  }

  // 1. REVERSE INVENTORY QUANTITY
  const inventoryItem = await Inventory.findById(receiving.inventoryItem);
  if (inventoryItem) {
    inventoryItem.available -= receiving.quantity;
    inventoryItem.unitsOnHand -= receiving.quantity;
    inventoryItem.auditLedger.push({
      event: 'Receipt Deleted / Reversed',
      referenceId: receiving.receivingId,
      quantityDelta: -receiving.quantity
    });
    await inventoryItem.save();
  }

  // 2. Delete the record
  await Receiving.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// @desc    Receive PDF from Frontend -> Save to S3 -> Email Customer
// @route   POST /api/v1/receiving/:id/save-and-send
export const saveAndSendPdf = catchAsync(async (req, res, next) => {
  console.log(`Attempting to save and send PDF for receiving ID: ${req.params.id}`);

  // 1. Check if S3 is configured properly
  if (!s3Client) {
    return next(new AppError('AWS S3 credentials missing from server config (.env). Cannot upload PDF.', 500));
  }

  const { id } = req.params;
  const file = req.file; 
  const { recipientEmail } = req.body; // Extract email targeted by the frontend payload

  if (!file) {
    return next(new AppError('No PDF document was received from the client.', 400));
  }

  // 2. Fetch Receiving Record
  const receiving = await Receiving.findById(id).populate('customer', 'contactEmail');
  
  if (!receiving) {
    return next(new AppError('No receiving record found.', 404));
  }

  // Determine email priority: Target passed from frontend first, fallback to DB record
  const targetEmail = recipientEmail || receiving.customer?.contactEmail;

  if (!targetEmail) {
    return next(new AppError('No recipient email provided or configured.', 400));
  }

  // 3. Extract and AGGRESSIVELY CLEAN AWS variables inside the function
  const region = process.env.AWS_REGION?.replace(/['"]/g, '').trim();
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.replace(/['"]/g, '').trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.replace(/['"]/g, '').trim();
  const bucketName = process.env.AWS_S3_BUCKET_NAME?.replace(/['"]/g, '').trim();

  if (!accessKeyId || !secretAccessKey || !bucketName) {
    return next(new AppError('AWS S3 credentials (Access Key, Secret Key, or Bucket Name) are missing from server configuration.', 500));
  }

  let s3Url;

  // 4. Initialize S3 Client & Upload using try/catch
  try {
    const s3Client = new S3Client({
      region: region || 'us-east-1',
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });

    const s3FileName = `receiving-receipts/${receiving.receivingId}_${Date.now()}.pdf`;
    
    const uploadParams = {
      Bucket: bucketName,
      Key: s3FileName,
      Body: file.buffer,
      ContentType: 'application/pdf'
    };

    console.log(`Sending object to S3 bucket [${bucketName}]...`);
    await s3Client.send(new PutObjectCommand(uploadParams));

    s3Url = `https://${bucketName}.s3.${region || 'us-east-1'}.amazonaws.com/${s3FileName}`;

  } catch (s3Error) {
    console.error("AWS S3 Upload Error:", s3Error);
    return next(new AppError(`AWS S3 Error: ${s3Error.message}`, 500));
  }

  // 5. Save S3 URL to database (Optional tracking)
  receiving.pdfUrl = s3Url; 
  await receiving.save();

  // 6. FIRE AND FORGET: Send Email to the dynamically selected user
  sendReceivingConfirmationEmail(
    targetEmail, 
    receiving.receivingId, 
    file.buffer
  ).catch(emailError => {
    console.error(`Background Email Sending Error for ${receiving.receivingId}:`, emailError);
  });

  // 7. Respond immediately
  res.status(200).json({
    status: 'success',
    message: `PDF successfully saved to S3. Email is being dispatched to ${targetEmail} in the background.`,
    s3Url
  });
});