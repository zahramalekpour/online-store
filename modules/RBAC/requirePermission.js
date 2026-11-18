const createHttpError = require("http-errors");
const { Permission, rolePermission } = require("../RBAC/rback.model");

const requirePermission = (permissionTitle) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw createHttpError(401, "Authentication required");
      }

      const roleId = req.user.roleId;

      if (!roleId) {
        throw createHttpError(403, "User role not found");
      }

      const permission = await Permission.findOne({
        where: {
          title: permissionTitle,
        },
      });

      if (!permission) {
        throw createHttpError(403, "Access denied");
      }

      const assignment = await rolePermission.findOne({
        where: {
          roleId,
          permissionId: permission.id,
        },
      });
      console.log("RBAC DEBUG:", {
        roleId,
        permissionTitle,
        permissionId: permission.id,
        assignment: assignment?.toJSON() ?? null,
      });
      if (!assignment) {
        throw createHttpError(403, "Access denied");
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

module.exports = { requirePermission };
