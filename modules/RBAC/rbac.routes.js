

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

const {
  assignPermissionToRoleValidation,
} = require("./validation");

const router = Router();

// Protect all RBAC routes
router.use(authGuard, requireRole("admin"));

// Get all roles
router.get("/roles", getRolesHandler);

// Get all permissions
router.get("/permissions", getPermissionsHandler);

// Get permissions of a specific role
router.get("/role/:id/permissions", getRolePermissionsHandler);

// Create role
router.post("/role", createRoleHandler);

// Create permission
router.post("/permission", createPermissionHandler);

// Assign permissions to role
router.post(
  "/add-permission-to-role",
  assignPermissionToRoleValidation,
  assignPermissonToRoleHandler
);

// Remove permission from role
router.delete(
  "/role/:roleId/permission/:permissionId",
  removePermissionFromRoleHandler
);

module.exports = { rbacRouter: router };
