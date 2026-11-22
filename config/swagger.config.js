const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Online Store REST API",
      version: "1.0.0",
      description:
        "E-commerce Backend API built with Node.js, Express, Sequelize, JWT and RBAC.",
    },
    servers: [
      {
        url: "https://online-store-qihx.onrender.com",
        description: "Production - Render",
      },
      {
        url: "http://localhost:2500",
        description: "Local Development",
      },
    ],
    tags: [
      { name: "Products", description: "Product management" },
      { name: "Authentication", description: "Authentication and tokens" },
      { name: "Basket", description: "Shopping basket" },
      { name: "Orders", description: "Order management" },
      { name: "Payment", description: "Payment operations" },
      { name: "RBAC", description: "Roles and permissions" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./modules/**/*.routes.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  swaggerSpec,
};
