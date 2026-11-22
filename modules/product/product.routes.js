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
 *     responses:
 *       '200':
 *         description: Products retrieved successfully
 *       '500':
 *         description: Internal server error
 */
router.get("/", getProductHandler);
router.post("/", createProductValidation, createProductHandler);
router.get("/:id", getProductByIdHandler);
router.delete("/:id", removeProductByIdHandler);
module.exports = { productRoutes: router };
