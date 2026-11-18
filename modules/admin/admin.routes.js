
const { Router } = require("express");
const { Op } = require("sequelize");
const createHttpError = require("http-errors");

const sequelize = require("../../config/sequelize.config");
const { User } = require("../user/user.model");
const { Role } = require("../RBAC/rback.model");
const authGuard = require("../auth/auth.guard");
const requireRole = require("../auth/requireRole");
const { requirePermission } = require("../RBAC/requirePermission");

const router = Router();

router.use(authGuard, requireRole("admin"));

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function formatUser(user) {
  const data = user.toJSON();

  return {
    id: data.id,
    fullname: data.fullname,
    mobile: data.mobile,
    roleId: data.roleId,
    role: data.userRole?.title ?? null,
  };
}

const roleInclude = [
  {
    model: Role,
    as: "userRole",
    attributes: ["id", "title"],
    required: false,
  },
];

// GET ALL USERS
router.get(
  "/users",
  requirePermission("users.read"),
  async (req, res, next) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 10);

      if (
        !Number.isSafeInteger(page) ||
        page < 1 ||
        !Number.isSafeInteger(limit) ||
        limit < 1 ||
        limit > 100
      ) {
        return res.status(400).json({
          message: "Invalid pagination parameters",
        });
      }

      const search = String(req.query.search ?? "").trim();
      const where = {};

      if (search) {
        if (!/^[0-9]{1,11}$/.test(search)) {
          return res.status(400).json({
            message: "Invalid mobile search",
          });
        }

        where.mobile = {
          [Op.like]: `${search}%`,
        };
      }

      const { count, rows } = await User.findAndCountAll({
        where,
        attributes: ["id", "fullname", "mobile", "roleId"],
        include: roleInclude,
        order: [["id", "DESC"]],
        limit,
        offset: (page - 1) * limit,
      });

      return res.status(200).json({
        message: "Users fetched successfully",
        users: rows.map(formatUser),
        pagination: {
          totalUsers: count,
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          limit,
        },
      });
    } catch (error) {
      return next(error);
    }
  },
);

// GET SINGLE USER
router.get(
  "/users/:id",
  requirePermission("users.read"),
  async (req, res, next) => {
    try {
      const id = parseId(req.params.id);

      if (!id) {
        return res.status(400).json({
          message: "Invalid user ID",
        });
      }

      const user = await User.findByPk(id, {
        attributes: ["id", "fullname", "mobile", "roleId"],
        include: roleInclude,
      });

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      return res.status(200).json({
        message: "User fetched successfully",
        user: formatUser(user),
      });
    } catch (error) {
      return next(error);
    }
  },
);

// UPDATE USER FULLNAME
router.patch(
  "/users/:id",
  requirePermission("users.update"),
  async (req, res, next) => {
    try {
      const id = parseId(req.params.id);

      if (!id) {
        return res.status(400).json({
          message: "Invalid user ID",
        });
      }

      const fullname =
        typeof req.body?.fullname === "string"
          ? req.body.fullname.trim()
          : "";

      if (fullname.length < 2 || fullname.length > 100) {
        return res.status(400).json({
          message: "Invalid fullname",
        });
      }

      const user = await User.findByPk(id);

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      await user.update({ fullname });

      const role = await Role.findByPk(user.roleId);

      return res.status(200).json({
        message: "User updated successfully",
        user: {
          id: user.id,
          fullname: user.fullname,
          mobile: user.mobile,
          roleId: user.roleId,
          role: role?.title ?? null,
        },
      });
    } catch (error) {
      return next(error);
    }
  },
);

// GET USER ROLE
router.get(
  "/users/:id/role",
  requirePermission("users.read"),
  async (req, res, next) => {
    try {
      const id = parseId(req.params.id);

      if (!id) {
        return res.status(400).json({
          message: "Invalid user ID",
        });
      }

      const user = await User.findByPk(id, {
        attributes: ["id", "mobile", "roleId"],
      });

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      const role = await Role.findByPk(user.roleId);

      return res.status(200).json({
        userId: user.id,
        mobile: user.mobile,
        roleId: user.roleId,
        role: role?.title ?? null,
      });
    } catch (error) {
      return next(error);
    }
  },
);

// UPDATE USER ROLE
router.patch(
  "/users/:id/role",
  requirePermission("users.update"),
  async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      const roleId = req.body?.roleId;

      if (!id) {
        return res.status(400).json({
          message: "Invalid user ID",
        });
      }

      if (!Number.isSafeInteger(roleId) || roleId < 1) {
        return res.status(400).json({
          message: "Invalid roleId",
        });
      }

      if (id === req.user.id) {
        return res.status(403).json({
          message: "You cannot change your own role",
        });
      }

      const result = await sequelize.transaction(async (transaction) => {
        const adminRole = await Role.findOne({
          where: { title: "admin" },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!adminRole) {
          throw createHttpError(
            500,
            "Admin role is not configured",
          );
        }

        const user = await User.findByPk(id, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!user) {
          throw createHttpError(404, "User not found");
        }

        const role = await Role.findByPk(roleId, {
          transaction,
        });

        if (!role) {
          throw createHttpError(404, "Role not found");
        }

        if (user.roleId === role.id) {
          return {
            status: 200,
            body: {
              message: "User already has this role",
              userId: user.id,
              roleId: role.id,
              role: role.title,
            },
          };
        }

        // Protect the last admin.
        if (
          user.roleId === adminRole.id &&
          role.id !== adminRole.id
        ) {
          const adminCount = await User.count({
            where: { roleId: adminRole.id },
            transaction,
          });

          if (adminCount <= 1) {
            throw createHttpError(
              409,
              "Cannot change the role of the last admin",
            );
          }
        }

        await user.update(
          {
            roleId: role.id,
          },
          { transaction },
        );

        return {
          status: 200,
          body: {
            message: "User role updated successfully",
            user: {
              id: user.id,
              mobile: user.mobile,
              roleId: role.id,
              role: role.title,
            },
          },
        };
      });

      return res.status(result.status).json(result.body);
    } catch (error) {
      return next(error);
    }
  },
);

module.exports = { adminRouter: router };
