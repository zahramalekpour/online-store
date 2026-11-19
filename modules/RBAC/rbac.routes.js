const { Router } = require("express");

const authGuard = require("../auth/auth.guard");
const requireRole = require("../auth/requireRole");

const {
  createRoleHandler,
  createPermissionHandler,
  getRolesHandler,
  getPermissionsHandler,
  getRolePermissionsHandler,
  assignPermissonToRoleHandler,
  removePermissionFromRoleHandler,
} = require("./rbac.service");

const { assignPermissionToRoleValidation } = require("./validation");

const router = Router();

router.use(authGuard, requireRole("admin"));

router.get("/roles", getRolesHandler);

router.get("/permissions", getPermissionsHandler);

router.get("/role/:id/permissions", getRolePermissionsHandler);

router.post("/role", createRoleHandler);

router.post("/permission", createPermissionHandler);

router.post(
  "/add-permission-to-role",
  assignPermissionToRoleValidation,
  assignPermissonToRoleHandler,
);

// Remove permission from role
router.delete(
  "/role/:roleId/permission/:permissionId",
  removePermissionFromRoleHandler,
);

module.exports = { rbacRouter: router };
