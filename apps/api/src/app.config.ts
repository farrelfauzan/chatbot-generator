import 'dotenv/config';

export const appConfig = {
  port: Number(process.env.PORT ?? 3001),
  appName: process.env.APP_NAME ?? 'chatbot-api',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '24h',
  },
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },
  session: {
    ttlMinutes: Number(process.env.SESSION_TTL_MINUTES ?? 30),
  },
  llm: {
    provider: process.env.LLM_PROVIDER ?? 'sumopod',
    baseUrl: process.env.LLM_BASE_URL ?? 'https://ai.sumopod.com/v1',
    apiKey: process.env.LLM_API_KEY ?? '',
    model: process.env.LLM_MODEL ?? 'gemini/gemini-2.5-flash-lite',
    maxTokens: Number(process.env.LLM_MAX_TOKENS ?? 2048),
    temperature: Number(process.env.LLM_TEMPERATURE ?? 0.7),
  },
  gowa: {
    baseUrl: process.env.GOWA_BASE_URL ?? 'http://localhost:3000',
    basicAuth: process.env.GOWA_BASIC_AUTH ?? '',
    webhookSecret: process.env.GOWA_WEBHOOK_SECRET ?? '',
    deviceId: process.env.GOWA_DEVICE_ID ?? '',
  },
  s3: {
    region: process.env.AWS_REGION ?? 'ap-southeast-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    bucket: process.env.S3_BUCKET_NAME ?? 'performa-assets',
    prefix: process.env.S3_PREFIX ?? 'chatbot-catalog-images',
  },
  doku: {
    clientId: process.env.DOKU_CLIENT_ID ?? '',
    secretKey: process.env.DOKU_SECRET_KEY ?? '',
    baseUrl: process.env.DOKU_BASE_URL ?? 'https://api-sandbox.doku.com',
  },
};
