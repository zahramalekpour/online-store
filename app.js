const express = require("express");
const { config } = require("dotenv");
const sequelize = require("./config/sequelize.config");
const initDatabases = require("./config/models.initial");
const { productRoutes } = require("./modules/product/product.routes");
const { authRouter } = require("./modules/auth/auth.routes");
const { basketRoutes } = require("./modules/basket/basket.routes");
const { paymentRoutes } = require("./modules/payment/payment.routes");
const { orderRoutes } = require("./modules/order/order.routes");
const { rbacRouter } = require("./modules/RBAC/rbac.routes");
config();
async function main() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  await initDatabases();
  app.use("/product", productRoutes);
  app.use("/auth", authRouter);
  app.use("/basket", basketRoutes);
  app.use("/payment", paymentRoutes);
  app.use("/orders", orderRoutes);
  app.use("/rbac", rbacRouter);
  app.use((req, res, next) => {
    return res.status(404).json({
      message: "error 404, not found",
    });
  });
  app.use((err, req, res, next) => {
    const status = err?.status ?? err.statusCode ?? 500;
    let message = err?.message ?? "internal server error";
    if (err?.name == "validationError") {
      const { details } = err;
      message = details?.body?.[0].message ?? "internal server error";
    }
    return res.status(status).json({
      message,
    });
  });
  let port = process.env.port ?? 2500;
  app.listen(port, () => {
    console.log("server run on http://" + port);
  });
}
main();
