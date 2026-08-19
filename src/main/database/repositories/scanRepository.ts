import type Database from 'better-sqlite3';
import type { ScanRecord, ScanStatus } from '@shared/types';

interface ScanRow {
  id: string;
  root_path: string;
  status: ScanStatus;
  started_at: string;
  completed_at: string | null;
  file_count: number;
  total_bytes: number;
  error_message: string | null;
}

function rowToScan(row: ScanRow): ScanRecord {
  return {
    id: row.id,
    rootPath: row.root_path,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    fileCount: row.file_count,
    totalBytes: row.total_bytes,
    errorMessage: row.error_message
  };
}

export class ScanRepository {
  constructor(private readonly db: Database.Database) {}

  create(id: string, rootPath: string): ScanRecord {
    const startedAt = new Date().toISOString();
    this.db
      .prepare(
        'INSERT INTO scans (id, root_path, status, started_at, file_count, total_bytes) VALUES (?, ?, ?, ?, 0, 0)'
      )
      .run(id, rootPath, 'running' satisfies ScanStatus, startedAt);
    return {
      id,
      rootPath,
      status: 'running',
      startedAt,
      completedAt: null,
      fileCount: 0,
      totalBytes: 0,
      errorMessage: null
    };
  }

  updateProgress(id: string, fileCount: number, totalBytes: number): void {
    this.db
      .prepare('UPDATE scans SET file_count = ?, total_bytes = ? WHERE id = ?')
      .run(fileCount, totalBytes, id);
  }

  complete(
    id: string,
    status: Extract<ScanStatus, 'completed' | 'cancelled' | 'error'>,
    errorMessage?: string
  ): void {
    this.db
      .prepare('UPDATE scans SET status = ?, completed_at = ?, error_message = ? WHERE id = ?')
      .run(status, new Date().toISOString(), errorMessage ?? null, id);
  }

  findById(id: string): ScanRecord | null {
    const row = this.db.prepare('SELECT * FROM scans WHERE id = ?').get(id) as ScanRow | undefined;
    return row ? rowToScan(row) : null;
  }

  list(limit = 50): ScanRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM scans ORDER BY started_at DESC LIMIT ?')
      .all(limit) as ScanRow[];
    return rows.map(rowToScan);
  }
}
