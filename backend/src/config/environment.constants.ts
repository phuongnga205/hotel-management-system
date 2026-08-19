export const ENVIRONMENT_KEYS = {
  DATABASE_SSL_REJECT_UNAUTHORIZED: 'DATABASE_SSL_REJECT_UNAUTHORIZED',
  DATABASE_URL: 'DATABASE_URL',
  SIGNATURE: 'JWT_SECRET',
  NODE_ENV: 'NODE_ENV',
  PORT: 'PORT',
  TYPEORM_SYNCHRONIZE: 'TYPEORM_SYNCHRONIZE',
  // Base URL của FE, dùng để dựng link kích hoạt tài khoản / đặt lại mật khẩu
  // nhét vào email (vd https://hotel.example.com).
  FRONTEND_URL: 'FRONTEND_URL',
} as const;

export enum NodeEnvironment {
  DEVELOPMENT = 'development',
  TEST = 'test',
}

export const DEFAULT_SERVER_PORT = 3000;
