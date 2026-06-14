const createHttpError = require("http-errors");
const { User } = require("../user/user.model");
const jwt = require("jsonwebtoken");

async function authGuard(req, res, next) {
  try {
    const authorization = req?.headers?.authorization ?? undefined;
    if (!authorization) throw createHttpError(401, "log in on your account");
    const [bearer, token] = authorization.split(" ");
    if (!bearer || bearer.toLowerCase() !== "bearer") {
      throw createHttpError(401, "token is invalid");
    }
    const verified = jwt.verify(token, process.env.REFRESH_WEB_TOKEN);
    if (verified?.userId) {
      const user = await User.findByPk(verified?.userId);
      if (!user) throw createHttpError(401, "log in on your account");
      return (
        res,
        json({
          id: user.id,
          mobile: user?.mobile,
          fullname: user?.fullname,
        })
      );
      return next();
    }
    throw createHttpError(401, "log in on your account");
  } catch (error) {
    next(error);
  }
}

module.exports = authGuard;
