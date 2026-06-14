const createHttpError = require("http-errors");
const { User, Otp } = require("../user/user.model");
const { config } = require("dotenv");
const jwt = require("jsonwebtoken");
const { where } = require("sequelize");
const RefreshToken = require("../user/refresh.model");
config();

async function sendOtp(req, res, next) {
  try {
    const { mobile } = req.body;
    let code = Math.floor(Math.random() * 99999 - 10000) + 1000;
    let user = User.findOne({ where: { mobile } });
    let otp = null;
    if (!user) {
      await User.create({
        mobile,
      });
      otp = await Otp.create({
        code,
        expires_in: new Date(Date.now()) + 1000 * 60,
      });
      return res.json({
        message: "send otp successfully",
        code,
        userId: user.id,
      });
    } else if (!otp && user) {
      otp = await Otp.findOne({ where: { userId: user?.id } });
      otp.code = code;
      otp.expires_in = new Date(Date.now() + 1000 * 60);
      otp.save();

      return res.json({
        message: "send otp successfully",
        code,
        userId: user.id,
      });
    }
  } catch (error) {
    next(error);
  }
}

async function checkOtp(req, res, next) {
  try {
    const { mobile, code } = req.body;
    let user = User.findOne({
      where: { mobile },
      include: [{ model: otp, as: "otp" }],
    });
    if (!user) {
      throw createHttpError(401, "not found user account");
    }
    if (user?.otp?.code !== code) {
      throw createHttpError(401, "not found user account");
    }
    if (user?.otp?.expires_in < new Date()) {
      throw createHttpError(401, "code is expired");
    }
    const { accessToken, refreshToken } = generateToken.sign({
      userId: user?.id,
    });
    return res.json({
      message: "logged in successfully",
      refreshToken,
      accessToken,
    });
  } catch (error) {
    next(error);
  }
}

async function verifyRefreshToken(req, res, next) {
  const { refreshToken:token } = req.body;
  if (!token) throw createHttpError(401, "log in on your account");
  const verified = jwt.verify(token, process.env.REFRESH_WEB_TOKEN);
  if (verified?.userId) {
    const user = await User.findByPk(verified?.userId);
    if (!user) throw createHttpError(401, "log in on your account");
    const existToken = await RefreshToken.findOne({
      where: { token },
    });
    if (existToken) throw createHttpError(401, "token is expired");
    await RefreshToken.create({
      token,
      userId: user.id
    });
    const { refreshToken, accessToken } = generateToken({ userId: user.id });
    return res,json({
      refreshToken,
      accessToken,
    });
  }
}

async function generateToken(payload) {
  const { ACCESS_WEB_TOKEN, REFRESH_WEB_TOKEN } = process.env;
  const accessToken = jwt.sign(payload, ACCESS_WEB_TOKEN, {
    expires_in: "7d",
  });

  const refreshToken = jwt.sign(payload, REFRESH_WEB_TOKEN, {
    expires_in: "30d",
  });
  return { accessToken, refreshToken };
}

module.exports = { sendOtp, checkOtp, generateToken, verifyRefreshToken };