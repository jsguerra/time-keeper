import { DatabaseSync } from 'node:sqlite';

export function openDatabase(path: string): DatabaseSync {
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      ratePence INTEGER NOT NULL CHECK (ratePence >= 0)
    );
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      client TEXT NOT NULL DEFAULT '',
      ratePence INTEGER CHECK (ratePence >= 0),
      color TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY,
      userId INTEGER NOT NULL REFERENCES users(id),
      projectId INTEGER NOT NULL REFERENCES projects(id),
      description TEXT NOT NULL,
      startedAt TEXT NOT NULL,
      endedAt TEXT,
      ratePence INTEGER NOT NULL CHECK (ratePence >= 0),
      CHECK (endedAt IS NULL OR endedAt > startedAt)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS single_running_timer
      ON entries ((1)) WHERE endedAt IS NULL;
  `);
  return db;
}
