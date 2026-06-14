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
    logging: false,
  },
);
sequelize
  .authenticate()
  .then(() => {
    console.log("connected successfully to maria db");
  })
  .catch((error) => {
    console.log("cannot connect to mariadb");
  });
console.log("DB_NAME =", process.env.DB_NAME);

module.exports = sequelize;
