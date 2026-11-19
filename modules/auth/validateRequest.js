
const createHttpError = require("http-errors");

const validateRequest = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const message = result.error.issues
        .map((issue) => issue.message)
        .join(", ");

      return next(createHttpError(400, message));
    }

    req.body = result.data;
    next();
  };
};

module.exports = validateRequest;
