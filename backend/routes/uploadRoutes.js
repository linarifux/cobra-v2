import express from 'express';
import { getPresignedUrl } from '../controllers/uploadController.js';
import {protect} from '../middlewares/authMiddleware.js'


const router = express.Router();

router.use(protect)

// Route to request an upload URL (Make sure this is protected in production!)
router.get('/presigned-url', getPresignedUrl);

export default router;
