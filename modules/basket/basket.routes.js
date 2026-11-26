const { Router } = require("express");
const authGuard = require("../auth/auth.guard");

const {
  addToBasketHandler,
  updateBasketHandler,
  removeFromBasketHandler,
  getBasketHandler,
} = require("./basket.service");

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     BasketItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         productId:
 *           type: integer
 *           example: 12
 *         title:
 *           type: string
 *           example: Cotton T-Shirt
 *         colorId:
 *           type: integer
 *           nullable: true
 *         sizeId:
 *           type: integer
 *           nullable: true
 *         count:
 *           type: integer
 *           example: 2
 *         availableStock:
 *           type: integer
 *           example: 10
 *         unitPrice:
 *           type: number
 *           example: 150000
 *         discountPercent:
 *           type: number
 *           example: 10
 *         subtotal:
 *           type: number
 *           example: 300000
 *         discountAmount:
 *           type: number
 *           example: 30000
 *         finalAmount:
 *           type: number
 *           example: 270000
 *
 *     AddToBasketInput:
 *       type: object
 *       required:
 *         - productId
 *       properties:
 *         productId:
 *           type: integer
 *           minimum: 1
 *           example: 12
 *         count:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *           example: 2
 *         colorId:
 *           type: integer
 *           minimum: 1
 *           nullable: true
 *           description: Required for coloring products.
 *         sizeId:
 *           type: integer
 *           minimum: 1
 *           nullable: true
 *           description: Required for sizing products.
 *
 *     UpdateBasketInput:
 *       type: object
 *       required:
 *         - count
 *       properties:
 *         count:
 *           type: integer
 *           minimum: 1
 *           example: 3
 *
 *     BasketMutationResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         basketItem:
 *           type: object
 *           description: Updated or created basket database record.
 */

/**
 * @openapi
 * /basket:
 *   get:
 *     tags:
 *       - Basket
 *     summary: Get current user's basket
 *     description: >
 *       Retrieve basket items, prices, discounts,
 *       and the final payable amount.
 *     operationId: getBasket
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Basket retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BasketItem'
 *                 totalAmount:
 *                   type: number
 *                   example: 300000
 *                 totalDiscount:
 *                   type: number
 *                   example: 30000
 *                 finalAmount:
 *                   type: number
 *                   example: 270000
 *       '401':
 *         description: Authentication required
 *       '409':
 *         description: Invalid or missing basket data
 *       '500':
 *         description: Internal server error
 */

/**
 * @openapi
 * /basket/add:
 *   post:
 *     tags:
 *       - Basket
 *     summary: Add product to basket
 *     description: >
 *       Add a product to the authenticated user's basket.
 *       If the same product variant is already present,
 *       its quantity is increased.
 *       Coloring products require colorId.
 *       Sizing products require sizeId.
 *       Single products must not include either variant ID.
 *     operationId: addToBasket
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddToBasketInput'
 *           examples:
 *             singleProduct:
 *               summary: Single product
 *               value:
 *                 productId: 12
 *                 count: 2
 *             coloringProduct:
 *               summary: Product with color
 *               value:
 *                 productId: 12
 *                 colorId: 3
 *                 count: 1
 *             sizingProduct:
 *               summary: Product with size
 *               value:
 *                 productId: 12
 *                 sizeId: 4
 *                 count: 1
 *     responses:
 *       '200':
 *         description: Product added to basket
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BasketMutationResponse'
 *       '400':
 *         description: Invalid product or variant input
 *       '401':
 *         description: Authentication required
 *       '404':
 *         description: Product or variant not found
 *       '409':
 *         description: Insufficient stock
 *       '500':
 *         description: Internal server error
 */

/**
 * @openapi
 * /basket/{id}:
 *   patch:
 *     tags:
 *       - Basket
 *     summary: Update basket item quantity
 *     description: >
 *       Set the quantity of an existing basket item
 *       belonging to the authenticated user.
 *     operationId: updateBasket
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Basket item ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateBasketInput'
 *     responses:
 *       '200':
 *         description: Basket quantity updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BasketMutationResponse'
 *       '400':
 *         description: Invalid basket item ID or quantity
 *       '401':
 *         description: Authentication required
 *       '404':
 *         description: Basket item or product variant not found
 *       '409':
 *         description: Insufficient stock
 *       '500':
 *         description: Internal server error
 */

/**
 * @openapi
 * /basket/{id}:
 *   delete:
 *     tags:
 *       - Basket
 *     summary: Remove item from basket
 *     description: >
 *       Remove an item belonging to the authenticated user.
 *     operationId: removeFromBasket
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Basket item ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 1
 *     responses:
 *       '200':
 *         description: Basket item removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Basket item removed
 *       '400':
 *         description: Invalid basket item ID
 *       '401':
 *         description: Authentication required
 *       '404':
 *         description: Basket item not found
 *       '500':
 *         description: Internal server error
 */

router.use(authGuard);

router.get("/", getBasketHandler);

router.post("/add", addToBasketHandler);

router.patch("/:id", updateBasketHandler);

router.delete("/:id", removeFromBasketHandler);

module.exports = { basketRoutes: router };
