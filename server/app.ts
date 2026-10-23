import express, { type ErrorRequestHandler } from 'express';
import { z } from 'zod';
import type { TimeRepository } from './repository.js';
import { AppError, TimeService } from './service.js';

const rate = z.number().int().min(0).max(100_000_000);
const name = z.string().trim().min(1).max(100);
const idSchema = z.coerce.number().int().positive();
const userSchema = z.object({ name, ratePence: rate });
const projectSchema = z.object({
  name, client: z.string().trim().max(100),
  ratePence: rate.nullable(), color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
const entrySchema = z.object({
  userId: z.number().int().positive(),
  projectId: z.number().int().positive(),
  description: z.string().trim().max(500),
});
const manualSchema = entrySchema.extend({
  startedAt: z.iso.datetime(),
  endedAt: z.iso.datetime(),
});

export function createApp(repository: TimeRepository, now?: () => Date) {
  const app = express();
  const service = new TimeService(repository, now);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));
  // Local-only API: reject browser requests originating on other sites.
  app.use('/api', (req, _res, next) => {
    const origin = req.get('origin');
    const allowedOrigins = new Set([`http://${req.get('host')}`, 'http://127.0.0.1:5173', 'http://localhost:5173']);
    if (origin && !allowedOrigins.has(origin)) {
      throw new AppError(403, 'Cross-site requests are not permitted.');
    }
    next();
  });
  app.get('/api/data', (_req, res) => res.json(repository.getData()));
  app.post('/api/users', (req, res) => res.status(201).json(repository.saveUser(userSchema.parse(req.body))));
  app.put('/api/users/:id', (req, res) => {
    const user = repository.saveUser(userSchema.parse(req.body), idSchema.parse(req.params.id));
    if (!user) throw new AppError(404, 'Person not found.');
    res.json(user);
  });
  app.post('/api/projects', (req, res) => res.status(201).json(repository.saveProject(projectSchema.parse(req.body))));
  app.put('/api/projects/:id', (req, res) => {
    const project = repository.saveProject(projectSchema.parse(req.body), idSchema.parse(req.params.id));
    if (!project) throw new AppError(404, 'Project not found.');
    res.json(project);
  });
  app.post('/api/entries', (req, res) => {
    const input = manualSchema.parse(req.body);
    res.status(201).json(service.createEntry(input, input));
  });
  app.post('/api/timer', (req, res) => res.status(201).json(service.createEntry(entrySchema.parse(req.body))));
  app.post('/api/timer/:id/stop', (req, res) => {
    service.stopTimer(idSchema.parse(req.params.id));
    res.status(204).end();
  });
  app.delete('/api/entries/:id', (req, res) => {
    if (!repository.deleteEntry(idSchema.parse(req.params.id))) throw new AppError(404, 'Completed entry not found. Stop running timers before deleting.');
    res.status(204).end();
  });
  app.use('/api', (_req, _res) => { throw new AppError(404, 'API endpoint not found.'); });
  const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ') });
    } else if (error instanceof AppError) {
      res.status(error.status).json({ error: error.message });
    } else if (error instanceof SyntaxError && 'body' in error) {
      res.status(400).json({ error: 'Request must contain valid JSON.' });
    } else {
      console.error('API request failed:', error);
      res.status(500).json({ error: 'An unexpected database or server error occurred. Please try again.' });
    }
  };
  app.use(errorHandler);
  return app;
}
