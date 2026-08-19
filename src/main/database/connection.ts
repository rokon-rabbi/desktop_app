import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import Database from 'better-sqlite3';
import { app } from 'electron';
import { logger } from '@main/safety/logger';
import { runMigrations } from './migrations';

let db: Database.Database | null = null;

/** Opens (or returns the already-open) singleton SQLite connection. */
export function getDatabase(): Database.Database {
  if (db) return db;

  const userDataDir = app.getPath('userData');
  mkdirSync(userDataDir, { recursive: true });
  const dbPath = join(userDataDir, 'cleanspace.sqlite');

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');

  runMigrations(db);
  logger.info('database', 'Database ready', { module: 'database' });

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
