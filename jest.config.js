
module.exports = {
  testEnvironment: "node",

  roots: ["<rootDir>/test"],

  testMatch: [
    "**/*.test.js"
  ],

  testPathIgnorePatterns: [
    "/node_modules/",
    "/ecommerce-nest/"
  ],

  collectCoverageFrom: [
    "modules/**/*.js",
    "app.js"
  ],

  coverageDirectory: "coverage",

  clearMocks: true,

  verbose: true
};
