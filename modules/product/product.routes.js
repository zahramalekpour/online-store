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
router.delete("/:id", removeProductByIdHandler);
module.exports = { productRoutes: router };
