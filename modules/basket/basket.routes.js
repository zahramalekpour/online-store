const { Router } = require("express");
const authGuard = require("../auth/auth.guard");
const {
  addToBasketHandler, updateBasketHandler, removeFromBasketHandler, getBasketHandler,
} = require("./basket.service");
const router = Router();
router.use(authGuard);
router.get("/", getBasketHandler);
router.post("/add", addToBasketHandler);
router.patch("/:id", updateBasketHandler);
router.delete("/:id", removeFromBasketHandler);
module.exports = { basketRoutes: router };
