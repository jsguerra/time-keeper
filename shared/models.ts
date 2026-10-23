export interface User {
  id: number;
  name: string;
  ratePence: number;
}

export interface Project {
  id: number;
  name: string;
  client: string;
  ratePence: number | null;
  color: string;
}

export interface TimeEntry {
  id: number;
  userId: number;
  projectId: number;
  description: string;
  startedAt: string;
  endedAt: string | null;
  ratePence: number;
}

export interface AppData {
  users: User[];
  projects: Project[];
  entries: TimeEntry[];
}

export function durationSeconds(entry: TimeEntry, now = Date.now()): number {
  return Math.max(0, Math.floor(((entry.endedAt ? Date.parse(entry.endedAt) : now) - Date.parse(entry.startedAt)) / 1000));
}

export function costPence(seconds: number, ratePence: number): number {
  return Math.round(seconds * ratePence / 3600);
}
