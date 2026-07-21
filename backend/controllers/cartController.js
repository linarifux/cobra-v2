import Cart from '../models/Cart.js';
import { catchAsync } from '../utils/catchAsync.js';

// @desc    Get current user's cart for a specific division
// @route   GET /api/v1/cart?division=XYZ
export const getCart = catchAsync(async (req, res, next) => {
  const { division } = req.query;
  
  if (!division) {
    return res.status(400).json({ status: 'fail', message: 'Division parameter is required to fetch a cart.' });
  }

  let cart = await Cart.findOne({ user: req.user._id, division })
    .populate('items.product');

  if (!cart) {
    return res.status(200).json({ status: 'success', data: { cart: { items: [], cartTotal: 0 } } });
  }

  res.status(200).json({ status: 'success', data: { cart } });
});

// @desc    Sync/Update the entire cart
// @route   PUT /api/v1/cart
export const syncCart = catchAsync(async (req, res, next) => {
  const { items, customer, division } = req.body;

  if (!division) {
    return res.status(400).json({ status: 'fail', message: 'Division is required to sync cart.' });
  }

  // Look for the specific cart for this user AND division
  let cart = await Cart.findOne({ user: req.user._id, division });

  if (cart) {
    cart.items = items;
    if (customer) cart.customer = customer;
    await cart.save();
  } else {
    cart = await Cart.create({
      user: req.user._id,
      customer,
      division,
      items
    });
  }

  await cart.populate('items.product');
  res.status(200).json({ status: 'success', data: { cart } });
});

// @desc    Clear the cart (Used after successful checkout)
// @route   DELETE /api/v1/cart?division=XYZ
export const clearCart = catchAsync(async (req, res, next) => {
  const { division } = req.query;

  if (!division) {
    return res.status(400).json({ status: 'fail', message: 'Division parameter is required to clear a cart.' });
  }

  await Cart.findOneAndDelete({ user: req.user._id, division });
  res.status(200).json({ status: 'success', data: null });
});