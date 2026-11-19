const { config } = require("dotenv");
const { Sequelize } = require("sequelize");
config();
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
{
  dialect: "mariadb",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  timezone: "+00:00",
  logging: false,
  dialectOptions: { ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true } },
}
);

module.exports = sequelize;
