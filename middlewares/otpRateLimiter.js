
const { rateLimit } = require("express-rate-limit");

// Limit OTP generation requests per IP
const sendOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many OTP requests. Try again in 15 minutes.",
  },
});

// Limit OTP verification requests per IP
const checkOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many OTP verification attempts. Try again in 15 minutes.",
  },
});

module.exports = {
  sendOtpLimiter,
  checkOtpLimiter,
};
