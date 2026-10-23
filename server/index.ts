import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import express from 'express';
import { openDatabase } from './database.js';
import { SqliteTimeRepository } from './repository.js';
import { createApp } from './app.js';

const dataDirectory = resolve('data');
mkdirSync(dataDirectory, { recursive: true });
const db = openDatabase(process.env.TIMEKEEPER_DB ?? resolve(dataDirectory, 'timekeeper.sqlite'));
const app = createApp(new SqliteTimeRepository(db));
const clientDirectory = resolve('dist', 'client');
app.use(express.static(clientDirectory));
app.get('/{*path}', (_req, res) => res.sendFile(resolve(clientDirectory, 'index.html')));
const server = app.listen(3001, '127.0.0.1', () => {
  console.log('Timekeeper API ready at http://127.0.0.1:3001');
});
function shutdown() {
  server.close(() => { db.close(); });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
