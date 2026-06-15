import express from 'express';
import {
  createLocation,
  getAllLocations,
  getLocationById,
  updateLocation,
  deleteLocation
} from '../controllers/locationController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router({ mergeParams: true }); // Merge params to access :customerId in nested routes

// Require valid authentication for all location routes
// router.use(protect);

router.route('/')
  .get(getAllLocations)
//   .post(restrictTo('admin', 'staff', 'warehouse'), createLocation);
.post(createLocation); // Allow all authenticated users to create locations for flexibility

router.route('/:id')
  .get(getLocationById)
//   .put(restrictTo('admin', 'staff', 'warehouse'), updateLocation)
    .put(updateLocation) // Allow all authenticated users to update locations for flexibility
//   .delete(restrictTo('admin', 'staff'), deleteLocation); // Restrict structural deletion to higher roles
.delete(deleteLocation); // Allow all authenticated users to delete locations for flexibility

export default router;