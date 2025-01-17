import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";
import { stripe } from "../lib/stripe.js";

export const createCheckoutSession = async (req, res) => {
    try {
        const { products, couponCode } = req.body;

        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ message: "Invalid or empty products array" });
        }

        let totalAmount = 0;

        const lineItems = products.map(product => {
            const amount = Math.round(product.price * 100); // Stripe requires the price in cents so we multiply by 100 and round it
            totalAmount += amount * product.quantity;

            return { 
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: product.name,
                        images: [product.image],
                    },
                    unit_amount: amount,
                }
            }
        });

        let coupon = null;
        if(couponCode) {
            coupon = await Coupon.findOne({ code: couponCode, userId: req.user._id, isActive: true });
            if(coupon) {
                totalAmount -= Math.round(totalAmount * coupon.discountPercentage / 100);
            }

            const session = await stripe.sessions.create({
                payment_method_types: ["card"],
                lime_items: lineItems,
                mode: "payment",
                success_url: `${process.env.CLIENT_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.CLIENT_URL}/purchase-cancel`,
                discounts: coupon
                    ? [
                        {
                            coupon: await createStripeCoupon(coupon.discountPercentage),
                        }
                    ]
                    : [],
                metadata: {
                    userId: req.user._id.toString(),
                    couponCode: couponCode || "",
                    products: JSON.stringify(
                        products.map((p) => ({
                            id: p._id,
                            quantity: p.quantity,
                            price: p.price,
                        }))
                    ),
                },
            });
            
            if(totalAmount >= 20000){
                await createNewCoupon(req.user._id.toString());
            }
            res.status(200).json({ id: session.id, totalAmount: totalAmount / 100 });
        }
    } catch (error) {
        console.log("Error in createCheckoutSession controller", error.message);
        res.status(500).json({ message: "Error creating checkout session", error: error.message });
    }
};

export const checkoutSuccess = async (req, res) => {
    try {
        const { session_id } = req.body;
        const session = await stripe.checkout.sessions.retrieve(session_id);

        if(session.payment_status === "paid") {
            
            if(session.metadata.couponCode) {
                await Coupon.findOneAndUpdate({ 
                    code: session.metadata.couponCode,
                    userId: session.metadata.userId,
                }, { 
                    isActive: false,
                });
            }

            // create a new order
            const products = JSON.parse(session.metadata.products);
            const newOrder = new Order({
                user:session.metadata.userId,
                products: products.map(product => ({
                    product: product.id,
                    quantity: product.quantity,
                    price: product.price,
                })),
                totalAmount: session.amount_total / 100,   // convert from cents to dollars
                stripeSessionId: session.id
            });

            await newOrder.save();

            res.status(200).json({ 
                succcess: true,
                message: "Payment successful, order created and coupon deactivated if used.",
                orderId: newOrder._id,
            });
        }

    } catch (error) {
        console.log("Error in CheckoutSuccess controller", error.message);
        res.status(500).json({ message: "Error processing successful checkout", error: error.message });
    }
};

async function createStripeCoupon(discountPercentage) {
    const coupon = await stripe.coupons.create({
        percent_off: discountPercentage,
        duration: "once",
    });
    return coupon.id;
}

async function createNewCoupon() {
    const newCoupon = new Coupon({
        code: "GIFT" + Math.random().toString(36).substring(7).toUpperCase(),
        discountPercentage: 10,
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),    // 30 days from now
        userId: userId,
    });
    await newCoupon.save();

    return newCoupon;
}