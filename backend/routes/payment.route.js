import express from 'express';
import { protectedRoute } from '../middleware/auth.middle.js';
import { createCheckoutSession, checkoutSuccess } from '../controllers/payment.controller.js';

const router = express.Router();

router.get("/create-checkout-session", protectedRoute, createCheckoutSession);
router.get("/checkout-success", protectedRoute, checkoutSuccess);

export default router;