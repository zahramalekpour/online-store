
const { Joi, validate } = require("express-validation");

const assignPermissionToRoleValidation = validate({
  body: Joi.object({
    roleId: Joi.number()
      .integer()
      .positive()
      .required(),

    permissionIds: Joi.array()
      .items(
        Joi.number().integer().positive()
      )
      .min(1)
      .unique()
      .required(),
  }).required(),
});

module.exports = {
  assignPermissionToRoleValidation,
};
