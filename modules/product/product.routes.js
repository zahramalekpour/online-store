const { Router } = require("express");
const { createProductValidation } = require("./validation");
const {
  createProductHandler,
  getProductHandler,
  getProductByIdHandler,
  removeProductByIdHandler,
} = require("./product.service");
const router = Router();
router.post("/", createProductValidation, createProductHandler);
router.get("/", getProductHandler);
router.get("/:id", getProductByIdHandler);
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
router.get("/", getProductHandler);
router.delete("/:id", removeProductByIdHandler);
module.exports = { productRoutes: router };
