import { ConfigModuleOptions } from '@nestjs/config/dist/interfaces';
import * as Joi from 'joi';

import configuration from './configuration';

export const configModuleOptions: ConfigModuleOptions = {
  envFilePath: '.env',
  load: [configuration],
  validationSchema: Joi.object({
    APP_ENV: Joi.string()
      .valid('development', 'production', 'test')
      .default('development'),
    APP_PORT: Joi.number().required(),
    DATABASE_URL: Joi.string().uri().required(),
    DB_HOST: Joi.string().optional(),
    DB_PORT: Joi.number().optional(),
    DB_NAME: Joi.string().optional(),
    DB_USER: Joi.string().optional(),
    DB_PASS: Joi.string().optional(),
    JWT_PUBLIC_KEY_BASE64: Joi.string().required(),
    JWT_PRIVATE_KEY_BASE64: Joi.string().required(),
    JWT_ACCESS_TOKEN_EXP_IN_SEC: Joi.number().required(),
    JWT_REFRESH_TOKEN_EXP_IN_SEC: Joi.number().required(),
    DEFAULT_ADMIN_USER_EMAIL: Joi.string().email().optional(),
    DEFAULT_ADMIN_USER_USERNAME: Joi.string().optional(),
    DEFAULT_ADMIN_USER_PASSWORD: Joi.string().optional(),
  }),
};
