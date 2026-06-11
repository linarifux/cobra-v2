import express from 'express';
import {
  createAddress,
  getAllAddresses,
  getAddressById,
  updateAddress,
  deleteAddress
} from '../controllers/addressController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

// mergeParams allows this router to catch requests from /customers/:customerId/addresses
const router = express.Router({ mergeParams: true });

// Require valid authentication
// router.use(protect);

router.route('/')
  .get(getAllAddresses)
//   .post(restrictTo('admin', 'staff'), createAddress);
.post(createAddress);

router.route('/:id')
  .get(getAddressById)
//   .put(restrictTo('admin', 'staff'), updateAddress)
.put(updateAddress)
//   .delete(restrictTo('admin', 'staff'), deleteAddress);
.delete(deleteAddress);

export default router;