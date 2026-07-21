import express from 'express';
import { getCart, syncCart, clearCart } from '../controllers/cartController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All cart routes require the user to be logged in
router.use(protect);

router
  .route('/')
  .get(getCart)
  .put(syncCart)
  .delete(clearCart);

export default router;