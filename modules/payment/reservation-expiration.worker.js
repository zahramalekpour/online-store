const { Op } = require("sequelize");
const sequelize = require("../../config/sequelize.config");
const { Payment } = require("./payment.model");
const { release } = require("./stock-reservation");

const INTERVAL_MS = 60 * 1000;
const BATCH_SIZE = 100;

let timer = null;
let running = false;

async function processExpiredReservations() {
  if (running) return;
  running = true;

  try {
    const now = new Date();

    // Find expired pending payments.
    const candidates = await Payment.findAll({
      attributes: ["id"],
      where: {
        status: 0,
        reservationExpiresAt: {
          [Op.lte]: now,
          [Op.ne]: null,
        },
      },
      order: [["id", "ASC"]],
      limit: BATCH_SIZE,
    });

    let releasedCount = 0;

    for (const candidate of candidates) {
      try {
        const released = await sequelize.transaction(async (transaction) => {
          // Lock and recheck each payment to prevent double release.
          const payment = await Payment.findByPk(candidate.id, {
            transaction,
            lock: transaction.LOCK.UPDATE,
          });

          if (!payment || Number(payment.status) !== 0) {
            return false;
          }

          if (
            !payment.reservationExpiresAt ||
            new Date(payment.reservationExpiresAt) > new Date()
          ) {
            return false;
          }

          return release(
            payment,
            transaction,
            3,
            "Payment reservation expired",
          );
        });

        if (released) releasedCount++;
      } catch (error) {
        console.error(
          `Failed to expire payment ${candidate.id}:`,
          error.message,
        );
      }
    }

    if (releasedCount > 0) {
      console.log(`Expired reservations released: ${releasedCount}`);
    }

    return releasedCount;
  } catch (error) {
    console.error("Reservation expiration worker error:", error);
    return 0;
  } finally {
    running = false;
  }
}

function startReservationExpirationWorker() {
  if (timer) return;

  console.log("Reservation expiration worker started");

  // Run once immediately.
  processExpiredReservations();

  // Then check every minute.
  timer = setInterval(processExpiredReservations, INTERVAL_MS);

  timer.unref?.();
}

function stopReservationExpirationWorker() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = {
  processExpiredReservations,
  startReservationExpirationWorker,
  stopReservationExpirationWorker,
};
