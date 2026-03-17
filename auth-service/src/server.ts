import app from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { redis } from './config/redis';

const server = app.listen(env.PORT, () => {
  console.log(`🚀 Auth Service running on port ${env.PORT}`);
  console.log(`📝 Environment: ${env.NODE_ENV}`);
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  server.close(async () => {
    console.log('🔌 HTTP server closed');

    await prisma.$disconnect();
    console.log('🔌 Prisma disconnected');

    redis.disconnect();
    console.log('🔌 Redis disconnected');

    process.exit(0);
  });

  // Force close after 10s
  setTimeout(() => {
    console.error('⚠️ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
