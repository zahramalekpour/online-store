const { Router } = require("express");
const { sendOtp, checkOtp, verifyRefreshToken } = require("./auth.service");
const authGuard = require("./auth.guard");
const { logout } = require("./auth.service");

const { Op } = require("sequelize");

const { User } = require("../user/user.model");
const {
  sendOtpLimiter,
  checkOtpLimiter,
} = require("../../middlewares/otpRateLimiter");
const validateRequest = require("./validateRequest");
const {
  mobileSchema,
  checkOtpSchema,
  refreshTokenSchema,
  logoutSchema,
} = require("./authvalidation");
const requireRole = require("./requireRole");

const router = Router();

router.post(
  "/send-otp",
  sendOtpLimiter,
  validateRequest(mobileSchema),
  sendOtp,
);
router.post(
  "/check-otp",
  checkOtpLimiter,
  validateRequest(checkOtpSchema),
  checkOtp,
);
router.post(
  "/refresh-token",
  validateRequest(refreshTokenSchema),
  verifyRefreshToken,
);
router.post("/logout", validateRequest(logoutSchema), logout);

router.post("/check-login", authGuard, (req, res) => {
  return res.status(200).json({
    message: "Authentication successful",
    user: req.user,
  });
});
router.get("/admin/test", authGuard, requireRole("admin"), (req, res) => {
  res.status(200).json({
    message: "Welcome Admin",
  });
});

module.exports = { authRouter: router };
