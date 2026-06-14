const { Router } = require("express");
const authGuard = require("../auth/auth.guard");
const { paymentBasketHandler } = require("./payment.service");

const router = Router()
router.post("/", authGuard, paymentBasketHandler);
module.exports = {
    paymentRoutes : router
}