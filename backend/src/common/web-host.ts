import type { NestExpressApplication } from '@nestjs/platform-express';
import { static as serveStatic } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Enabled only in the combined release image; local Vite development stays separate.
export function hostWeb(app: NestExpressApplication) {
  if (!process.env.WEB_DIST_DIR) return;
  const directory = resolve(process.env.WEB_DIST_DIR);
  const index = resolve(directory, 'index.html');
  if (!existsSync(index))
    throw new Error('Không tìm thấy bản build giao diện.');
  const assets = serveStatic(directory, { index: false, maxAge: '1d' });
  app.use((request: Request, _response: Response, next: NextFunction) => {
    if (request.url === '/api') request.url = '/';
    else if (request.url.startsWith('/api/'))
      request.url = request.url.slice(4);
    next();
  });
  app.use((request: Request, response: Response, next: NextFunction) => {
    const api =
      request.originalUrl === '/api' || request.originalUrl.startsWith('/api/');
    if (api || !['GET', 'HEAD'].includes(request.method)) return next();
    assets(request, response, (error?: unknown) => {
      if (error) return next(error);
      if (
        request.path === '/' ||
        request.headers.accept?.includes('text/html')
      ) {
        response.setHeader('Cache-Control', 'no-cache');
        response.sendFile(index, (sendError) => {
          if (sendError) next(sendError);
        });
      } else next();
    });
  });
}
