import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { openDatabase } from './database.js';
import { SqliteTimeRepository } from './repository.js';
import { createApp } from './app.js';
import { costPence, durationSeconds, type AppData, type TimeEntry } from '../shared/models.js';

describe('SQLite-backed timekeeper API', () => {
  let db: DatabaseSync;
  let app: ReturnType<typeof createApp>;
  let now: Date;
  beforeEach(async () => {
    db = openDatabase(':memory:');
    now = new Date('2026-10-23T16:00:00.000Z');
    app = createApp(new SqliteTimeRepository(db), () => now);
    await request(app).post('/api/users').send({ name: 'Alex Morgan', ratePence: 4500 }).expect(201);
    await request(app).post('/api/projects').send({ name: 'Brand design', client: 'Studio', ratePence: 7500, color: '#759568' }).expect(201);
  });
  afterEach(() => db.close());
  const input = { userId: 1, projectId: 1, description: 'Research' };
  const dates = { startedAt: '2026-10-23T10:00:00.000Z', endedAt: '2026-10-23T11:30:00.000Z' };

  async function data(): Promise<AppData> {
    return (await request(app).get('/api/data').expect(200)).body;
  }
  it('creates trimmed profiles and projects', async () => {
    await request(app).post('/api/users').send({ name: '  Jamie  ', ratePence: 0 }).expect(201);
    const result = await data();
    expect(result.users.map(user => user.name)).toEqual(['Alex Morgan', 'Jamie']);
    expect(result.projects[0].client).toBe('Studio');
  });
  it('uses the project rate, records exact duration and computes GBP cost', async () => {
    const response = await request(app).post('/api/entries').send({ ...input, ...dates }).expect(201);
    const entry: TimeEntry = response.body;
    expect(entry.ratePence).toBe(7500);
    expect(durationSeconds(entry)).toBe(5400);
    expect(costPence(durationSeconds(entry), entry.ratePence)).toBe(11250);
  });
  it('normalizes valid ISO timestamps with different precision before storing', async () => {
    const response = await request(app).post('/api/entries').send({
      ...input, startedAt: '2026-10-23T10:00:00Z', endedAt: '2026-10-23T10:00:00.500Z',
    }).expect(201);
    expect(response.body.startedAt).toBe('2026-10-23T10:00:00.000Z');
    expect(response.body.endedAt).toBe('2026-10-23T10:00:00.500Z');
  });
  it('falls back to the person rate when project rate is unset', async () => {
    await request(app).put('/api/projects/1').send({ name: 'Brand design', client: '', ratePence: null, color: '#759568' }).expect(200);
    const response = await request(app).post('/api/entries').send({ ...input, ...dates }).expect(201);
    expect(response.body.ratePence).toBe(4500);
  });
  it('treats a zero project rate as an explicit override', async () => {
    await request(app).put('/api/projects/1').send({ name: 'Pro bono', client: '', ratePence: 0, color: '#759568' }).expect(200);
    const response = await request(app).post('/api/entries').send({ ...input, ...dates }).expect(201);
    expect(response.body.ratePence).toBe(0);
  });
  it('preserves historical rates after project and person edits', async () => {
    await request(app).post('/api/entries').send({ ...input, ...dates }).expect(201);
    await request(app).put('/api/projects/1').send({ name: 'Updated project', client: '', ratePence: 10000, color: '#759568' }).expect(200);
    await request(app).put('/api/users/1').send({ name: 'Alex', ratePence: 9000 }).expect(200);
    expect((await data()).entries[0].ratePence).toBe(7500);
    const next = await request(app).post('/api/entries').send({ ...input, ...dates }).expect(201);
    expect(next.body.ratePence).toBe(10000);
  });
  it('enforces one running timer, permits manual entries alongside it and stops once', async () => {
    const response = await request(app).post('/api/timer').send(input).expect(201);
    expect(response.body.startedAt).toBe(now.toISOString());
    await request(app).post('/api/timer').send(input).expect(409);
    await request(app).delete(`/api/entries/${response.body.id}`).expect(404);
    await request(app).post('/api/entries').send({ ...input, ...dates }).expect(201);
    now = new Date('2026-10-23T17:30:00.000Z');
    await request(app).post(`/api/timer/${response.body.id}/stop`).expect(204);
    await request(app).post(`/api/timer/${response.body.id}/stop`).expect(409);
    const stopped = (await data()).entries.find(entry => entry.id === response.body.id)!;
    expect(durationSeconds(stopped)).toBe(5400);
  });
  it('takes the running rate snapshot at start rather than stop', async () => {
    const response = await request(app).post('/api/timer').send(input).expect(201);
    await request(app).put('/api/projects/1').send({ name: 'Design', client: '', ratePence: 12000, color: '#759568' }).expect(200);
    now = new Date(now.getTime() + 3600000);
    await request(app).post(`/api/timer/${response.body.id}/stop`).expect(204);
    expect((await data()).entries[0].ratePence).toBe(7500);
  });
  it.each([
    { ...dates, endedAt: dates.startedAt },
    { ...dates, endedAt: '2026-10-23T09:00:00.000Z' },
    { ...dates, endedAt: '2026-10-24T12:00:00.000Z' },
    { ...dates, startedAt: 'not-a-date' },
    { ...dates, startedAt: '2026-02-30T12:00:00.000Z' },
  ])('rejects invalid manual dates: %j', async invalid => {
    const response = await request(app).post('/api/entries').send({ ...input, ...invalid }).expect(400);
    expect(response.body.error).toBeTruthy();
    expect((await data()).entries).toHaveLength(0);
  });
  it('rejects missing relations and invalid rates or names', async () => {
    await request(app).post('/api/timer').send({ ...input, userId: 999 }).expect(400);
    for (const ratePence of [-1, 0.5, '50', 100000001]) {
      await request(app).post('/api/users').send({ name: 'Test', ratePence }).expect(400);
    }
    await request(app).post('/api/users').send({ name: '  ', ratePence: 100 }).expect(400);
    await request(app).post('/api/projects').send({ name: 'Test', client: '', ratePence: 100, color: 'red' }).expect(400);
  });
  it('returns explicit not-found and malformed JSON errors', async () => {
    await request(app).put('/api/users/999').send({ name: 'Test', ratePence: 0 }).expect(404);
    await request(app).put('/api/projects/999').send({ name: 'Test', client: '', ratePence: null, color: '#759568' }).expect(404);
    await request(app).get('/api/missing').expect(404);
    await request(app).post('/api/users').type('json').send('{broken').expect(400);
    await request(app).delete('/api/entries/no-id').expect(400);
  });
  it('deletes completed entries from persisted reports', async () => {
    const response = await request(app).post('/api/entries').send({ ...input, ...dates }).expect(201);
    await request(app).delete(`/api/entries/${response.body.id}`).expect(204);
    expect((await data()).entries).toHaveLength(0);
  });
  it('rejects browser requests from unrelated origins', async () => {
    await request(app).post('/api/timer').set('Origin', 'https://untrusted.example').send(input).expect(403);
    await request(app).post('/api/timer').set('Origin', 'http://localhost:9999').send(input).expect(403);
    await request(app).post('/api/timer').set('Origin', 'http://127.0.0.1:5173').send(input).expect(201);
  });
  it('handles a backward clock without losing the running timer', async () => {
    const response = await request(app).post('/api/timer').send(input).expect(201);
    now = new Date(now.getTime() - 1000);
    await request(app).post(`/api/timer/${response.body.id}/stop`).expect(409);
    expect((await data()).entries[0].endedAt).toBeNull();
  });
});

it('persists profiles, projects, running timers and rate snapshots across database reopen', () => {
  const directory = mkdtempSync(join(tmpdir(), 'timekeeper-test-'));
  const path = join(directory, 'test.sqlite');
  const first = openDatabase(path);
  try {
    const repository = new SqliteTimeRepository(first);
    repository.saveUser({ name: 'Alex', ratePence: 5000 });
    repository.saveProject({ name: 'Test', client: '', ratePence: null, color: '#759568' });
    repository.addEntry({ userId: 1, projectId: 1, description: '', startedAt: '2026-10-23T12:00:00.000Z', endedAt: null, ratePence: 5000 });
  } finally { first.close(); }
  const second = openDatabase(path);
  try {
    const data = new SqliteTimeRepository(second).getData();
    expect(data.users).toHaveLength(1);
    expect(data.projects).toHaveLength(1);
    expect(data.entries[0]).toMatchObject({ endedAt: null, ratePence: 5000 });
    expect(durationSeconds(data.entries[0], Date.parse('2026-10-23T13:00:00.000Z'))).toBe(3600);
  } finally {
    second.close();
    rmSync(directory, { recursive: true });
  }
});
