const createHttpError = require("http-errors");
const { User, Otp } = require("../user/user.model");
const sequelize = require("../../config/sequelize.config");
const { config } = require("dotenv");
const { randomUUID } = require("node:crypto");
const jwt = require("jsonwebtoken");
const { Role } = require("../RBAC/rback.model");
const { where } = require("sequelize");
const { randomInt } = require("node:crypto");
const { RefreshToken } = require("../user/refresh.model");
const { createHash } = require("node:crypto");
const { Op, UniqueConstraintError } = require("sequelize");
config();

async function sendOtp(req, res, next) {
  let transaction;

  try {
    const { mobile } = req.body || {};

    if (typeof mobile !== "string" || !/^09\d{9}$/.test(mobile)) {
      return res.status(400).json({
        message: "Invalid mobile number",
      });
    }

    // Find or create user

    const defaultRole = await Role.findOne({
      where: { title: "user" },
    });

    if (!defaultRole) {
      throw createHttpError(500, "Default user role is not configured");
    }

    const [user, created] = await User.findOrCreate({
      where: { mobile },
      defaults: {
        mobile,
        roleId: defaultRole.id,
      },
    });

    if (!created && user.roleId == null) {
      await user.update({
        roleId: defaultRole.id,
      });
    }

    transaction = await sequelize.transaction();

    const now = new Date();
    const cooldownTime = new Date(now.getTime() - 1000);

    // Atomic cooldown
    const [updatedCount] = await User.update(
      { lastOtpSentAt: now },
      {
        where: {
          id: user.id,
          [Op.or]: [
            { lastOtpSentAt: null },
            { lastOtpSentAt: { [Op.lte]: cooldownTime } },
          ],
        },
        transaction,
      },
    );

    if (updatedCount === 0) {
      await transaction.rollback();
      transaction = null;

      return res.status(429).json({
        message: "Please wait 60 seconds before requesting another OTP",
      });
    }

    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(now.getTime() + 60000);

    // Find the latest OTP row for this user
    const otp = await Otp.findOne({
      where: { userId: user.id },
      order: [["id", "DESC"]],
      transaction,
    });

    if (otp) {
      await otp.update(
        {
          code,
          expires_in: expiresAt,
          attempts: 0,
        },
        { transaction },
      );
    } else {
      await Otp.create(
        {
          userId: user.id,
          code,
          expires_in: expiresAt,
          attempts: 0,
        },
        { transaction },
      );
    }

    await transaction.commit();
    transaction = null;

    return res.status(200).json({
      message: "OTP generated successfully",
      userId: user.id,
      ...(process.env.NODE_ENV === "development" ? { code } : {}),
    });
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }
    }

    return next(error);
  }
}

async function checkOtp(req, res, next) {
  let transaction;

  try {
    const { mobile, code } = req.body || {};

    if (
      typeof mobile !== "string" ||
      !/^09\d{9}$/.test(mobile) ||
      !/^\d{6}$/.test(String(code))
    ) {
      return res.status(400).json({
        message: "Invalid mobile or OTP",
      });
    }

    const user = await User.findOne({
      where: { mobile },
    });

    if (!user) {
      throw createHttpError(401, "Invalid OTP");
    }

    transaction = await sequelize.transaction();

    // Read OTP directly instead of using user.otp
    const otp = await Otp.findOne({
      where: { userId: user.id },
      order: [["id", "DESC"]],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!otp) {
      throw createHttpError(401, "Invalid OTP");
    }

    if (new Date(otp.expires_in).getTime() <= Date.now()) {
      throw createHttpError(401, "OTP expired");
    }

    if (otp.attempts >= 5) {
      throw createHttpError(429, "Too many OTP attempts");
    }

    if (String(otp.code) !== String(code)) {
      otp.attempts += 1;
      await otp.save({ transaction });

      await transaction.commit();
      transaction = null;

      return res.status(otp.attempts >= 5 ? 429 : 401).json({
        message: otp.attempts >= 5 ? "Too many OTP attempts" : "Invalid OTP",
      });
    }

    // Successful verification
    await otp.destroy({ transaction });

    await transaction.commit();
    transaction = null;

    const tokens = generateToken({ userId: user.id });

    return res.status(200).json({
      message: "Logged in successfully",
      ...tokens,
    });
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }
    }

    return next(error);
  }
}

async function verifyRefreshToken(req, res, next) {
  try {
    const { refreshToken: token } = req.body ?? {};

    if (!token || typeof token !== "string") {
      throw createHttpError(401, "Refresh token is required");
    }

    let verified;

    try {
      verified = jwt.verify(token, process.env.REFRESH_WEB_TOKEN, {
        algorithms: ["HS256"],
      });
    } catch (error) {
      throw createHttpError(401, "Invalid or expired refresh token");
    }

    if (verified.type !== "refresh") {
      throw createHttpError(401, "Invalid refresh token type");
    }

    if (!verified.userId) {
      throw createHttpError(401, "Invalid token payload");
    }

    const user = await User.findByPk(verified.userId);

    if (!user) {
      throw createHttpError(401, "User not found");
    }

    const tokenHash = hashToken(token);

    try {
      await RefreshToken.create({
        token: tokenHash,
        userId: user.id,
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw createHttpError(401, "Refresh token already used");
      }
      throw error;
    }

    const { refreshToken, accessToken } = generateToken({
      userId: user.id,
    });

    return res.status(200).json({
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
}

function generateToken(payload) {
  const { ACCESS_WEB_TOKEN, REFRESH_WEB_TOKEN } = process.env;

  if (!ACCESS_WEB_TOKEN || !REFRESH_WEB_TOKEN) {
    throw new Error("JWT secrets are not configured");
  }

  const accessToken = jwt.sign(
    {
      ...payload,
      type: "access",
    },
    ACCESS_WEB_TOKEN,
    {
      expiresIn: "15m",
      algorithm: "HS256",
    },
  );
  const refreshToken = jwt.sign(
    {
      ...payload,
      type: "refresh",
      jti: randomUUID(),
    },
    REFRESH_WEB_TOKEN,
    {
      expiresIn: "7d",
      algorithm: "HS256",
    },
  );
  return { accessToken, refreshToken };
}
function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body || {};

    if (!refreshToken || typeof refreshToken !== "string") {
      throw createHttpError(400, "Refresh token is required");
    }

    let payload;

    try {
      payload = jwt.verify(refreshToken, process.env.REFRESH_WEB_TOKEN, {
        algorithms: ["HS256"],
      });
    } catch (error) {
      throw createHttpError(401, "Invalid or expired refresh token");
    }

    if (payload.type !== "refresh" || !payload.userId || !payload.jti) {
      throw createHttpError(401, "Invalid refresh token");
    }

    const tokenHash = createHash("sha256").update(refreshToken).digest("hex");

    try {
      await RefreshToken.create({
        token: tokenHash,
        userId: payload.userId,
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw createHttpError(401, "Refresh token already revoked");
      }

      throw error;
    }

    return res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  sendOtp,
  checkOtp,
  generateToken,
  verifyRefreshToken,
  logout,
};
