import express from 'express';
import {
  createTypePiece,
  getAllTypePieces,
  getTypePieceById,
  updateTypePiece,
  deleteTypePiece
} from '../controllers/typePieceController.js';

const router = express.Router();

// You can add your authentication middleware here if needed
// router.use(protect);

router
  .route('/')
  .get(getAllTypePieces)
  .post(createTypePiece);

router
  .route('/:id')
  .get(getTypePieceById)
  .put(updateTypePiece)
  .delete(deleteTypePiece);

export default router;