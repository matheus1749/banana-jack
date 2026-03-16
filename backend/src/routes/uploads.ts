import type { FastifyInstance } from 'fastify';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export async function uploadRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.post('/invoice', async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ message: 'File is required' });
    }

    const isValidType = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(file.mimetype);
    if (!isValidType) {
      return reply.code(400).send({ message: 'Unsupported file type' });
    }

    const extension = path.extname(file.filename) || (file.mimetype === 'application/pdf' ? '.pdf' : '.jpg');
    const filename = `${randomUUID()}${extension}`;
    const filePath = path.join(app.uploadDir, filename);

    await pipeline(file.file, createWriteStream(filePath));

    const host = request.headers.host;
    const protocol = (request.headers['x-forwarded-proto'] as string | undefined) ?? 'http';
    const fileUrl = `${protocol}://${host}/files/${filename}`;

    return reply.code(201).send({ fileUrl, filename });
  });
}
