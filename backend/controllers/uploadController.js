import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import crypto from 'crypto';
import { log } from 'console';

// @desc    Generate a presigned URL for direct S3 upload
// @route   GET /api/v1/upload/presigned-url
export const getPresignedUrl = catchAsync(async (req, res, next) => {
  const { fileName, fileType } = req.query;
  log(req.query)

  if (!fileName || !fileType) {
    return next(new AppError('Filename and fileType are required', 400));
  }

  // 1. Extract and AGGRESSIVELY CLEAN variables
  // This removes any accidental quotes (' or ") and trims hidden trailing spaces
  const region = process.env.AWS_REGION?.replace(/['"]/g, '').trim();
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.replace(/['"]/g, '').trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.replace(/['"]/g, '').trim();
  const bucketName = process.env.AWS_S3_BUCKET_NAME?.replace(/['"]/g, '').trim();

  // 2. Strict Validation & Terminal Logging
  if (!region || !accessKeyId || !secretAccessKey || !bucketName) {
    console.error("❌ AWS S3 Configuration Error. Check your .env file!");
    console.error(`- AWS_REGION: ${region ? '✅ Loaded' : '❌ MISSING'}`);
    console.error(`- AWS_ACCESS_KEY_ID: ${accessKeyId ? '✅ Loaded' : '❌ MISSING'}`);
    console.error(`- AWS_SECRET_ACCESS_KEY: ${secretAccessKey ? '✅ Loaded' : '❌ MISSING'}`);
    console.error(`- AWS_S3_BUCKET_NAME: ${bucketName ? '✅ Loaded' : '❌ MISSING'}`);
    
    return next(new AppError('Server configuration error: Missing AWS credentials.', 500));
  }

  try {
    // 3. Initialize Client safely
    const s3Client = new S3Client({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });

    // Create a unique filename to prevent overwriting
    const rawFileName = fileName.split('.')[0];
    const uniqueFileName = `${rawFileName}-${crypto.randomBytes(8).toString('hex')}.${fileName.split('.').pop()}`;
    const s3Key = `inventory-images/${uniqueFileName}`; // Storing inside a folder

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      ContentType: fileType,
    });

    // URL expires in 60 seconds for security
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

    // The final public URL where the image will be accessible after upload
    const finalImageUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;

    
    res.status(200).json({
      status: 'success',
      presignedUrl,
      finalImageUrl,
    });

  } catch (awsError) {
    // 4. Dedicated error logging for the AWS SDK execution
    console.error("🔥 AWS SDK Error Details:", awsError);
    return next(new AppError(`AWS Error: ${awsError.message || 'Failed to sign URL'}`, 500));
  }
});