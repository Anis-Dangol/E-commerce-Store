import express from 'express';
import { protectedRoute } from '../middleware/auth.middle';
import { getCoupon, validateCoupon } from '../controllers/coupon.controller';

const router = express.Router();

router.get("/", protectedRoute, getCoupon);
router.get("/validate", protectedRoute, validateCoupon);


export default router;