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
//  *     responses:
//  *       '200':
//  *         description: Products retrieved successfully
//  *       '500':
//  *         description: Internal server error
//  */
// router.get("/", getProductHandler);
// router.post("/", createProductValidation, createProductHandler);
// router.get("/:id", getProductByIdHandler);
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
 * /product:
 *   get:
 *     tags:
 *       - Products
 *     summary: Get all products
 *     description: Retrieve the product list.
 *     operationId: getProducts
 *     responses:
 *       '200':
 *         description: Products retrieved successfully
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
 *     summary: Create a product
 *     description: Create a product using validated input.
 *     operationId: createProduct
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *             description: |
 *               Product fields must match
 *               createProductValidation.
 *     responses:
 *       '200':
 *         description: Request processed successfully
 *       '400':
 *         description: Invalid product data
 *       '500':
 *         description: Internal server error
 */
router.post(
  "/",
  createProductValidation,
  createProductHandler
);

/**
 * @openapi
 * /product/{id}:
 *   get:
 *     tags:
 *       - Products
 *     summary: Get product by ID
 *     description: Retrieve a product using its ID.
 *     operationId: getProductById
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product identifier
 *     responses:
 *       '200':
 *         description: Product retrieved successfully
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
 *     description: Delete a product using its ID.
 *     operationId: deleteProductById
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product identifier
 *     responses:
 *       '200':
 *         description: Delete request processed successfully
 *       '404':
 *         description: Product not found
 *       '500':
 *         description: Internal server error
 */
router.delete("/:id", removeProductByIdHandler);

module.exports = { productRoutes: router };
