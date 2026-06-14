const createHttpError = require("http-errors");
const { Role, Permission, rolePermission } = require("./rback.model");
const { or } = require("sequelize");
const { assignPermissionToRoleValidation } = require("./validation");

async function createRoleHandler(req, res, next) {
  try {
    const { title, description } = req.body;
    const existRole = await Role.findOne({ where: { title } });
    if (existRole) throw createHttpError(409, "role already exists");
    await Role.create({
      title,
      description,
    });
    return res.json({
      message: "role created successfully",
    });
  } catch (error) {
    next(error);
  }
}

async function createPermissionHandler(req, res, next) {
  try {
    const { title, description } = req.body;
    const existPermission = await Permission.findOne({ where: { title } });
    if (existPermission) throw createHttpError(409, "role already exists");
    await Permission.create({
      title,
      description,
    });
    return res.json({
      message: "permission created successfully",
    });
  } catch (error) {
    next(error);
  }
}

async function assignPermissonToRoleHandler(req, res, next) {
  try {
    const { roleId, Permission = [] } = req.body;
    const role = await Role.findAll({ where: { id: roleId } });
    if (!role) throw createHttpError(40, "role not found");
    if (Permission.length > 0) {
      const permissionCount = await Permission.count({
        where: { id: { [Op.in]: Permission } },
      });

      if (permissionCount !== Permission.length) {
        throw createHttpError(400, "enter correct number of roles");
      }
      const permissionList = permission.map((per) => ({
        roleId,
        permission: per,
      }));
      await rolePermission.bulkCreate(permissionList);
    }
    return res.json({
      message: "permission to role",
    });
  } catch (error) {}
}

module.exports = {
  createPermissionHandler,
  createRoleHandler,
  assignPermissonToRoleHandler,
};
