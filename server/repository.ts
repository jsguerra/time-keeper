import type { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import type { AppData, Project, TimeEntry, User } from '../shared/models.js';

const userRow = z.object({ id: z.number(), name: z.string(), ratePence: z.number() });
const projectRow = z.object({ id: z.number(), name: z.string(), client: z.string(), ratePence: z.number().nullable(), color: z.string() });
const entryRow = z.object({
  id: z.number(), userId: z.number(), projectId: z.number(), description: z.string(),
  startedAt: z.string(), endedAt: z.string().nullable(), ratePence: z.number(),
});

export interface TimeRepository {
  getData(): AppData;
  saveUser(user: Omit<User, 'id'>, id?: number): User | undefined;
  saveProject(project: Omit<Project, 'id'>, id?: number): Project | undefined;
  addEntry(entry: Omit<TimeEntry, 'id'>): TimeEntry;
  stopEntry(id: number, endedAt: string): boolean;
  deleteEntry(id: number): boolean;
}

export class SqliteTimeRepository implements TimeRepository {
  constructor(private readonly db: DatabaseSync) {}

  getData(): AppData {
    return {
      users: userRow.array().parse(this.db.prepare('SELECT * FROM users ORDER BY name COLLATE NOCASE').all()),
      projects: projectRow.array().parse(this.db.prepare('SELECT * FROM projects ORDER BY name COLLATE NOCASE').all()),
      entries: entryRow.array().parse(this.db.prepare('SELECT * FROM entries ORDER BY startedAt DESC, id DESC').all()),
    };
  }

  saveUser(user: Omit<User, 'id'>, id?: number): User | undefined {
    if (id !== undefined) {
      const result = this.db.prepare('UPDATE users SET name=?, ratePence=? WHERE id=?').run(user.name, user.ratePence, id);
      return result.changes ? { ...user, id } : undefined;
    }
    const result = this.db.prepare('INSERT INTO users (name, ratePence) VALUES (?, ?)').run(user.name, user.ratePence);
    return { ...user, id: Number(result.lastInsertRowid) };
  }

  saveProject(project: Omit<Project, 'id'>, id?: number): Project | undefined {
    const { name, client, ratePence, color } = project;
    if (id !== undefined) {
      const result = this.db.prepare('UPDATE projects SET name=?, client=?, ratePence=?, color=? WHERE id=?').run(name, client, ratePence, color, id);
      return result.changes ? { ...project, id } : undefined;
    }
    const result = this.db.prepare('INSERT INTO projects (name, client, ratePence, color) VALUES (?, ?, ?, ?)').run(name, client, ratePence, color);
    return { ...project, id: Number(result.lastInsertRowid) };
  }

  addEntry(entry: Omit<TimeEntry, 'id'>): TimeEntry {
    const result = this.db.prepare('INSERT INTO entries (userId, projectId, description, startedAt, endedAt, ratePence) VALUES (?, ?, ?, ?, ?, ?)')
      .run(entry.userId, entry.projectId, entry.description, entry.startedAt, entry.endedAt, entry.ratePence);
    return { ...entry, id: Number(result.lastInsertRowid) };
  }

  stopEntry(id: number, endedAt: string): boolean {
    return Number(this.db.prepare('UPDATE entries SET endedAt=? WHERE id=? AND endedAt IS NULL').run(endedAt, id).changes) > 0;
  }

  deleteEntry(id: number): boolean {
    return Number(this.db.prepare('DELETE FROM entries WHERE id=? AND endedAt IS NOT NULL').run(id).changes) > 0;
  }
}
