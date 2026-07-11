import express from 'express';
import multer from 'multer'; // <-- Import multer for handling PDF file uploads
import {
  createReceiving,
  getAllReceiving,
  getReceivingById,
  updateReceiving,
  deleteReceiving,
  // printReceivingPDF,
  saveAndSendPdf // <-- Updated controller function
} from '../controllers/receivingController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router({ mergeParams: true });

// Configure Multer to store incoming files in RAM (Memory Storage) 
// so we can directly push them to AWS S3 without saving them to the local disk.
const upload = multer({ storage: multer.memoryStorage() });

// Require valid authentication for all receiving routes
router.use(protect);

router.route('/')
  // All authenticated users can view receiving logs
  .get(getAllReceiving)
  // Staff and Admins can log new inbound shipments
  .post(restrictTo('admin', 'super_admin', 'warehouse_manager', 'staff'), createReceiving);

router.route('/:id')
  // All authenticated users can view specific log details
  .get(getReceivingById)
  // Updates to a log require staff permissions
  .put(restrictTo('admin', 'super_admin', 'warehouse_manager', 'staff'), updateReceiving)
  // Deleting a financial/inventory log entirely should be strictly limited to admins
  .delete(restrictTo('admin', 'super_admin'), deleteReceiving);

// Route for backend PDF generation (if still needed as a fallback)
// router.get('/:id/print', printReceivingPDF);

// NEW ROUTE: Expects a multipart/form-data request containing a file named 'pdfDocument'
router.post(
  '/:id/save-and-send', 
  upload.single('pdfDocument'), 
  saveAndSendPdf
);

export default router;