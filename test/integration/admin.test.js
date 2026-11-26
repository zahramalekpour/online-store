const request = require("supertest");
const express = require("express");

jest.mock("../../config/sequelize.config", () => ({
  transaction: jest.fn(),
}));

jest.mock("../../modules/user/user.model", () => ({
  User: {
    findByPk: jest.fn(),
    findAndCountAll: jest.fn(),
    count: jest.fn(),
  },
}));

jest.mock("../../modules/RBAC/rback.model", () => ({
  Role: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
  },
  Permission: {},
  rolePermission: {},
}));

// Test-only authentication middleware.
// Never use these test headers in production.
jest.mock("../../modules/auth/auth.guard", () => {
  return (req, res, next) => {
    const role = req.get("x-test-role");

    if (!role) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    req.user = {
      id: Number(req.get("x-test-user-id") || 10),
      role,
      roleId: role === "admin" ? 1 : 2,
    };

    next();
  };
});

// Permission decisions are tested separately
// in requirePermission.test.js.
jest.mock("../../modules/RBAC/requirePermission", () => ({
  requirePermission: jest.fn(() => (req, res, next) => next()),
}));

const sequelize = require("../../config/sequelize.config");
const { User } = require("../../modules/user/user.model");
const { Role } = require("../../modules/RBAC/rback.model");
const { adminRouter } = require("../../modules/admin/admin.routes");

const app = express();

app.use(express.json());
app.use("/auth/admin", adminRouter);

app.use((err, req, res, next) => {
  res.status(err.status || err.statusCode || 500).json({
    message: err.message || "Internal server error",
  });
});

const adminHeaders = {
  "x-test-role": "admin",
  "x-test-user-id": "10",
};

const userHeaders = {
  "x-test-role": "user",
  "x-test-user-id": "20",
};

describe("Admin API Security Tests", () => {
  beforeEach(() => {
    jest.resetAllMocks();

    sequelize.transaction.mockImplementation(async (callback) => {
      const transaction = {
        LOCK: { UPDATE: "UPDATE" },
      };

      return callback(transaction);
    });
  });

  test("rejects requests without authentication", async () => {
    const response = await request(app).get("/auth/admin/users");

    expect(response.status).toBe(401);
    expect(User.findAndCountAll).not.toHaveBeenCalled();
  });

  test("rejects non-admin users with 403", async () => {
    const response = await request(app)
      .get("/auth/admin/users")
      .set(userHeaders);

    expect(response.status).toBe(403);
    expect(User.findAndCountAll).not.toHaveBeenCalled();
  });

  test("prevents admin from changing own role", async () => {
    const response = await request(app)
      .patch("/auth/admin/users/10/role")
      .set(adminHeaders)
      .send({ roleId: 2 });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("You cannot change your own role");

    expect(sequelize.transaction).not.toHaveBeenCalled();
  });

  test("prevents demoting the last admin", async () => {
    const targetUser = {
      id: 20,
      mobile: "09120000000",
      roleId: 1,
      update: jest.fn(),
    };

    Role.findOne.mockResolvedValue({
      id: 1,
      title: "admin",
    });

    User.findByPk.mockResolvedValue(targetUser);

    Role.findByPk.mockResolvedValue({
      id: 2,
      title: "user",
    });

    User.count.mockResolvedValue(1);

    const response = await request(app)
      .patch("/auth/admin/users/20/role")
      .set(adminHeaders)
      .send({ roleId: 2 });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe(
      "Cannot change the role of the last admin",
    );

    expect(User.count).toHaveBeenCalled();
    expect(targetUser.update).not.toHaveBeenCalled();
  });

  test("allows changing a user role when multiple admins exist", async () => {
    const targetUser = {
      id: 20,
      mobile: "09120000000",
      roleId: 1,
      update: jest.fn().mockImplementation(async function (values) {
        this.roleId = values.roleId;
        return this;
      }),
    };

    Role.findOne.mockResolvedValue({
      id: 1,
      title: "admin",
    });

    User.findByPk.mockResolvedValue(targetUser);

    Role.findByPk.mockResolvedValue({
      id: 2,
      title: "user",
    });

    User.count.mockResolvedValue(2);

    const response = await request(app)
      .patch("/auth/admin/users/20/role")
      .set(adminHeaders)
      .send({ roleId: 2 });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("User role updated successfully");

    expect(response.body.user.roleId).toBe(2);

    expect(targetUser.update).toHaveBeenCalledWith(
      { roleId: 2 },
      expect.objectContaining({
        transaction: expect.any(Object),
      }),
    );
  });

  test("rejects invalid roleId", async () => {
    const response = await request(app)
      .patch("/auth/admin/users/20/role")
      .set(adminHeaders)
      .send({ roleId: -1 });

    expect(response.status).toBe(400);
    expect(sequelize.transaction).not.toHaveBeenCalled();
  });

  test("rejects invalid user ID", async () => {
    const response = await request(app)
      .patch("/auth/admin/users/invalid/role")
      .set(adminHeaders)
      .send({ roleId: 2 });

    expect(response.status).toBe(400);
    expect(sequelize.transaction).not.toHaveBeenCalled();
  });

  test("returns 404 when target user does not exist", async () => {
    Role.findOne.mockResolvedValue({
      id: 1,
      title: "admin",
    });

    User.findByPk.mockResolvedValue(null);

    const response = await request(app)
      .patch("/auth/admin/users/20/role")
      .set(adminHeaders)
      .send({ roleId: 2 });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("User not found");
  });
});
