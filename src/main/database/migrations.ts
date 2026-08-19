import type Database from 'better-sqlite3';
import { logger } from '@main/safety/logger';

interface Migration {
  version: number;
  name: string;
  sql: string;
}

/**
 * Ordered, additive schema migrations. Never edit a past entry once it has
 * shipped — append a new one instead, per context.md §14 ("use schema
 * migrations").
 */
const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    sql: `
      CREATE TABLE scans (
        id TEXT PRIMARY KEY,
        root_path TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        file_count INTEGER NOT NULL DEFAULT 0,
        total_bytes INTEGER NOT NULL DEFAULT 0,
        error_message TEXT
      );

      CREATE TABLE files (
        id TEXT PRIMARY KEY,
        scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
        path TEXT NOT NULL,
        filename TEXT NOT NULL,
        extension TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        category TEXT NOT NULL,
        parent_folder TEXT NOT NULL,
        created_at TEXT NOT NULL,
        modified_at TEXT NOT NULL,
        accessed_at TEXT NOT NULL,
        is_symlink INTEGER NOT NULL DEFAULT 0,
        partial_hash TEXT,
        full_hash TEXT
      );
      CREATE INDEX idx_files_scan ON files(scan_id);
      CREATE INDEX idx_files_scan_size ON files(scan_id, size_bytes);
      CREATE INDEX idx_files_scan_category ON files(scan_id, category);
      CREATE UNIQUE INDEX idx_files_scan_path ON files(scan_id, path);

      CREATE TABLE operations (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        completed_at TEXT,
        summary TEXT NOT NULL
      );

      CREATE TABLE operation_items (
        id TEXT PRIMARY KEY,
        operation_id TEXT NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
        source_path TEXT NOT NULL,
        destination_path TEXT,
        size_bytes INTEGER NOT NULL,
        status TEXT NOT NULL,
        error_message TEXT
      );
      CREATE INDEX idx_operation_items_operation ON operation_items(operation_id);

      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `
  }
];

export function runMigrations(db: Database.Database): void {
  db.exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)'
  );

  const appliedVersions = new Set(
    (db.prepare('SELECT version FROM schema_migrations').all() as { version: number }[]).map(
      (row) => row.version
    )
  );

  const pending = MIGRATIONS.filter((m) => !appliedVersions.has(m.version)).sort(
    (a, b) => a.version - b.version
  );

  for (const migration of pending) {
    const apply = db.transaction(() => {
      db.exec(migration.sql);
      db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)').run(
        migration.version,
        migration.name,
        new Date().toISOString()
      );
    });
    apply();
    logger.info('database', `Applied migration ${migration.version}: ${migration.name}`);
  }
}
