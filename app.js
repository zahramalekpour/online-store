require("dotenv").config();

const express = require("express");

const { productRoutes } = require("./modules/product/product.routes");
const { basketRoutes } = require("./modules/basket/basket.routes");
const { paymentRoutes } = require("./modules/payment/payment.routes");
const { orderRoutes } = require("./modules/order/order.routes");
const { rbacRouter } = require("./modules/RBAC/rbac.routes");
const { adminRouter } = require("./modules/admin/admin.routes");
const { authRouter } = require("./modules/auth/auth.routes");
const authGuard = require("./modules/auth/auth.guard");
const { swaggerUi, swaggerSpec } = require("./config/swagger.config");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: "Online Store API Docs",
  }),
);

app.get("/api-docs.json", (req, res) => {
  res.json(swaggerSpec);
});
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "online-store-backend",
  });
});
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Online Store Backend is running",
    status: "success",
  });
});

app.get("/auth/test", authGuard, (req, res) => {
  res.status(200).json({
    message: "Authentication successful",
    user: req.user,
  });
});

app.use("/auth", authRouter);
app.use("/auth/admin", adminRouter);
app.use("/product", productRoutes);
app.use("/basket", basketRoutes);
app.use("/payment", paymentRoutes);
app.use("/orders", orderRoutes);
app.use("/rbac", rbacRouter);

app.use((req, res) => {
  res.status(404).json({
    message: "error 404, not found",
  });
});

app.use((err, req, res, next) => {
  const status = err?.status ?? err?.statusCode ?? 500;

  let message =
    status >= 500
      ? "Internal server error"
      : (err?.message ?? "Request failed");

  if (err?.name === "validationError") {
    message = err.details?.body?.[0]?.message ?? message;
  }

  if (status >= 500) console.error(err);

  res.status(status).json({ message });
});

module.exports = app;
