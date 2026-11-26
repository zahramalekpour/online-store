jest.mock("../../modules/RBAC/rback.model", () => ({
  Role: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
  Permission: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  rolePermission: {
    findAll: jest.fn(),
    bulkCreate: jest.fn(),
    destroy: jest.fn(),
  },
}));

const { Op } = require("sequelize");

const {
  Role,
  Permission,
  rolePermission,
} = require("../../modules/RBAC/rback.model");

const {
  createRoleHandler,
  createPermissionHandler,
  getRolesHandler,
  getPermissionsHandler,
  getRolePermissionsHandler,
  assignPermissonToRoleHandler,
  removePermissionFromRoleHandler,
} = require("../../modules/RBAC/rbac.service");

describe("RBAC Service Tests", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.resetAllMocks();

    req = {
      body: {},
      params: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();

    Role.findOne.mockResolvedValue(null);
    Role.findByPk.mockResolvedValue({
      id: 1,
      title: "admin",
    });
    Role.findAll.mockResolvedValue([]);
    Role.create.mockImplementation(async (data) => ({
      id: 1,
      ...data,
    }));

    Permission.findOne.mockResolvedValue(null);
    Permission.findByPk.mockResolvedValue({
      id: 2,
      title: "users.read",
    });
    Permission.findAll.mockResolvedValue([]);
    Permission.count.mockResolvedValue(2);
    Permission.create.mockImplementation(async (data) => ({
      id: 2,
      ...data,
    }));

    rolePermission.findAll.mockResolvedValue([]);
    rolePermission.bulkCreate.mockResolvedValue([]);
    rolePermission.destroy.mockResolvedValue(1);
  });

  function expectError(status) {
    expect(next).toHaveBeenCalledTimes(1);

    const error = next.mock.calls[0][0];

    expect(error).toBeInstanceOf(Error);
    expect(error.status || error.statusCode).toBe(status);
  }

  describe("Create Role", () => {
    test("creates role and trims title", async () => {
      req.body = {
        title: "  manager  ",
        description: "Store manager",
      };

      await createRoleHandler(req, res, next);

      expect(Role.findOne).toHaveBeenCalledWith({
        where: { title: "manager" },
      });

      expect(Role.create).toHaveBeenCalledWith({
        title: "manager",
        description: "Store manager",
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Role created successfully",
        role: {
          id: 1,
          title: "manager",
          description: "Store manager",
        },
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("rejects invalid role title", async () => {
      req.body = { title: "   " };

      await createRoleHandler(req, res, next);

      expectError(400);
      expect(Role.create).not.toHaveBeenCalled();
    });

    test("rejects duplicate role", async () => {
      req.body = { title: "admin" };

      Role.findOne.mockResolvedValue({
        id: 1,
        title: "admin",
      });

      await createRoleHandler(req, res, next);

      expectError(409);
      expect(Role.create).not.toHaveBeenCalled();
    });
  });

  describe("Create Permission", () => {
    test("creates permission successfully", async () => {
      req.body = {
        title: "  users.read  ",
        description: "Read users",
      };

      await createPermissionHandler(req, res, next);

      expect(Permission.create).toHaveBeenCalledWith({
        title: "users.read",
        description: "Read users",
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Permission created successfully",
        permission: {
          id: 2,
          title: "users.read",
          description: "Read users",
        },
      });
      expect(next).not.toHaveBeenCalled();
    });

    test("rejects empty permission title", async () => {
      req.body = { title: "" };

      await createPermissionHandler(req, res, next);

      expectError(400);
      expect(Permission.create).not.toHaveBeenCalled();
    });

    test("rejects duplicate permission", async () => {
      req.body = { title: "users.read" };

      Permission.findOne.mockResolvedValue({
        id: 2,
        title: "users.read",
      });

      await createPermissionHandler(req, res, next);

      expectError(409);
      expect(Permission.create).not.toHaveBeenCalled();
    });
  });

  describe("Get Roles and Permissions", () => {
    test("returns all roles", async () => {
      const roles = [
        { id: 1, title: "admin" },
        { id: 2, title: "user" },
      ];

      Role.findAll.mockResolvedValue(roles);

      await getRolesHandler(req, res, next);

      expect(Role.findAll).toHaveBeenCalledWith({
        attributes: ["id", "title", "description"],
        order: [["id", "ASC"]],
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Roles fetched successfully",
        roles,
      });
    });

    test("returns all permissions", async () => {
      const permissions = [
        { id: 1, title: "users.read" },
        { id: 2, title: "users.update" },
      ];

      Permission.findAll.mockResolvedValue(permissions);

      await getPermissionsHandler(req, res, next);

      expect(Permission.findAll).toHaveBeenCalledWith({
        attributes: ["id", "title", "description"],
        order: [["id", "ASC"]],
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Permissions fetched successfully",
        permissions,
      });
    });
  });

  describe("Get Role Permissions", () => {
    test("rejects invalid role ID", async () => {
      req.params.id = "invalid";

      await getRolePermissionsHandler(req, res, next);

      expectError(400);
      expect(Role.findByPk).not.toHaveBeenCalled();
    });

    test("returns 404 for missing role", async () => {
      req.params.id = "999";

      Role.findByPk.mockResolvedValue(null);

      await getRolePermissionsHandler(req, res, next);

      expectError(404);
    });

    test("returns empty permission list", async () => {
      req.params.id = "1";

      rolePermission.findAll.mockResolvedValue([]);

      await getRolePermissionsHandler(req, res, next);

      expect(Permission.findAll).not.toHaveBeenCalled();

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.json).toHaveBeenCalledWith({
        message: "Role permissions fetched successfully",
        role: { id: 1, title: "admin" },
        permissions: [],
      });
    });

    test("returns permissions assigned to role", async () => {
      req.params.id = "1";

      rolePermission.findAll.mockResolvedValue([
        { permissionId: 2 },
        { permissionId: 3 },
      ]);

      const permissions = [
        { id: 2, title: "users.read" },
        { id: 3, title: "users.update" },
      ];

      Permission.findAll.mockResolvedValue(permissions);

      await getRolePermissionsHandler(req, res, next);

      expect(Permission.findAll).toHaveBeenCalledWith({
        where: {
          id: { [Op.in]: [2, 3] },
        },
        attributes: ["id", "title", "description"],
        order: [["id", "ASC"]],
      });

      expect(res.json).toHaveBeenCalledWith({
        message: "Role permissions fetched successfully",
        role: { id: 1, title: "admin" },
        permissions,
      });
    });
  });

  describe("Assign Permissions To Role", () => {
    test("rejects invalid roleId", async () => {
      req.body = {
        roleId: -1,
        permissionIds: [2],
      };

      await assignPermissonToRoleHandler(req, res, next);

      expectError(400);
      expect(Role.findByPk).not.toHaveBeenCalled();
    });

    test("rejects empty permissionIds", async () => {
      req.body = {
        roleId: 1,
        permissionIds: [],
      };

      await assignPermissonToRoleHandler(req, res, next);

      expectError(400);
      expect(rolePermission.bulkCreate).not.toHaveBeenCalled();
    });

    test("rejects duplicate permission IDs", async () => {
      req.body = {
        roleId: 1,
        permissionIds: [2, 2],
      };

      await assignPermissonToRoleHandler(req, res, next);

      expectError(400);
      expect(rolePermission.bulkCreate).not.toHaveBeenCalled();
    });

    test("rejects nonexistent role", async () => {
      req.body = {
        roleId: 999,
        permissionIds: [2],
      };

      Role.findByPk.mockResolvedValue(null);

      await assignPermissonToRoleHandler(req, res, next);

      expectError(404);
      expect(Permission.count).not.toHaveBeenCalled();
    });

    test("rejects nonexistent permissions", async () => {
      req.body = {
        roleId: 1,
        permissionIds: [2, 999],
      };

      Permission.count.mockResolvedValue(1);

      await assignPermissonToRoleHandler(req, res, next);

      expectError(400);
      expect(rolePermission.bulkCreate).not.toHaveBeenCalled();
    });

    test("assigns only new permissions", async () => {
      req.body = {
        roleId: 1,
        permissionIds: [2, 3],
      };

      rolePermission.findAll.mockResolvedValue([{ permissionId: 2 }]);

      await assignPermissonToRoleHandler(req, res, next);

      expect(rolePermission.bulkCreate).toHaveBeenCalledWith([
        {
          roleId: 1,
          permissionId: 3,
        },
      ]);

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.json).toHaveBeenCalledWith({
        message: "Permissions assigned to role successfully",
        roleId: 1,
        addedCount: 1,
      });

      expect(next).not.toHaveBeenCalled();
    });

    test("does not duplicate existing assignments", async () => {
      req.body = {
        roleId: 1,
        permissionIds: [2, 3],
      };

      rolePermission.findAll.mockResolvedValue([
        { permissionId: 2 },
        { permissionId: 3 },
      ]);

      await assignPermissonToRoleHandler(req, res, next);

      expect(rolePermission.bulkCreate).not.toHaveBeenCalled();

      expect(res.json).toHaveBeenCalledWith({
        message: "Permissions assigned to role successfully",
        roleId: 1,
        addedCount: 0,
      });
    });
  });

  describe("Remove Permission From Role", () => {
    beforeEach(() => {
      req.params = {
        roleId: "1",
        permissionId: "2",
      };
    });

    test("rejects invalid IDs", async () => {
      req.params.permissionId = "invalid";

      await removePermissionFromRoleHandler(req, res, next);

      expectError(400);
      expect(rolePermission.destroy).not.toHaveBeenCalled();
    });

    test("rejects nonexistent role", async () => {
      Role.findByPk.mockResolvedValue(null);

      await removePermissionFromRoleHandler(req, res, next);

      expectError(404);
      expect(rolePermission.destroy).not.toHaveBeenCalled();
    });

    test("rejects nonexistent permission", async () => {
      Permission.findByPk.mockResolvedValue(null);

      await removePermissionFromRoleHandler(req, res, next);

      expectError(404);
      expect(rolePermission.destroy).not.toHaveBeenCalled();
    });

    test("returns 404 if permission is not assigned", async () => {
      rolePermission.destroy.mockResolvedValue(0);

      await removePermissionFromRoleHandler(req, res, next);

      expectError(404);
    });

    test("removes permission successfully", async () => {
      await removePermissionFromRoleHandler(req, res, next);

      expect(rolePermission.destroy).toHaveBeenCalledWith({
        where: {
          roleId: 1,
          permissionId: 2,
        },
      });

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.json).toHaveBeenCalledWith({
        message: "Permission removed from role successfully",
        roleId: 1,
        permissionId: 2,
      });

      expect(next).not.toHaveBeenCalled();
    });
  });
});
