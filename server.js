require("dotenv").config();

const app = require("./app");
const initDatabases = require("./config/models.initial");

const {
  startReservationExpirationWorker,
  stopReservationExpirationWorker,
} = require("./modules/payment/reservation-expiration.worker");

async function startServer() {
  try {
    await initDatabases();

    const PORT = Number(process.env.PORT) || 2500;

    startReservationExpirationWorker();

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    server.on("error", (error) => {
      console.error("Server error:", error);
      process.exitCode = 1;
    });

    const shutdown = () => {
      console.log("Shutting down server...");

      stopReservationExpirationWorker();

      server.close(async () => {
        try {
          const sequelize = require("./config/sequelize.config");
          await sequelize.close();
        } catch (error) {
          console.error("Database shutdown error:", error);
        }

        process.exit(0);
      });
    };

    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);

    return server;
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exitCode = 1;
  }
}

startServer();
