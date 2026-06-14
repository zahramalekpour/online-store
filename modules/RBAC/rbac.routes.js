const { Router } = require("express");
const authGuard = require("../auth/auth.guard");
const { createRoleHandler, createPermissionHandler } = require("./rbac.service");
const { assignPermissionToRoleValidation } = require("./validation");

const router = Router();
router.post("/role", authGuard, createRoleHandler);
router.post("/permission", authGuard, createPermissionHandler);
router.post("/add-permission-to-role", authGuard, assignPermissionToRoleValidation,assignPermissionToRoleValidation);

module.exports = {rbacRouter: router}