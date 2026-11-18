const createHttpError = require("http-errors");
const { User } = require("../user/user.model");
const { Role } = require("../RBAC/rback.model");
const jwt = require("jsonwebtoken");

async function authGuard(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      throw createHttpError(401, "Authorization header is required");
    }

    const parts = authorization.trim().split(/\s+/);

    if (
      parts.length !== 2 ||
      parts[0].toLowerCase() !== "bearer" ||
      !parts[1]
    ) {
      throw createHttpError(401, "Invalid authorization format");
    }

    if (!process.env.ACCESS_WEB_TOKEN) {
      throw new Error("Access token secret is not configured");
    }

    let verified;

    try {
      verified = jwt.verify(parts[1], process.env.ACCESS_WEB_TOKEN, {
        algorithms: ["HS256"],
      });
    } catch (error) {
      throw createHttpError(401, "Invalid or expired access token");
    }

    if (!verified || verified.type !== "access" || !verified.userId) {
      throw createHttpError(401, "Invalid access token");
    }

    const user = await User.findByPk(verified.userId);

    if (!user) {
      throw createHttpError(401, "User not found");
    }

    const role = await Role.findByPk(user.roleId);

    if (!role) {
      throw createHttpError(403, "User role not found");
    }

    req.user = {
      id: user.id,
      mobile: user.mobile,
      fullname: user.fullname,
      role: role.title,
      roleId: role.id,
    };
    console.log("AUTH GUARD USER:", req.user);
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = authGuard;
