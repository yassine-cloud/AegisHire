import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required(),
  SUPABASE_URL: Joi.string().uri().required(),
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .required(),
  WORKER_BASE_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required(),
  SUPABASE_JWKS_URL: Joi.string().uri().optional().allow(''),
  SUPABASE_JWT_ISSUER: Joi.string().optional().allow(''),
  SUPABASE_JWT_AUDIENCE: Joi.string().optional().allow(''),
  SUPABASE_JWT_SECRET: Joi.string().optional().allow(''),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().optional().allow(''),
  API_BASE_URL: Joi.string().uri({ scheme: ['http', 'https'] }).optional(),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').optional(),
  PORT: Joi.number().port().optional(),
}).unknown(true);
