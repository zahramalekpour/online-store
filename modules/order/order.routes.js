// const { Router } = require("express");
// const authGuard = require("../auth/auth.guard");
// const requireRole = require("../auth/requireRole");
// const {
//   getMyOrdersHandler,
//   getOrderByIdHandler,
//   setPackedStatusToOrder,
//   setInTransitStatusToOrder,
//   setCanceledStatusToOrder,
//   setDeliveryStatusToOrder,
// } = require("./order.service");
// const router = Router();
// router.use(authGuard);
// router.get("/", getMyOrdersHandler);
// router.get("/:id", getOrderByIdHandler);
// // These routes change fulfillment state and must never be accessible to customers.
// router.patch("/set-packed/:id", requireRole("admin"), setPackedStatusToOrder);
// router.patch(
//   "/set-in-transit/:id",
//   requireRole("admin"),
//   setInTransitStatusToOrder,
// );
// router.patch(
//   "/set-canceled/:id",
//   requireRole("admin"),
//   setCanceledStatusToOrder,
// );
// router.patch(
//   "/set-delivery/:id",
//   requireRole("admin"),
//   setDeliveryStatusToOrder,
// );
// module.exports = { orderRoutes: router };

const { Router } = require("express");
const authGuard = require("../auth/auth.guard");
const requireRole = require("../auth/requireRole");

const {
  getMyOrdersHandler,
  getOrderByIdHandler,
  setPackedStatusToOrder,
  setInTransitStatusToOrder,
  setCanceledStatusToOrder,
  setDeliveryStatusToOrder,
} = require("./order.service");

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         paymentId:
 *           type: integer
 *           nullable: true
 *         status:
 *           type: string
 *           description: Current order status
 *         address:
 *           type: string
 *         userId:
 *           type: integer
 *         final_amount:
 *           type: string
 *           description: Decimal amount
 *         total_amount:
 *           type: string
 *           description: Decimal amount
 *         discount_amount:
 *           type: string
 *           description: Decimal amount
 *         reason:
 *           type: string
 *           description: Order reason field
 *         created_at:
 *           type: string
 *           format: date-time
 *
 *     OrderItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         orderId:
 *           type: integer
 *         productId:
 *           type: integer
 *         colorId:
 *           type: integer
 *           nullable: true
 *         sizeId:
 *           type: integer
 *           nullable: true
 *         count:
 *           type: integer
 *         product:
 *           type: object
 *           nullable: true
 *           additionalProperties: true
 *         color:
 *           type: object
 *           nullable: true
 *           additionalProperties: true
 *         size:
 *           type: object
 *           nullable: true
 *           additionalProperties: true
 *
 *     OrderStatusResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Order status updated
 *         orderId:
 *           type: integer
 *           example: 1
 *         status:
 *           type: string
 *           description: New order status
 *
 *     OrderCancellationInput:
 *       type: object
 *       required:
 *         - reason
 *       properties:
 *         reason:
 *           type: string
 *           minLength: 1
 *           example: Customer requested cancellation
 */

/**
 * @openapi
 * /orders:
 *   get:
 *     tags:
 *       - Orders
 *     summary: Get my orders
 *     description: >
 *       Retrieve orders belonging to the authenticated user.
 *       Optionally filter by a valid order status.
 *     operationId: getMyOrders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         required: false
 *         description: >
 *           Optional order status. Must match a value
 *           defined in the application's orderStatus constants.
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *       '400':
 *         description: Invalid order status
 *       '401':
 *         description: Authentication required
 *       '500':
 *         description: Internal server error
 */

/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     tags:
 *       - Orders
 *     summary: Get my order by ID
 *     description: >
 *       Retrieve a specific order belonging to
 *       the authenticated user, including its items.
 *     operationId: getMyOrderById
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Order ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 1
 *     responses:
 *       '200':
 *         description: Order retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 order:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Order'
 *                     - type: object
 *                       properties:
 *                         items:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/OrderItem'
 *       '400':
 *         description: Invalid order ID
 *       '401':
 *         description: Authentication required
 *       '404':
 *         description: Order not found or not owned by user
 *       '500':
 *         description: Internal server error
 */

/**
 * @openapi
 * /orders/set-packed/{id}:
 *   patch:
 *     tags:
 *       - Orders
 *     summary: Mark order as packed
 *     description: >
 *       Admin only. Change order status
 *       from inProcess to packed.
 *     operationId: setOrderPacked
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       '200':
 *         description: Order status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderStatusResponse'
 *       '400':
 *         description: Invalid order ID
 *       '401':
 *         description: Authentication required
 *       '403':
 *         description: Admin access required
 *       '404':
 *         description: Order not found
 *       '409':
 *         description: Invalid order status transition
 *       '500':
 *         description: Internal server error
 */

/**
 * @openapi
 * /orders/set-in-transit/{id}:
 *   patch:
 *     tags:
 *       - Orders
 *     summary: Mark order as in transit
 *     description: >
 *       Admin only. Change order status
 *       from packed to inTransit.
 *     operationId: setOrderInTransit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       '200':
 *         description: Order status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderStatusResponse'
 *       '400':
 *         description: Invalid order ID
 *       '401':
 *         description: Authentication required
 *       '403':
 *         description: Admin access required
 *       '404':
 *         description: Order not found
 *       '409':
 *         description: Invalid order status transition
 *       '500':
 *         description: Internal server error
 */

/**
 * @openapi
 * /orders/set-canceled/{id}:
 *   patch:
 *     tags:
 *       - Orders
 *     summary: Cancel an order
 *     description: >
 *       Admin only. Cancel an order currently
 *       in inProcess, packed, or inTransit status.
 *       A cancellation reason is required.
 *     operationId: cancelOrder
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrderCancellationInput'
 *     responses:
 *       '200':
 *         description: Order canceled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Order canceled
 *                 orderId:
 *                   type: integer
 *                   example: 1
 *       '400':
 *         description: Invalid ID or missing cancellation reason
 *       '401':
 *         description: Authentication required
 *       '403':
 *         description: Admin access required
 *       '404':
 *         description: Order not found
 *       '409':
 *         description: Order cannot be canceled in current state
 *       '500':
 *         description: Internal server error
 */

/**
 * @openapi
 * /orders/set-delivery/{id}:
 *   patch:
 *     tags:
 *       - Orders
 *     summary: Mark order as delivered
 *     description: >
 *       Admin only. Change order status
 *       from inTransit to delivery.
 *     operationId: setOrderDelivery
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       '200':
 *         description: Order status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderStatusResponse'
 *       '400':
 *         description: Invalid order ID
 *       '401':
 *         description: Authentication required
 *       '403':
 *         description: Admin access required
 *       '404':
 *         description: Order not found
 *       '409':
 *         description: Invalid order status transition
 *       '500':
 *         description: Internal server error
 */

router.use(authGuard);

router.get("/", getMyOrdersHandler);

router.get("/:id", getOrderByIdHandler);

// These routes change fulfillment state and must never
// be accessible to customers.

router.patch("/set-packed/:id", requireRole("admin"), setPackedStatusToOrder);

router.patch(
  "/set-in-transit/:id",
  requireRole("admin"),
  setInTransitStatusToOrder,
);

router.patch(
  "/set-canceled/:id",
  requireRole("admin"),
  setCanceledStatusToOrder,
);

router.patch(
  "/set-delivery/:id",
  requireRole("admin"),
  setDeliveryStatusToOrder,
);

module.exports = { orderRoutes: router };
