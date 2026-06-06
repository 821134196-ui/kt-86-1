import Joi from 'joi';

export const authSchemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    username: Joi.string().min(3).max(50).required(),
    password: Joi.string().min(6).max(128).required(),
    avatar: Joi.string().uri().optional(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};

export const homeSchemas = {
  create: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).optional(),
    avatar: Joi.string().uri().optional(),
  }),

  update: Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    description: Joi.string().max(500).optional().allow(null),
    avatar: Joi.string().uri().optional().allow(null),
  }),

  addMember: Joi.object({
    userId: Joi.string().uuid().required(),
    role: Joi.string().valid('ADMIN', 'MEMBER', 'GUEST').default('MEMBER'),
  }),
};

export const roomSchemas = {
  create: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    homeId: Joi.string().uuid().required(),
    icon: Joi.string().optional(),
  }),

  update: Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    icon: Joi.string().optional().allow(null),
  }),
};

export const deviceGroupSchemas = {
  create: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    homeId: Joi.string().uuid().required(),
    icon: Joi.string().optional(),
  }),

  update: Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    icon: Joi.string().optional().allow(null),
  }),
};

export const deviceTypeSchemas = {
  create: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    category: Joi.string().min(1).max(100).required(),
    icon: Joi.string().optional(),
    description: Joi.string().max(500).optional(),
    capabilities: Joi.array().items(Joi.any()).default([]),
  }),
};

export const deviceSchemas = {
  create: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    deviceTypeId: Joi.string().uuid().required(),
    roomId: Joi.string().uuid().optional(),
    deviceGroupId: Joi.string().uuid().optional(),
    homeId: Joi.string().uuid().optional(),
    state: Joi.object().default({}),
    metadata: Joi.object().default({}),
  }),

  update: Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    roomId: Joi.string().uuid().optional().allow(null),
    deviceGroupId: Joi.string().uuid().optional().allow(null),
    state: Joi.object().optional(),
    metadata: Joi.object().optional(),
    status: Joi.string().valid('ONLINE', 'OFFLINE', 'UNKNOWN').optional(),
  }),

  command: Joi.object({
    action: Joi.string().required(),
    params: Joi.object().default({}),
  }),
};

export const deviceShareSchemas = {
  create: Joi.object({
    userId: Joi.string().uuid().required(),
    canControl: Joi.boolean().default(false),
    expiresAt: Joi.date().optional(),
  }),
};
