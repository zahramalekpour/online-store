
const createHttpError = require("http-errors");

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createHttpError(401, "Authentication required"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(createHttpError(403, "Access denied"));
    }

    next();
  };
};

module.exports = requireRole;
