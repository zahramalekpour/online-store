const { Router } = require("express");
const authGuard = require("../auth/auth.guard");
const {
  getMyOrdersHandler,
  getOrderByIdHandler,
  setPackedStatusToOrder,
  setInTransitStatusToOrder,
  setCanceledStatusToOrder,
  setDeliveryStatusToOrder,
} = require("./order.service");

const router = Router();

router.get("/", authGuard, getMyOrdersHandler);
router.get("/:id", authGuard, getOrderByIdHandler);
router.patch("/set-packed/:id", authGuard, setPackedStatusToOrder);
router.patch("/set-in-transit/:id", authGuard, setInTransitStatusToOrder);
router.patch("/set-canceled/:id", authGuard, setCanceledStatusToOrder);
router.patch("/set-delivery/:id", authGuard, setDeliveryStatusToOrder);

module.exports = { orderRoutes: router };
