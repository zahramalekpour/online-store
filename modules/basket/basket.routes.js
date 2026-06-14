const { Router } = require("express");
const authGuard = require("../auth/auth.guard");
const { addToBasketHandler } = require("./basket.service");

const router = Router();
router.post("/add", authGuard, addToBasketHandler);
module.exports = {basketRoutes : router}