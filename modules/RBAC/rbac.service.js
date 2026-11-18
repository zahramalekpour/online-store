
const createHttpError = require("http-errors");
const { Role, Permission, rolePermission } = require("./rback.model");
const { Op } = require("sequelize");

// 1. Create Role
async function createRoleHandler(req, res, next) {
  try {
    const title =
      typeof req.body.title === "string"
        ? req.body.title.trim()
        : "";

    const description = req.body.description ?? null;

    if (!title || title.length > 100) {
      throw createHttpError(400, "Invalid role title");
    }

    const existRole = await Role.findOne({
      where: { title },
    });

    if (existRole) {
      throw createHttpError(409, "Role already exists");
    }

    const role = await Role.create({
      title,
      description,
    });

    return res.status(201).json({
      message: "Role created successfully",
      role,
    });
  } catch (error) {
    next(error);
  }
}

// 2. Create Permission
async function createPermissionHandler(req, res, next) {
  try {
    const title =
      typeof req.body.title === "string"
        ? req.body.title.trim()
        : "";

    const description = req.body.description ?? null;

    if (!title || title.length > 100) {
      throw createHttpError(400, "Invalid permission title");
    }

    const existPermission = await Permission.findOne({
      where: { title },
    });

    if (existPermission) {
      throw createHttpError(409, "Permission already exists");
    }

    const permission = await Permission.create({
      title,
      description,
    });

    return res.status(201).json({
      message: "Permission created successfully",
      permission,
    });
  } catch (error) {
    next(error);
  }
}

// 3. Get All Roles
async function getRolesHandler(req, res, next) {
  try {
    const roles = await Role.findAll({
      attributes: ["id", "title", "description"],
      order: [["id", "ASC"]],
    });

    return res.status(200).json({
      message: "Roles fetched successfully",
      roles,
    });
  } catch (error) {
    next(error);
  }
}

// 4. Get All Permissions
async function getPermissionsHandler(req, res, next) {
  try {
    const permissions = await Permission.findAll({
      attributes: ["id", "title", "description"],
      order: [["id", "ASC"]],
    });

    return res.status(200).json({
      message: "Permissions fetched successfully",
      permissions,
    });
  } catch (error) {
    next(error);
  }
}

// 5. Get Permissions Of A Role
async function getRolePermissionsHandler(req, res, next) {
  try {
    const roleId = Number(req.params.id);

    if (!Number.isSafeInteger(roleId) || roleId < 1) {
      throw createHttpError(400, "Invalid role ID");
    }

    const role = await Role.findByPk(roleId, {
      attributes: ["id", "title", "description"],
    });

    if (!role) {
      throw createHttpError(404, "Role not found");
    }

    const assignments = await rolePermission.findAll({
      where: { roleId },
      attributes: ["permissionId"],
    });

    const permissionIds = assignments.map(
      (item) => item.permissionId
    );

    const permissions = permissionIds.length
      ? await Permission.findAll({
          where: {
            id: { [Op.in]: permissionIds },
          },
          attributes: ["id", "title", "description"],
          order: [["id", "ASC"]],
        })
      : [];

    return res.status(200).json({
      message: "Role permissions fetched successfully",
      role,
      permissions,
    });
  } catch (error) {
    next(error);
  }
}

// 6. Assign Permissions To Role
async function assignPermissonToRoleHandler(req, res, next) {
  try {
    const { roleId, permissionIds } = req.body;

    if (!Number.isSafeInteger(roleId) || roleId < 1) {
      throw createHttpError(400, "Invalid role ID");
    }

    if (
      !Array.isArray(permissionIds) ||
      permissionIds.length === 0 ||
      !permissionIds.every(
        (id) => Number.isSafeInteger(id) && id > 0
      ) ||
      new Set(permissionIds).size !== permissionIds.length
    ) {
      throw createHttpError(400, "Invalid permission IDs");
    }

    const role = await Role.findByPk(roleId);

    if (!role) {
      throw createHttpError(404, "Role not found");
    }

    const permissionCount = await Permission.count({
      where: {
        id: { [Op.in]: permissionIds },
      },
    });

    if (permissionCount !== permissionIds.length) {
      throw createHttpError(
        400,
        "One or more permissions not found"
      );
    }

    const existing = await rolePermission.findAll({
      where: {
        roleId,
        permissionId: { [Op.in]: permissionIds },
      },
      attributes: ["permissionId"],
    });

    const existingIds = new Set(
      existing.map((item) => Number(item.permissionId))
    );

    const newPermissions = permissionIds
      .filter((id) => !existingIds.has(id))
      .map((permissionId) => ({
        roleId,
        permissionId,
      }));

    if (newPermissions.length > 0) {
      await rolePermission.bulkCreate(newPermissions);
    }

    return res.status(200).json({
      message: "Permissions assigned to role successfully",
      roleId,
      addedCount: newPermissions.length,
    });
  } catch (error) {
    next(error);
  }
}

// 7. Remove Permission From Role
async function removePermissionFromRoleHandler(req, res, next) {
  try {
    const roleId = Number(req.params.roleId);
    const permissionId = Number(req.params.permissionId);

    if (
      !Number.isSafeInteger(roleId) ||
      roleId < 1 ||
      !Number.isSafeInteger(permissionId) ||
      permissionId < 1
    ) {
      throw createHttpError(400, "Invalid IDs");
    }

    const role = await Role.findByPk(roleId);

    if (!role) {
      throw createHttpError(404, "Role not found");
    }

    const permission = await Permission.findByPk(permissionId);

    if (!permission) {
      throw createHttpError(404, "Permission not found");
    }

    const deleted = await rolePermission.destroy({
      where: {
        roleId,
        permissionId,
      },
    });

    if (!deleted) {
      throw createHttpError(
        404,
        "Permission is not assigned to this role"
      );
    }

    return res.status(200).json({
      message: "Permission removed from role successfully",
      roleId,
      permissionId,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createPermissionHandler,
  createRoleHandler,
  getRolesHandler,
  getPermissionsHandler,
  getRolePermissionsHandler,
  assignPermissonToRoleHandler,
  removePermissionFromRoleHandler,
};
