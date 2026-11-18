
jest.mock("sequelize", () => ({
  Op: {
    lte: Symbol("lte"),
    ne: Symbol("ne"),
  },
}));

jest.mock("../../config/sequelize.config", () => ({
  transaction: jest.fn(),
}));

jest.mock("../../modules/payment/payment.model", () => ({
  Payment: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
  },
}));

jest.mock("../../modules/payment/stock-reservation", () => ({
  release: jest.fn(),
}));

const sequelize = require("../../config/sequelize.config");
const { Payment } = require("../../modules/payment/payment.model");
const { release } = require("../../modules/payment/stock-reservation");

const {
  processExpiredReservations,
} = require("../../modules/payment/reservation-expiration.worker");

describe("Reservation Expiration Worker", () => {
  let transaction;
  let payment;

  beforeEach(() => {
    jest.clearAllMocks();

    transaction = {
      LOCK: { UPDATE: "UPDATE" },
    };

    payment = {
      id: 10,
      status: 0,
      reservationExpiresAt: new Date(Date.now() - 60000),
    };

    sequelize.transaction.mockImplementation(async (callback) =>
      callback(transaction)
    );

    Payment.findAll.mockResolvedValue([{ id: 10 }]);
    Payment.findByPk.mockResolvedValue(payment);
    release.mockResolvedValue(true);
  });

  test("should release expired pending payment", async () => {
    const result = await processExpiredReservations();

    expect(result).toBe(1);

    expect(release).toHaveBeenCalledWith(
      payment,
      transaction,
      3,
      "Payment reservation expired"
    );
  });

  test("should not release already paid payment", async () => {
    payment.status = 1;

    const result = await processExpiredReservations();

    expect(result).toBe(0);
    expect(release).not.toHaveBeenCalled();
  });

  test("should not release payment that is not expired", async () => {
    payment.reservationExpiresAt = new Date(Date.now() + 60000);

    const result = await processExpiredReservations();

    expect(result).toBe(0);
    expect(release).not.toHaveBeenCalled();
  });

  test("should ignore payment already expired", async () => {
    payment.status = 3;

    const result = await processExpiredReservations();

    expect(result).toBe(0);
    expect(release).not.toHaveBeenCalled();
  });

  test("should handle empty payment list", async () => {
    Payment.findAll.mockResolvedValue([]);

    const result = await processExpiredReservations();

    expect(result).toBe(0);
    expect(release).not.toHaveBeenCalled();
  });

  test("should not release payment twice", async () => {
    release.mockResolvedValue(false);

    const result = await processExpiredReservations();

    expect(result).toBe(0);
    expect(release).toHaveBeenCalledTimes(1);
  });

  test("should handle database errors", async () => {
    Payment.findAll.mockRejectedValue(new Error("Database error"));

    const result = await processExpiredReservations();

    expect(result).toBe(0);
  });
});
