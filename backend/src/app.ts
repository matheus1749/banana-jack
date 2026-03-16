import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerRoutes } from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function buildApp() {
  const app = Fastify({ logger: true });
  const uploadDir = path.resolve(process.cwd(), 'src', 'uploads');
  mkdirSync(uploadDir, { recursive: true });

  // Serve frontend static files in production
  const frontendDist = path.resolve(__dirname, '../../frontend/dist');
  const hasFrontend = existsSync(frontendDist);
  app.log.info(`Frontend dist path: ${frontendDist}, exists: ${hasFrontend}`);

  app.register(cors, {
    origin: (origin, cb) => {
      const configured = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
      if (!origin) {
        cb(null, true);
        return;
      }

      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
      if (origin === configured || isLocalhost) {
        cb(null, true);
        return;
      }

      cb(new Error('Origin not allowed by CORS'), false);
    },
    credentials: true,
  });

  app.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'change-me',
    sign: { expiresIn: '30m' },
  });

  app.register(multipart, {
    limits: { fileSize: 8 * 1024 * 1024 },
  });
  app.register(fastifyStatic, {
    root: uploadDir,
    prefix: '/files/',
  });

  // Serve frontend if built
  if (hasFrontend) {
    app.register(fastifyStatic, {
      root: frontendDist,
      prefix: '/',
      decorateReply: false,
    });

    // SPA fallback
    app.setNotFoundHandler((_req, reply) => {
      reply.sendFile('index.html', frontendDist);
    });
  }

  app.decorate('authenticate', async function authenticate(request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ message: 'Unauthorized' });
    }
  });

  app.register(registerRoutes, { prefix: '/api/v1' });
  app.decorate('uploadDir', uploadDir);

  app.get('/health', async () => ({ ok: true }));

  return app;
}
