// const { Router } = require("express");
// const { sendOtp, checkOtp, verifyRefreshToken } = require("./auth.service");
// const authGuard = require("./auth.guard");
// const { logout } = require("./auth.service");

// const { Op } = require("sequelize");

// const { User } = require("../user/user.model");
// const {
//   sendOtpLimiter,
//   checkOtpLimiter,
// } = require("../../middlewares/otpRateLimiter");
// const validateRequest = require("./validateRequest");
// const {
//   mobileSchema,
//   checkOtpSchema,
//   refreshTokenSchema,
//   logoutSchema,
// } = require("./authvalidation");
// const requireRole = require("./requireRole");

// const router = Router();

// router.post(
//   "/send-otp",
//   sendOtpLimiter,
//   validateRequest(mobileSchema),
//   sendOtp,
// );
// router.post(
//   "/check-otp",
//   checkOtpLimiter,
//   validateRequest(checkOtpSchema),
//   checkOtp,
// );
// router.post(
//   "/refresh-token",
//   validateRequest(refreshTokenSchema),
//   verifyRefreshToken,
// );
// router.post("/logout", validateRequest(logoutSchema), logout);

// router.post("/check-login", authGuard, (req, res) => {
//   return res.status(200).json({
//     message: "Authentication successful",
//     user: req.user,
//   });
// });
// router.get("/admin/test", authGuard, requireRole("admin"), (req, res) => {
//   res.status(200).json({
//     message: "Welcome Admin",
//   });
// });

// module.exports = { authRouter: router };

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

/**
 * @openapi
 * /auth/send-otp:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Send OTP
 *     description: Request a one-time verification code for a mobile number.
 *     operationId: sendOtp
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mobile
 *             properties:
 *               mobile:
 *                 type: string
 *                 example: "09123456789"
 *     responses:
 *       '200':
 *         description: OTP request processed successfully
 *       '400':
 *         description: Invalid request
 *       '429':
 *         description: Too many requests
 */
router.post(
  "/send-otp",
  sendOtpLimiter,
  validateRequest(mobileSchema),
  sendOtp,
);

/**
 * @openapi
 * /auth/check-otp:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Verify OTP
 *     description: Verify the OTP and authenticate the user.
 *     operationId: checkOtp
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mobile
 *               - code
 *             properties:
 *               mobile:
 *                 type: string
 *                 example: "09123456789"
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       '200':
 *         description: OTP verified successfully
 *       '400':
 *         description: Invalid OTP or request
 *       '429':
 *         description: Too many verification attempts
 */
router.post(
  "/check-otp",
  checkOtpLimiter,
  validateRequest(checkOtpSchema),
  checkOtp,
);

/**
 * @openapi
 * /auth/refresh-token:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Refresh access token
 *     description: Request new authentication tokens using a refresh token.
 *     operationId: refreshAccessToken
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "your-refresh-token"
 *     responses:
 *       '200':
 *         description: Token refresh successful
 *       '400':
 *         description: Invalid request
 *       '401':
 *         description: Invalid or expired refresh token
 */
router.post(
  "/refresh-token",
  validateRequest(refreshTokenSchema),
  verifyRefreshToken,
);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Logout user
 *     description: Log out the user and invalidate the provided refresh token.
 *     operationId: logoutUser
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "your-refresh-token"
 *     responses:
 *       '200':
 *         description: Logout successful
 *       '400':
 *         description: Invalid request
 *       '401':
 *         description: Invalid refresh token
 */
router.post("/logout", validateRequest(logoutSchema), logout);

/**
 * @openapi
 * /auth/check-login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Check login status
 *     description: Verify that the supplied JWT access token is valid.
 *     operationId: checkLogin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Authentication successful
 *       '401':
 *         description: Unauthorized
 */
router.post("/check-login", authGuard, (req, res) => {
  return res.status(200).json({
    message: "Authentication successful",
    user: req.user,
  });
});

/**
 * @openapi
 * /auth/admin/test:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Test admin access
 *     description: Test an endpoint restricted to authenticated administrators.
 *     operationId: testAdminAccess
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Admin access granted
 *       '401':
 *         description: Unauthorized
 *       '403':
 *         description: Forbidden - admin role required
 */
router.get("/admin/test", authGuard, requireRole("admin"), (req, res) => {
  res.status(200).json({
    message: "Welcome Admin",
  });
});

module.exports = { authRouter: router };
