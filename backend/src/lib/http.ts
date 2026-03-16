import type { FastifyReply, FastifyRequest } from 'fastify';

export function getTenantId(request: FastifyRequest): string {
  const tenantId = request.headers['x-tenant-id'];
  if (!tenantId || Array.isArray(tenantId)) {
    throw new Error('x-tenant-id header is required');
  }
  return tenantId;
}

export function badRequest(reply: FastifyReply, message: string) {
  return reply.code(400).send({ message });
}
