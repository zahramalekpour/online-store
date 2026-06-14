const { Joi, validate } = require("express-validation");
const { productTypes } = require("../../common/constat/product.constat");
const createProductValidation = validate({
  body: Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    type: Joi.string()
      .valid(...Object.values(productTypes))
      .required(),
    price: Joi.number().optional().allow(null),
    discount: Joi.number().optional().allow(null),
    active_discount: Joi.boolean().allow(null).optional(),
    count: Joi.number().optional().allow(null),
    details: Joi.array()
      .items(
        Joi.object({
          key: Joi.string().required(),
          value: Joi.string().required(),
        }),
      )
      .required(),

    colors: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().required(),
          code: Joi.string().required(),
          type: Joi.string()
            .valid(...Object.values(productTypes))
            .required(),
          price: Joi.number().optional().allow(null),
          discount: Joi.number().optional().allow(null),
          active_discount: Joi.boolean().allow(null).optional(),
          count: Joi.number().optional().allow(null),
        }),
      )
      .required(),
    sizes: Joi.array()
      .items(
        Joi.object({
          size: Joi.string().required(),
          type: Joi.string()
            .valid(...Object.values(productTypes))
            .required(),
          price: Joi.number().optional().allow(null),
          discount: Joi.number().optional().allow(null),
          active_discount: Joi.boolean().allow(null).optional(),
          count: Joi.number().optional().allow(null),
        }),
      )
      .required(),
  }),
});

module.exports = {createProductValidation};