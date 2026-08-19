import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type {
  OperationDetail,
  OperationItem,
  OperationRecord,
  OperationStatus,
  OperationType
} from '@shared/types';

interface OperationRow {
  id: string;
  type: OperationType;
  status: OperationStatus;
  created_at: string;
  completed_at: string | null;
  summary: string;
}

interface OperationItemRow {
  id: string;
  operation_id: string;
  source_path: string;
  destination_path: string | null;
  size_bytes: number;
  status: OperationStatus;
  error_message: string | null;
}

function rowToItem(row: OperationItemRow): OperationItem {
  return {
    id: row.id,
    operationId: row.operation_id,
    sourcePath: row.source_path,
    destinationPath: row.destination_path,
    sizeBytes: row.size_bytes,
    status: row.status,
    errorMessage: row.error_message
  };
}

export class OperationRepository {
  constructor(private readonly db: Database.Database) {}

  create(
    id: string,
    type: OperationType,
    summary: string,
    items: { sourcePath: string; destinationPath: string | null; sizeBytes: number }[]
  ): void {
    const createdAt = new Date().toISOString();
    const insertOp = this.db.prepare(
      'INSERT INTO operations (id, type, status, created_at, summary) VALUES (?, ?, ?, ?, ?)'
    );
    const insertItem = this.db.prepare(`
      INSERT INTO operation_items (id, operation_id, source_path, destination_path, size_bytes, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const tx = this.db.transaction(() => {
      insertOp.run(id, type, 'pending' satisfies OperationStatus, createdAt, summary);
      for (const item of items) {
        insertItem.run(
          randomUUID(),
          id,
          item.sourcePath,
          item.destinationPath,
          item.sizeBytes,
          'pending' satisfies OperationStatus
        );
      }
    });
    tx();
  }

  markItemStatus(
    itemId: string,
    status: OperationStatus,
    errorMessage?: string,
    destinationPath?: string
  ): void {
    this.db
      .prepare(
        'UPDATE operation_items SET status = ?, error_message = ?, destination_path = COALESCE(?, destination_path) WHERE id = ?'
      )
      .run(status, errorMessage ?? null, destinationPath ?? null, itemId);
  }

  markOperationStatus(id: string, status: OperationStatus): void {
    const completedAt =
      status === 'completed' || status === 'failed' || status === 'undone'
        ? new Date().toISOString()
        : null;
    this.db
      .prepare(
        'UPDATE operations SET status = ?, completed_at = COALESCE(?, completed_at) WHERE id = ?'
      )
      .run(status, completedAt, id);
  }

  getItems(operationId: string): OperationItem[] {
    const rows = this.db
      .prepare('SELECT * FROM operation_items WHERE operation_id = ? ORDER BY rowid ASC')
      .all(operationId) as OperationItemRow[];
    return rows.map(rowToItem);
  }

  private toRecord(row: OperationRow, items: OperationItem[]): OperationRecord {
    const totalBytes = items.reduce((sum, i) => sum + i.sizeBytes, 0);
    return {
      id: row.id,
      type: row.type,
      status: row.status,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      itemCount: items.length,
      totalBytes,
      canUndo: row.type === 'MOVE' && row.status === 'completed',
      summary: row.summary
    };
  }

  list(limit = 100): OperationRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM operations ORDER BY created_at DESC LIMIT ?')
      .all(limit) as OperationRow[];
    return rows.map((row) => this.toRecord(row, this.getItems(row.id)));
  }

  getDetail(id: string): OperationDetail | null {
    const row = this.db.prepare('SELECT * FROM operations WHERE id = ?').get(id) as
      OperationRow | undefined;
    if (!row) return null;
    const items = this.getItems(id);
    return { ...this.toRecord(row, items), items };
  }
}
