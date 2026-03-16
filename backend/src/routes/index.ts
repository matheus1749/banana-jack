import type { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.js';
import { categoryRoutes } from './categories.js';
import { supplierRoutes } from './suppliers.js';
import { purchaseRoutes } from './purchases.js';
import { dashboardRoutes } from './dashboard.js';
import { uploadRoutes } from './uploads.js';
import { exportRoutes } from './exports.js';
import { reportRoutes } from './reports.js';
import { alertRoutes } from './alerts.js';
import { goalRoutes } from './goals.js';

export async function registerRoutes(app: FastifyInstance) {
  app.register(authRoutes, { prefix: '/auth' });
  app.register(categoryRoutes, { prefix: '/categories' });
  app.register(supplierRoutes, { prefix: '/suppliers' });
  app.register(purchaseRoutes, { prefix: '/purchases' });
  app.register(dashboardRoutes, { prefix: '/dashboard' });
  app.register(reportRoutes, { prefix: '/reports' });
  app.register(alertRoutes, { prefix: '/alerts' });
  app.register(goalRoutes, { prefix: '/goals' });
  app.register(uploadRoutes, { prefix: '/uploads' });
  app.register(exportRoutes, { prefix: '/exports' });
}
