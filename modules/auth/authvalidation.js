const { z } = require("zod");

const mobileSchema = z.object({
  mobile: z.string().regex(/^09\d{9}$/, {
    message: "Invalid mobile number",
  }),
});

const checkOtpSchema = z.object({
  mobile: z.string().regex(/^09\d{9}$/, {
    message: "Invalid mobile number",
  }),
  code: z.string().regex(/^\d{6}$/, {
    message: "OTP must be 6 digits",
  }),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1, {
    message: "Refresh token is required",
  }),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string({
    error: "Refresh token is required",
  }).min(1, {
    message: "Refresh token is required",
  }),
});

module.exports = {
  mobileSchema,
  checkOtpSchema,
  refreshTokenSchema,
  logoutSchema,
};
