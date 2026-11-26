const requireRole = require("../../modules/auth/requireRole");

describe("requireRole Middleware Tests", () => {
  let next;

  beforeEach(() => {
    next = jest.fn();
  });

  test("rejects unauthenticated users with 401", () => {
    const middleware = requireRole("admin");

    middleware({}, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].status).toBe(401);
  });

  test("rejects users without required role with 403", () => {
    const middleware = requireRole("admin");

    middleware({ user: { id: 1, role: "user" } }, {}, next);

    expect(next.mock.calls[0][0].status).toBe(403);
  });

  test("allows users with admin role", () => {
    const middleware = requireRole("admin");

    middleware({ user: { id: 1, role: "admin" } }, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  test("supports multiple allowed roles", () => {
    const middleware = requireRole("admin", "manager");

    middleware({ user: { id: 2, role: "manager" } }, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  test("uses exact role matching", () => {
    const middleware = requireRole("admin");

    middleware({ user: { id: 1, role: "Admin" } }, {}, next);

    expect(next.mock.calls[0][0].status).toBe(403);
  });
});
