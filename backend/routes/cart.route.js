import express from 'express';
import { getCartProducts, addToCart, RemoveAllFromCart, updateQuantity } from '../controllers/cart.controller.js';
import { protectedRoute } from '../middleware/auth.middle.js';

const router = express.Router();

router.post("/", protectedRoute, getCartProducts);
router.post("/", protectedRoute, addToCart);
router.post("/", protectedRoute, RemoveAllFromCart);
router.post("/:id", protectedRoute, updateQuantity);

export default router;