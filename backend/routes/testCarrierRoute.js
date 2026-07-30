import express from 'express';
import { createCarrierConnection } from '../controllers/testCarrierController.js';

const router = express.Router();

router.post('/', createCarrierConnection);

export default router;