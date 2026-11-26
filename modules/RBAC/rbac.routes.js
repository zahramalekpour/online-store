// const { Router } = require("express");

// const authGuard = require("../auth/auth.guard");
// const requireRole = require("../auth/requireRole");

// const {
//   createRoleHandler,
//   createPermissionHandler,
//   getRolesHandler,
//   getPermissionsHandler,
//   getRolePermissionsHandler,
//   assignPermissonToRoleHandler,
//   removePermissionFromRoleHandler,
// } = require("./rbac.service");

// const { assignPermissionToRoleValidation } = require("./validation");

// const router = Router();

// router.use(authGuard, requireRole("admin"));

// router.get("/roles", getRolesHandler);

// router.get("/permissions", getPermissionsHandler);

// router.get("/role/:id/permissions", getRolePermissionsHandler);

// router.post("/role", createRoleHandler);

// router.post("/permission", createPermissionHandler);

// router.post(
//   "/add-permission-to-role",
//   assignPermissionToRoleValidation,
//   assignPermissonToRoleHandler,
// );

// // Remove permission from role
// router.delete(
//   "/role/:roleId/permission/:permissionId",
//   removePermissionFromRoleHandler,
// );

// module.exports = { rbacRouter: router };

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

/**
 * @openapi
 * components:
 *   schemas:
 *     RBACRole:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         title:
 *           type: string
 *           example: admin
 *         description:
 *           type: string
 *           nullable: true
 *           example: Administrator role
 *
 *     RBACPermission:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         title:
 *           type: string
 *           example: manage_products
 *         description:
 *           type: string
 *           nullable: true
 *           example: Manage store products
 *
 *     CreateRBACRoleInput:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         title:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           example: manager
 *         description:
 *           type: string
 *           nullable: true
 *           example: Store manager
 *
 *     CreateRBACPermissionInput:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         title:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           example: manage_orders
 *         description:
 *           type: string
 *           nullable: true
 *           example: Manage customer orders
 *
 *     AssignRBACPermissionsInput:
 *       type: object
 *       required:
 *         - roleId
 *         - permissionIds
 *       properties:
 *         roleId:
 *           type: integer
 *           minimum: 1
 *           example: 2
 *         permissionIds:
 *           type: array
 *           minItems: 1
 *           uniqueItems: true
 *           items:
 *             type: integer
 *             minimum: 1
 *           example: [1, 2, 3]
 */

/**
 * @openapi
 * /rbac/roles:
 *   get:
 *     tags:
 *       - RBAC
 *     summary: Get all roles
 *     description: Retrieve roles. Admin access required.
 *     operationId: getAllRoles
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Roles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Roles fetched successfully
 *                 roles:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RBACRole'
 *       '401':
 *         description: Authentication required
 *       '403':
 *         description: Admin access required
 *       '500':
 *         description: Internal server error
 */

/**
 * @openapi
 * /rbac/permissions:
 *   get:
 *     tags:
 *       - RBAC
 *     summary: Get all permissions
 *     description: Retrieve permissions. Admin access required.
 *     operationId: getAllPermissions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Permissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Permissions fetched successfully
 *                 permissions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RBACPermission'
 *       '401':
 *         description: Authentication required
 *       '403':
 *         description: Admin access required
 *       '500':
 *         description: Internal server error
 */

/**
 * @openapi
 * /rbac/role/{id}/permissions:
 *   get:
 *     tags:
 *       - RBAC
 *     summary: Get permissions assigned to a role
 *     operationId: getRolePermissions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Role ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 1
 *     responses:
 *       '200':
 *         description: Role permissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Role permissions fetched successfully
 *                 role:
 *                   $ref: '#/components/schemas/RBACRole'
 *                 permissions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RBACPermission'
 *       '400':
 *         description: Invalid role ID
 *       '401':
 *         description: Authentication required
 *       '403':
 *         description: Admin access required
 *       '404':
 *         description: Role not found
 *       '500':
 *         description: Internal server error
 */

/**
 * @openapi
 * /rbac/role:
 *   post:
 *     tags:
 *       - RBAC
 *     summary: Create a new role
 *     operationId: createRBACRole
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRBACRoleInput'
 *     responses:
 *       '201':
 *         description: Role created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Role created successfully
 *                 role:
 *                   $ref: '#/components/schemas/RBACRole'
 *       '400':
 *         description: Invalid role title
 *       '401':
 *         description: Authentication required
 *       '403':
 *         description: Admin access required
 *       '409':
 *         description: Role already exists
 *       '500':
 *         description: Internal server error
 */

/**
 * @openapi
 * /rbac/permission:
 *   post:
 *     tags:
 *       - RBAC
 *     summary: Create a new permission
 *     operationId: createRBACPermission
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRBACPermissionInput'
 *     responses:
 *       '201':
 *         description: Permission created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Permission created successfully
 *                 permission:
 *                   $ref: '#/components/schemas/RBACPermission'
 *       '400':
 *         description: Invalid permission title
 *       '401':
 *         description: Authentication required
 *       '403':
 *         description: Admin access required
 *       '409':
 *         description: Permission already exists
 *       '500':
 *         description: Internal server error
 */

/**
 * @openapi
 * /rbac/add-permission-to-role:
 *   post:
 *     tags:
 *       - RBAC
 *     summary: Assign permissions to a role
 *     description: >
 *       Assign existing permissions to an existing role.
 *       Already assigned permissions are skipped.
 *       Permission IDs must be unique positive integers.
 *     operationId: assignPermissionsToRole
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssignRBACPermissionsInput'
 *     responses:
 *       '200':
 *         description: Permissions assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Permissions assigned to role successfully
 *                 roleId:
 *                   type: integer
 *                   example: 2
 *                 addedCount:
 *                   type: integer
 *                   example: 2
 *       '400':
 *         description: Invalid role ID or permission IDs
 *       '401':
 *         description: Authentication required
 *       '403':
 *         description: Admin access required
 *       '404':
 *         description: Role not found
 *       '500':
 *         description: Internal server error
 */

/**
 * @openapi
 * /rbac/role/{roleId}/permission/{permissionId}:
 *   delete:
 *     tags:
 *       - RBAC
 *     summary: Remove permission from role
 *     operationId: removePermissionFromRole
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: roleId
 *         in: path
 *         required: true
 *         description: Role ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 2
 *       - name: permissionId
 *         in: path
 *         required: true
 *         description: Permission ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 3
 *     responses:
 *       '200':
 *         description: Permission removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Permission removed from role successfully
 *                 roleId:
 *                   type: integer
 *                   example: 2
 *                 permissionId:
 *                   type: integer
 *                   example: 3
 *       '400':
 *         description: Invalid role ID or permission ID
 *       '401':
 *         description: Authentication required
 *       '403':
 *         description: Admin access required
 *       '404':
 *         description: Role, permission or assignment not found
 *       '500':
 *         description: Internal server error
 */

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
