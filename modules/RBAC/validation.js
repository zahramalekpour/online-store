const { Joi, validate } = require("express-validation");
const { productTypes } = require("../../common/constat/product.constat");

const assignPermissionToRoleValidation = validate({
  body: Joi.object({
    roleId: Joi.number().required(),
    permission: Joi.array().items(Joi.number),
  }).optional(),
});

module.exports = { assignPermissionToRoleValidation };
