const { Router } = require("express");
const authGuard = require("../auth/auth.guard");
const requireRole = require("../auth/requirerole");
const {
  getMyOrdersHandler, getOrderByIdHandler, setPackedStatusToOrder,
  setInTransitStatusToOrder, setCanceledStatusToOrder, setDeliveryStatusToOrder,
} = require("./order.service");
const router = Router();
router.use(authGuard);
router.get("/", getMyOrdersHandler);
router.get("/:id", getOrderByIdHandler);
// These routes change fulfillment state and must never be accessible to customers.
router.patch("/set-packed/:id", requireRole("admin"), setPackedStatusToOrder);
router.patch("/set-in-transit/:id", requireRole("admin"), setInTransitStatusToOrder);
router.patch("/set-canceled/:id", requireRole("admin"), setCanceledStatusToOrder);
router.patch("/set-delivery/:id", requireRole("admin"), setDeliveryStatusToOrder);
module.exports = { orderRoutes: router };
