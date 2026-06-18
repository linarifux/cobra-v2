import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import crypto from 'crypto';

// Initialize S3 Client
// In production, ensure AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET_NAME are in your .env file
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// @desc    Generate a presigned URL for direct S3 upload
// @route   GET /api/v1/upload/presigned-url
export const getPresignedUrl = catchAsync(async (req, res, next) => {
  const { fileName, fileType } = req.query;

  if (!fileName || !fileType) {
    return next(new AppError('Filename and fileType are required', 400));
  }

  // Create a unique filename to prevent overwriting
  const rawFileName = fileName.split('.')[0];
  const uniqueFileName = `${rawFileName}-${crypto.randomBytes(8).toString('hex')}.${fileName.split('.').pop()}`;
  const s3Key = `inventory-images/${uniqueFileName}`; // Storing inside a folder

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: s3Key,
    ContentType: fileType,
  });

  // URL expires in 60 seconds for security
  const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

  // The final public URL where the image will be accessible after upload
  const finalImageUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;

  res.status(200).json({
    status: 'success',
    presignedUrl,
    finalImageUrl,
  });
});