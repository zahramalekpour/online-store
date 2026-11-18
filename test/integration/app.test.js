const request = require("supertest");
const app = require("../../app");

describe("Online Store API - Basic Tests", () => {
  test("GET /health should return 200", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      service: "online-store-backend",
    });
  });

  test("Unknown route should return 404", async () => {
    const response = await request(app).get("/invalid-route");

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("error 404, not found");
  });

  test("Protected route without token should reject request", async () => {
    const response = await request(app).get("/auth/test");

    expect(response.status).toBe(401);
  });
});
