jest.mock("../../modules/RBAC/rback.model", () => ({
  Permission: { findOne: jest.fn() },
  rolePermission: { findOne: jest.fn() },
}));

const {
  Permission,
  rolePermission,
} = require("../../modules/RBAC/rback.model");
const { requirePermission } = require("../../modules/RBAC/requirePermission");

describe("RBAC requirePermission middleware", () => {
  let next;
  let logSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    next = jest.fn();
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  async function check(user, permission = "users.read") {
    await requirePermission(permission)({ user }, {}, next);
  }

  function expectError(status) {
    expect(next).toHaveBeenCalledTimes(1);

    const error = next.mock.calls[0][0];

    expect(error).toBeInstanceOf(Error);
    expect(error.status || error.statusCode).toBe(status);
  }

  test("rejects unauthenticated requests with 401", async () => {
    await check(undefined);

    expectError(401);
    expect(Permission.findOne).not.toHaveBeenCalled();
  });

  test("rejects users without roleId with 403", async () => {
    await check({ id: 7 });

    expectError(403);
    expect(Permission.findOne).not.toHaveBeenCalled();
  });

  test("rejects undefined permissions with 403", async () => {
    Permission.findOne.mockResolvedValue(null);

    await check({ id: 7, roleId: 2 });

    expectError(403);

    expect(Permission.findOne).toHaveBeenCalledWith({
      where: { title: "users.read" },
    });

    expect(rolePermission.findOne).not.toHaveBeenCalled();
  });

  test("rejects roles without permission assignment with 403", async () => {
    Permission.findOne.mockResolvedValue({ id: 5 });
    rolePermission.findOne.mockResolvedValue(null);

    await check({ id: 7, roleId: 2 });

    expectError(403);

    expect(rolePermission.findOne).toHaveBeenCalledWith({
      where: { roleId: 2, permissionId: 5 },
    });
  });

  test("allows a role with the required permission", async () => {
    Permission.findOne.mockResolvedValue({ id: 5 });

    rolePermission.findOne.mockResolvedValue({
      toJSON: () => ({ roleId: 2, permissionId: 5 }),
    });

    await check({ id: 7, roleId: 2 });

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  test("checks the exact requested permission title", async () => {
    Permission.findOne.mockResolvedValue({ id: 9 });

    rolePermission.findOne.mockResolvedValue({
      toJSON: () => ({}),
    });

    await check({ id: 7, roleId: 2 }, "users.update");

    expect(Permission.findOne).toHaveBeenCalledWith({
      where: { title: "users.update" },
    });

    expect(next).toHaveBeenCalledWith();
  });

  test("passes permission lookup errors to error handler", async () => {
    const error = new Error("Database unavailable");

    Permission.findOne.mockRejectedValue(error);

    await check({ id: 7, roleId: 2 });

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(error);
  });

  test("passes role assignment lookup errors to error handler", async () => {
    const error = new Error("Database unavailable");

    Permission.findOne.mockResolvedValue({ id: 5 });
    rolePermission.findOne.mockRejectedValue(error);

    await check({ id: 7, roleId: 2 });

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(error);
  });
});
