import User from '../models/User.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import bcrypt from 'bcryptjs';
import { parse } from 'csv-parse/sync';

// @desc    Create a new user (Order Portal users or Admin users)
// @route   POST /api/v1/users
export const createUser = catchAsync(async (req, res, next) => {
  let { 
    name, email, phone, addresses, userAddress, password, 
    portal, role, customer, divisions, chargeCode, orderLimit, 
    showCostsInCp, isActive, releasePendingOrders 
  } = req.body;

  // Security Check: Only super_admins can create other Admin portal users
  if (portal === 'admin' && req.user.role !== 'super_admin') {
    return next(new AppError('Only Super Admins can create Admin Portal users.', 403));
  }

  // Security Check: Standard admins can create order portal users, but must provide customer ID
  if (portal === 'order' && !customer) {
    return next(new AppError('Order portal users must be assigned to a Customer.', 400));
  }

  // DATA MAPPING: Intercept the array format from the frontend and map it to the new `userAddress` field
  if (addresses && addresses.length > 0 && typeof addresses[0] === 'object' && !addresses[0]._id) {
    userAddress = addresses[0];
    addresses = []; // Reset because the schema now expects ObjectIds for secondary addresses
  }

  const newUser = await User.create({
    name,
    email,
    phone, 
    userAddress, // Stored directly on the user profile
    addresses: addresses || [], 
    password,
    portal,
    role,
    chargeCode,
    orderLimit: portal === 'order' ? orderLimit : undefined,
    showCostsInCp: portal === 'order' ? showCostsInCp : undefined,
    releasePendingOrders: portal === 'order' ? releasePendingOrders : undefined,
    isActive: isActive !== undefined ? isActive : true,
    customer: portal === 'order' ? customer : undefined,
    divisions: portal === 'order' ? (divisions || []) : []
  });

  // Strip password from memory before returning
  newUser.password = undefined;

  // Populate relational arrays so the frontend has immediate access to names/codes
  await newUser.populate('customer', 'customerName');
  await newUser.populate('divisions', 'divisionName divisionCode status');

  res.status(201).json({
    status: 'success',
    data: { user: newUser }
  });
});

// @desc    Get all users (Filterable)
// @route   GET /api/v1/users
export const getAllUsers = catchAsync(async (req, res, next) => {
  // Allows querying like /api/v1/users?portal=order&customer=123
  const filter = { ...req.query }; 
  
  const users = await User.find(filter)
    .populate('customer', 'customerName')
    .populate('divisions', 'divisionName divisionCode status')
    .populate('addresses'); // Populate any secondary addresses from the Address collection

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: { users }
  });
});

// @desc    Update a user (Role, Name, Active Status, Divisions, Addresses)
// @route   PUT /api/v1/users/:id
export const updateUser = catchAsync(async (req, res, next) => {
  
  const userToUpdate = await User.findById(req.params.id);
  if (!userToUpdate) return next(new AppError('No user found', 404));

  // Security Check: Only super_admin can modify other admins
  if (userToUpdate.portal === 'admin' && req.user.role !== 'super_admin') {
    return next(new AppError('Only Super Admins can modify Admin Portal users.', 403));
  }

  // DATA MAPPING: Intercept array format from frontend and map to `userAddress`
  if (req.body.addresses && req.body.addresses.length > 0 && typeof req.body.addresses[0] === 'object' && !req.body.addresses[0]._id) {
    req.body.userAddress = req.body.addresses[0];
    delete req.body.addresses; // Prevent casting errors on the ObjectIds array
  }

  const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  })
  .populate('customer', 'customerName')
  .populate('divisions', 'divisionName divisionCode status')
  .populate('addresses');

  res.status(200).json({
    status: 'success',
    data: { user: updatedUser }
  });
});

// @desc    Delete a user completely
// @route   DELETE /api/v1/users/:id
export const deleteUser = catchAsync(async (req, res, next) => {
  // This route should ideally be protected by middleware to ONLY allow super_admin
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// @desc    Get a single user
// @route   GET /api/v1/users/:id
export const getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .populate('customer', 'customerName')
    .populate('divisions', 'divisionName divisionCode status')
    .populate('addresses'); 

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

// @desc    Bulk upload users from CSV
// @route   POST /api/v1/users/bulk-upload
// @access  Private/Admin
export const bulkUploadUsers = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please provide a CSV file.', 400));
  }

  try {
    // 1. Add BOM stripping to gracefully handle Excel-exported CSVs
    const fileContent = req.file.buffer.toString('utf-8');
    
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true 
    });

    if (records.length === 0) {
      return next(new AppError('The uploaded CSV file is empty.', 400));
    }

    const usersToInsert = [];
    const errors = [];
    const processedEmails = new Set();

    // 2. Pre-fetch existing emails to avoid O(N) database queries in the loop
    const emailsInCsv = records.map(r => r['Email']?.toLowerCase()).filter(Boolean);
    const existingUsers = await User.find({ email: { $in: emailsInCsv } }).select('email').lean();
    const existingEmailSet = new Set(existingUsers.map(u => u.email));

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2; 

      // Check critical required fields
      if (!row['Email'] || !row['Name'] || !row['Password']) {
        errors.push(`Row ${rowNum} (${row['Name'] || 'Unknown'}): Missing Name, Email, or Password.`);
        continue;
      }

      const email = row['Email'].toLowerCase();

      // Check DB Duplicates
      if (existingEmailSet.has(email)) {
        errors.push(`Row ${rowNum} (${row['Name']}): User with email ${email} already exists.`);
        continue;
      }

      // Check In-CSV Duplicates
      if (processedEmails.has(email)) {
        errors.push(`Row ${rowNum} (${row['Name']}): Duplicate email found within the CSV file itself.`);
        continue;
      }

      // Validate Password Length
      if (row['Password'].length < 6) {
        errors.push(`Row ${rowNum} (${row['Name']}): Password must be at least 6 characters.`);
        continue;
      }

      const portalType = row['Portal (admin | order)'] || 'order';

      // Check Customer/Division requirements for Order Portal users
      if (portalType === 'order') {
        if (!row['Customer_ID']) {
          errors.push(`Row ${rowNum} (${row['Name']}): Missing Customer_ID. Please ensure the Customer_ID column is filled for ALL rows.`);
          continue;
        }
        if (!row['Division_ID']) {
          errors.push(`Row ${rowNum} (${row['Name']}): Missing Division_ID. Please ensure the Division_ID column is filled for ALL rows.`);
          continue;
        }
      }

      const userDoc = {
        name: row['Name'],
        email: email,
        password: row['Password'], 
        phone: row['Phone'] || '',
        portal: portalType,
        role: row['Role (super_admin | admin | super_user | manager | standard)'] || 'standard',
        chargeCode: row['ChargeCode'] || '',
        orderLimit: row['OrderLimit'] ? Number(row['OrderLimit']) : undefined,
        showCostsInCp: row['ShowCostsInCp (true | false)'] === 'true',
        releasePendingOrders: row['ReleasePendingOrders (true | false)'] === 'true',
        isActive: row['IsActive (true | false)'] !== 'false',
        
        userAddress: {
          street1: row['Street1'] || '',
          street2: row['Street2'] || '',
          city: row['City'] || '',
          state: row['State'] || '',
          zipCode: row['ZipCode'] || '',
          country: row['Country'] || 'US'
        },
      };

      // Aggressively strip out hidden characters (like \r or \n) from ObjectIds
      if (row['Customer_ID']) userDoc.customer = row['Customer_ID'].replace(/[\r\n\s]+/g, '');
      if (row['Division_ID']) userDoc.divisions = [row['Division_ID'].replace(/[\r\n\s]+/g, '')];

      // 3. Mongoose Pre-Validation: Catch schema errors BEFORE insertMany aborts the whole batch
      const tempUser = new User(userDoc);
      const validationError = tempUser.validateSync();
      if (validationError) {
        errors.push(`Row ${rowNum} (${row['Name']}): Schema Error - ${validationError.message}`);
        continue;
      }

      // Hash password manually since insertMany bypasses standard pre('save') hooks
      userDoc.password = await bcrypt.hash(userDoc.password, 12);

      usersToInsert.push(userDoc);
      processedEmails.add(email);
    }

    // If NO users passed validation, reject the entire request and show exactly why
    if (usersToInsert.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'No valid users could be imported. Please review the specific row errors.',
        errors: errors
      });
    }

    let insertedCount = 0;

    try {
      // 4. Insert ignoring model validations (since we pre-validated)
      // rawResult: true returns lightweight metadata instead of heavy populated Mongoose docs
      const result = await User.insertMany(usersToInsert, { ordered: false, rawResult: true });
      insertedCount = result.insertedCount || usersToInsert.length;
    } catch (dbError) {
      if (['MongoBulkWriteError', 'BulkWriteError', 'MongooseBulkWriteError'].includes(dbError.name)) {
        insertedCount = dbError.insertedCount || dbError.result?.nInserted || 0;
        const writeErrors = dbError.writeErrors?.map(e => e.errmsg) || [dbError.message];
        errors.push(...writeErrors);
      } else {
        throw dbError; 
      }
    }

    // If SOME users passed but others failed, return 207 Multi-Status
    if (errors.length > 0) {
       return res.status(207).json({
         status: 'partial_success',
         message: `Imported ${insertedCount} users, but ${errors.length} failed.`,
         data: {
           count: insertedCount,
           errors: errors
         }
       });
    }

    // 100% Success
    res.status(201).json({
      status: 'success',
      data: {
        count: insertedCount,
        errors: null
      }
    });

  } catch (error) {
    console.error("Bulk Upload Error:", error);
    return next(new AppError('Critical error processing CSV file: ' + error.message, 500));
  }
});