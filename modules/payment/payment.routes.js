// const { Router } = require("express");
// const authGuard = require("../auth/auth.guard");
// const {
//   paymentBasketHandler,
//   paymentVerifyHandler,
// } = require("./payment.service");
// const router = Router();
// router.post("/", authGuard, paymentBasketHandler);
// router.get("/callback", paymentVerifyHandler);
// router.get("/verify", paymentVerifyHandler);
// module.exports = { paymentRoutes: router };

const { Router } = require("express");
const authGuard = require("../auth/auth.guard");

const {
  paymentBasketHandler,
  paymentVerifyHandler,
} = require("./payment.service");

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     PaymentCheckoutInput:
 *       type: object
 *       required:
 *         - address
 *       properties:
 *         address:
 *           type: string
 *           minLength: 1
 *           maxLength: 2000
 *           example: "Tehran, Valiasr Street, No. 12"
 *
 *     PaymentCheckoutResponse:
 *       type: object
 *       properties:
 *         orderId:
 *           type: integer
 *           example: 10
 *         paymentId:
 *           type: integer
 *           example: 25
 *         authority:
 *           type: string
 *           description: Payment authority returned by the gateway.
 *         paymentUrl:
 *           type: string
 *           format: uri
 *           description: Gateway URL for completing payment.
 *
 *     PaymentVerificationResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Payment verified"
 *         paymentId:
 *           type: integer
 *           example: 25
 *         refId:
 *           type: string
 *           nullable: true
 *           description: Payment reference returned by the gateway.
 */

/**
 * @openapi
 * /payment:
 *   post:
 *     tags:
 *       - Payment
 *     summary: Initiate checkout and payment
 *     description: >
 *       Create an order from the authenticated user's basket,
 *       reserve stock for 20 minutes and request a payment
 *       from Zarinpal. A unique Idempotency-Key header is
 *       required. Reusing the same key for the same checkout
 *       returns the existing payment state instead of
 *       creating another order.
 *     operationId: initiatePayment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: Idempotency-Key
 *         in: header
 *         required: true
 *         description: >
 *           Unique checkout key. Use the same key when retrying
 *           the same checkout. Use a new key for a new checkout.
 *         schema:
 *           type: string
 *           minLength: 16
 *           maxLength: 80
 *           pattern: '^[a-zA-Z0-9_-]{16,80}$'
 *         example: "checkout_demo_123456789"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentCheckoutInput'
 *     responses:
 *       '201':
 *         description: >
 *           New checkout created and payment gateway
 *           request initialized successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentCheckoutResponse'
 *       '200':
 *         description: >
 *           Existing checkout returned for a repeated
 *           Idempotency-Key. Response fields vary depending
 *           on the existing payment state.
 *       '400':
 *         description: >
 *           Missing or invalid checkout key, invalid address
 *           or empty basket.
 *       '401':
 *         description: Authentication required
 *       '409':
 *         description: >
 *           Checkout conflict, invalid amount, closed
 *           checkout or payment initialization in progress.
 *       '500':
 *         description: Internal server or payment gateway error
 */

/**
 * @openapi
 * /payment/callback:
 *   get:
 *     tags:
 *       - Payment
 *     summary: Handle payment gateway callback
 *     description: >
 *       Process a payment gateway callback.
 *       This route is public because the gateway redirects
 *       the customer here. Payment success is established
 *       through server-side gateway verification, not merely
 *       the callback query parameters. Do not invoke this
 *       endpoint manually to simulate a successful payment.
 *     operationId: paymentCallback
 *     parameters:
 *       - name: Authority
 *         in: query
 *         required: true
 *         description: Payment authority issued by Zarinpal.
 *         schema:
 *           type: string
 *       - name: Status
 *         in: query
 *         required: false
 *         description: >
 *           Gateway callback status, normally OK or NOK.
 *         schema:
 *           type: string
 *           enum:
 *             - OK
 *             - NOK
 *     responses:
 *       '200':
 *         description: >
 *           Payment verified successfully or already paid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentVerificationResponse'
 *       '400':
 *         description: Missing payment authority
 *       '404':
 *         description: Payment not found
 *       '409':
 *         description: >
 *           Payment not confirmed, closed, expired,
 *           or requires reconciliation.
 *       '500':
 *         description: Payment verification or internal error
 */

/**
 * @openapi
 * /payment/verify:
 *   get:
 *     tags:
 *       - Payment
 *     summary: Verify payment with gateway
 *     description: >
 *       Verify a payment using its authority and gateway
 *       callback status. This endpoint uses the same
 *       verification handler as /payment/callback.
 *       The gateway is contacted before a payment is marked
 *       as paid. Do not manually fabricate callback values.
 *     operationId: verifyPayment
 *     parameters:
 *       - name: Authority
 *         in: query
 *         required: true
 *         description: Payment authority issued by Zarinpal.
 *         schema:
 *           type: string
 *       - name: Status
 *         in: query
 *         required: false
 *         description: >
 *           Gateway callback status, normally OK or NOK.
 *         schema:
 *           type: string
 *           enum:
 *             - OK
 *             - NOK
 *     responses:
 *       '200':
 *         description: >
 *           Payment verification completed or payment
 *           was already confirmed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentVerificationResponse'
 *       '400':
 *         description: Missing payment authority
 *       '404':
 *         description: Payment not found
 *       '409':
 *         description: >
 *           Payment verification conflict or reconciliation required
 *       '500':
 *         description: Payment gateway or internal server error
 */

router.post("/", authGuard, paymentBasketHandler);

router.get("/callback", paymentVerifyHandler);

router.get("/verify", paymentVerifyHandler);

module.exports = { paymentRoutes: router };
