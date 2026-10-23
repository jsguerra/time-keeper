import type { TimeRepository } from './repository.js';

export class AppError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export interface EntryInput {
  userId: number;
  projectId: number;
  description: string;
}

export class TimeService {
  constructor(private readonly repository: TimeRepository, private readonly now: () => Date = () => new Date()) {}

  createEntry(input: EntryInput, dates?: { startedAt: string; endedAt: string }) {
    const data = this.repository.getData();
    const user = data.users.find(user => user.id === input.userId);
    const project = data.projects.find(project => project.id === input.projectId);
    if (!user || !project) throw new AppError(400, 'Choose an existing person and project.');
    if (!dates && data.entries.some(entry => entry.endedAt === null)) {
      throw new AppError(409, 'Stop the running timer before starting another.');
    }
    const now = this.now();
    if (dates && (Date.parse(dates.endedAt) <= Date.parse(dates.startedAt) || Date.parse(dates.endedAt) > now.getTime())) {
      throw new AppError(400, 'End time must be after start time and cannot be in the future.');
    }
    return this.repository.addEntry({
      ...input,
      startedAt: dates ? new Date(dates.startedAt).toISOString() : now.toISOString(),
      endedAt: dates ? new Date(dates.endedAt).toISOString() : null,
      ratePence: project.ratePence ?? user.ratePence,
    });
  }

  stopTimer(id: number) {
    const entry = this.repository.getData().entries.find(entry => entry.id === id);
    if (!entry || entry.endedAt !== null) throw new AppError(409, 'This timer is no longer running.');
    const endedAt = this.now().toISOString();
    if (endedAt <= entry.startedAt) throw new AppError(409, 'The clock must be after the timer start. Try again shortly.');
    if (!this.repository.stopEntry(id, endedAt)) throw new AppError(409, 'This timer is no longer running.');
  }
}
