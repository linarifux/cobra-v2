import express from 'express';
import {
  createLocation,
  getAllLocations,
  getLocationById,
  updateLocation,
  deleteLocation
} from '../controllers/locationController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router({ mergeParams: true });

// Require valid authentication for all location routes
// (Uncomment this when local auth is fully active)
// router.use(protect);

router.route('/')
  // Anyone logged into the warehouse system needs to see locations
  .get(getAllLocations)
  // Only Admins and Warehouse Managers should be able to create new physical racks
  .post(restrictTo('admin', 'super_admin', 'warehouse_manager'), createLocation);

router.route('/:id')
  // Open to all staff to view what is inside a specific rack
  .get(getLocationById)
  // Staff need to update locations to move inventory in/out
  .put(restrictTo('admin', 'super_admin', 'warehouse_manager', 'staff'), updateLocation)
  // Only Admins can physically delete/decommission a rack from the database
  .delete(restrictTo('admin', 'super_admin'), deleteLocation); 

export default router;