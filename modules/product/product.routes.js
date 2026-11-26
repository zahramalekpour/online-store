// // const { Router } = require("express");
// // const { createProductValidation } = require("./validation");
// // const {
// //   createProductHandler,
// //   getProductHandler,
// //   getProductByIdHandler,
// //   removeProductByIdHandler,
// // } = require("./product.service");
// // const router = Router();
// // /**
// //  * @openapi
// //  * /product:
// //  *   get:
// //  *     tags:
// //  *       - Products
// //  *     summary: Get all products
// //  *     description: Retrieve the product list.
// //  *     responses:
// //  *       '200':
// //  *         description: Products retrieved successfully
// //  *       '500':
// //  *         description: Internal server error
// //  */
// // router.get("/", getProductHandler);
// // router.post("/", createProductValidation, createProductHandler);
// // router.get("/:id", getProductByIdHandler);
// // router.delete("/:id", removeProductByIdHandler);
// // module.exports = { productRoutes: router };

// const { Router } = require("express");
// const { createProductValidation } = require("./validation");
// const {
//   createProductHandler,
//   getProductHandler,
//   getProductByIdHandler,
//   removeProductByIdHandler,
// } = require("./product.service");

// const router = Router();

// /**
//  * @openapi
//  * /product:
//  *   get:
//  *     tags:
//  *       - Products
//  *     summary: Get all products
//  *     description: Retrieve the product list.
//  *     operationId: getProducts
//  *     responses:
//  *       '200':
//  *         description: Products retrieved successfully
//  *       '500':
//  *         description: Internal server error
//  */
// router.get("/", getProductHandler);

// /**
//  * @openapi
//  * /product:
//  *   post:
//  *     tags:
//  *       - Products
//  *     summary: Create a product
//  *     description: Create a product using validated input.
//  *     operationId: createProduct
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             additionalProperties: true
//  *             description: |
//  *               Product fields must match
//  *               createProductValidation.
//  *     responses:
//  *       '200':
//  *         description: Request processed successfully
//  *       '400':
//  *         description: Invalid product data
//  *       '500':
//  *         description: Internal server error
//  */
// router.post(
//   "/",
//   createProductValidation,
//   createProductHandler
// );

// /**
//  * @openapi
//  * /product/{id}:
//  *   get:
//  *     tags:
//  *       - Products
//  *     summary: Get product by ID
//  *     description: Retrieve a product using its ID.
//  *     operationId: getProductById
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Product identifier
//  *     responses:
//  *       '200':
//  *         description: Product retrieved successfully
//  *       '404':
//  *         description: Product not found
//  *       '500':
//  *         description: Internal server error
//  */
// router.get("/:id", getProductByIdHandler);

// /**
//  * @openapi
//  * /product/{id}:
//  *   delete:
//  *     tags:
//  *       - Products
//  *     summary: Delete product by ID
//  *     description: Delete a product using its ID.
//  *     operationId: deleteProductById
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Product identifier
//  *     responses:
//  *       '200':
//  *         description: Delete request processed successfully
//  *       '404':
//  *         description: Product not found
//  *       '500':
//  *         description: Internal server error
//  */
// router.delete("/:id", removeProductByIdHandler);

// module.exports = { productRoutes: router };

const { Router } = require("express");
const { createProductValidation } = require("./validation");

const {
  createProductHandler,
  getProductHandler,
  getProductByIdHandler,
  removeProductByIdHandler,
} = require("./product.service");

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     ProductDetailInput:
 *       type: object
 *       required:
 *         - key
 *         - value
 *       properties:
 *         key:
 *           type: string
 *           example: material
 *         value:
 *           type: string
 *           example: cotton
 *
 *     ProductColorInput:
 *       type: object
 *       required:
 *         - name
 *         - code
 *         - type
 *       properties:
 *         name:
 *           type: string
 *           example: Black
 *         code:
 *           type: string
 *           example: "#000000"
 *         type:
 *           type: string
 *           enum: [single, sizing, coloring]
 *           example: coloring
 *         price:
 *           type: number
 *           nullable: true
 *           example: 150000
 *         discount:
 *           type: number
 *           nullable: true
 *           example: 0
 *         active_discount:
 *           type: boolean
 *           nullable: true
 *           example: false
 *         count:
 *           type: number
 *           nullable: true
 *           example: 10
 *
 *     ProductSizeInput:
 *       type: object
 *       required:
 *         - size
 *         - type
 *       properties:
 *         size:
 *           type: string
 *           example: XL
 *         type:
 *           type: string
 *           enum: [single, sizing, coloring]
 *           example: sizing
 *         price:
 *           type: number
 *           nullable: true
 *           example: 150000
 *         discount:
 *           type: number
 *           nullable: true
 *           example: 0
 *         active_discount:
 *           type: boolean
 *           nullable: true
 *           example: false
 *         count:
 *           type: number
 *           nullable: true
 *           example: 10
 *
 *     CreateProductInput:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - type
 *         - details
 *         - colors
 *         - sizes
 *       properties:
 *         title:
 *           type: string
 *           example: Sample T-Shirt
 *         description:
 *           type: string
 *           example: Cotton T-shirt
 *         type:
 *           type: string
 *           enum: [single, sizing, coloring]
 *           example: sizing
 *         price:
 *           type: number
 *           nullable: true
 *           example: 150000
 *         discount:
 *           type: number
 *           nullable: true
 *           example: 0
 *         active_discount:
 *           type: boolean
 *           nullable: true
 *           example: false
 *         count:
 *           type: number
 *           nullable: true
 *           example: 10
 *         details:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductDetailInput'
 *         colors:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductColorInput'
 *         sizes:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductSizeInput'
 */

/**
 * @openapi
 * /product:
 *   get:
 *     tags:
 *       - Products
 *     summary: Get all products
 *     operationId: getProducts
 *     responses:
 *       '200':
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     type: object
 *       '500':
 *         description: Internal server error
 */
router.get("/", getProductHandler);

/**
 * @openapi
 * /product:
 *   post:
 *     tags:
 *       - Products
 *     summary: Create a new product
 *     operationId: createProduct
 *     description: Create a product with optional details, colors and sizes.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProductInput'
 *     responses:
 *       '201':
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Product created successfully
 *                 productId:
 *                   type: integer
 *                   example: 1
 *       '400':
 *         description: Invalid product data
 *       '500':
 *         description: Internal server error
 */
router.post("/", createProductValidation, createProductHandler);

/**
 * @openapi
 * /product/{id}:
 *   get:
 *     tags:
 *       - Products
 *     summary: Get product by ID
 *     operationId: getProductById
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       '200':
 *         description: Product retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 product:
 *                   type: object
 *       '404':
 *         description: Product not found
 *       '500':
 *         description: Internal server error
 */
router.get("/:id", getProductByIdHandler);

/**
 * @openapi
 * /product/{id}:
 *   delete:
 *     tags:
 *       - Products
 *     summary: Delete product by ID
 *     operationId: deleteProductById
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       '200':
 *         description: Product deleted successfully
 *       '404':
 *         description: Product not found
 *       '500':
 *         description: Internal server error
 */
router.delete("/:id", removeProductByIdHandler);

module.exports = { productRoutes: router };

