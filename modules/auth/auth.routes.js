const { Router } = require("express");
const { sendOtp, checkOtp, verifyRefreshToken } = require("./auth.service");
const authGuard = require("./auth.guard");

const router = Router();

router.post("/send-otp", sendOtp);
router.post("/check-otp", checkOtp);
router.post("/refresh-token", verifyRefreshToken);
router.post("/check-login", authGuard, (req, res) => {
  res.json(req.user ?? {});
});

module.exports = { authRouter: router };
