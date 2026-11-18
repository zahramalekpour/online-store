const { Router } = require("express");
const authGuard = require("../auth/auth.guard");
const {
  paymentBasketHandler,
  paymentVerifyHandler,
} = require("./payment.service");
const router = Router();
router.post("/", authGuard, paymentBasketHandler);
router.get("/callback", paymentVerifyHandler);
router.get("/verify", paymentVerifyHandler);
module.exports = { paymentRoutes: router };
