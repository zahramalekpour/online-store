const jwt = require("jsonwebtoken");

jest.mock("../../modules/user/user.model", () => ({
  User: {
    findByPk: jest.fn(),
  },
}));

jest.mock("../../modules/RBAC/rback.model", () => ({
  Role: {
    findByPk: jest.fn(),
  },
}));

const { User } = require("../../modules/user/user.model");
const { Role } = require("../../modules/RBAC/rback.model");
const authGuard = require("../../modules/auth/auth.guard");

describe("JWT Authentication Guard Tests", () => {
  const TEST_SECRET = "test-only-access-token-secret-do-not-use-in-production";

  let originalSecret;
  let next;

  beforeAll(() => {
    originalSecret = process.env.ACCESS_WEB_TOKEN;
    process.env.ACCESS_WEB_TOKEN = TEST_SECRET;
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.ACCESS_WEB_TOKEN;
    } else {
      process.env.ACCESS_WEB_TOKEN = originalSecret;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    next = jest.fn();

    User.findByPk.mockResolvedValue({
      id: 10,
      mobile: "09123456789",
      fullname: "Test User",
      roleId: 2,
    });

    Role.findByPk.mockResolvedValue({
      id: 2,
      title: "user",
    });
  });

  function createToken(payload = {}, options = {}) {
    return jwt.sign(
      {
        userId: 10,
        type: "access",
        ...payload,
      },
      TEST_SECRET,
      {
        algorithm: "HS256",
        expiresIn: "1h",
        ...options,
      },
    );
  }

  async function runGuard(authorization) {
    const req = {
      headers: {},
    };

    if (authorization !== undefined) {
      req.headers.authorization = authorization;
    }

    await authGuard(req, {}, next);

    return req;
  }

  function expectError(status) {
    expect(next).toHaveBeenCalledTimes(1);

    const error = next.mock.calls[0][0];

    expect(error).toBeInstanceOf(Error);
    expect(error.status || error.statusCode).toBe(status);

    return error;
  }

  test("rejects missing Authorization header with 401", async () => {
    await runGuard();

    expectError(401);
    expect(User.findByPk).not.toHaveBeenCalled();
  });

  test("rejects invalid Authorization format with 401", async () => {
    await runGuard("InvalidTokenFormat");

    expectError(401);
    expect(User.findByPk).not.toHaveBeenCalled();
  });

  test("rejects non-Bearer authentication with 401", async () => {
    const token = createToken();

    await runGuard(`Basic ${token}`);

    expectError(401);
    expect(User.findByPk).not.toHaveBeenCalled();
  });

  test("rejects malformed JWT with 401", async () => {
    await runGuard("Bearer invalid.jwt.token");

    expectError(401);
    expect(User.findByPk).not.toHaveBeenCalled();
  });

  test("rejects expired JWT with 401", async () => {
    const token = createToken({}, { expiresIn: -10 });

    await runGuard(`Bearer ${token}`);

    expectError(401);
    expect(User.findByPk).not.toHaveBeenCalled();
  });

  test("rejects token signed with another secret", async () => {
    const token = jwt.sign(
      { userId: 10, type: "access" },
      "another-secret-key",
      { algorithm: "HS256" },
    );

    await runGuard(`Bearer ${token}`);

    expectError(401);
    expect(User.findByPk).not.toHaveBeenCalled();
  });

  test("rejects refresh token used as access token", async () => {
    const token = createToken({
      type: "refresh",
    });

    await runGuard(`Bearer ${token}`);

    expectError(401);
    expect(User.findByPk).not.toHaveBeenCalled();
  });

  test("rejects token without userId", async () => {
    const token = createToken({
      userId: null,
    });

    await runGuard(`Bearer ${token}`);

    expectError(401);
    expect(User.findByPk).not.toHaveBeenCalled();
  });

  test("rejects token when user no longer exists", async () => {
    User.findByPk.mockResolvedValue(null);

    const token = createToken();

    await runGuard(`Bearer ${token}`);

    expectError(401);
    expect(User.findByPk).toHaveBeenCalledWith(10);
  });

  test("rejects user without valid role with 403", async () => {
    Role.findByPk.mockResolvedValue(null);

    const token = createToken();

    await runGuard(`Bearer ${token}`);

    expectError(403);
    expect(Role.findByPk).toHaveBeenCalledWith(2);
  });

  test("accepts valid access token and sets req.user", async () => {
    const token = createToken();

    const req = await runGuard(`Bearer ${token}`);

    expect(User.findByPk).toHaveBeenCalledWith(10);
    expect(Role.findByPk).toHaveBeenCalledWith(2);

    expect(req.user).toEqual({
      id: 10,
      mobile: "09123456789",
      fullname: "Test User",
      role: "user",
      roleId: 2,
    });

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  test("passes database errors to Express error handler", async () => {
    const databaseError = new Error("Database unavailable");

    User.findByPk.mockRejectedValue(databaseError);

    const token = createToken();

    await runGuard(`Bearer ${token}`);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(databaseError);
  });
});
