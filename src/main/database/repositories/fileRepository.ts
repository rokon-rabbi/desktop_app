import type Database from 'better-sqlite3';
import type {
  CategoryTotal,
  FileCategory,
  ScanFilesQuery,
  ScanFilesResult,
  ScannedFile,
  StorageAnalytics
} from '@shared/types';

export interface ScannedFileInsert {
  id: string;
  scanId: string;
  path: string;
  filename: string;
  extension: string;
  sizeBytes: number;
  category: FileCategory;
  parentFolder: string;
  createdAt: string;
  modifiedAt: string;
  accessedAt: string;
  isSymlink: boolean;
}

interface FileRow {
  id: string;
  scan_id: string;
  path: string;
  filename: string;
  extension: string;
  size_bytes: number;
  category: FileCategory;
  parent_folder: string;
  created_at: string;
  modified_at: string;
  accessed_at: string;
  is_symlink: number;
  partial_hash: string | null;
  full_hash: string | null;
}

function rowToFile(row: FileRow): ScannedFile {
  return {
    id: row.id,
    scanId: row.scan_id,
    path: row.path,
    filename: row.filename,
    extension: row.extension,
    sizeBytes: row.size_bytes,
    category: row.category,
    parentFolder: row.parent_folder,
    createdAt: row.created_at,
    modifiedAt: row.modified_at,
    accessedAt: row.accessed_at,
    isSymlink: row.is_symlink === 1
  };
}

const BATCH_SIZE = 500;

export class FileRepository {
  constructor(private readonly db: Database.Database) {}

  insertMany(files: ScannedFileInsert[]): void {
    if (files.length === 0) return;

    const insert = this.db.prepare(`
      INSERT OR IGNORE INTO files
        (id, scan_id, path, filename, extension, size_bytes, category, parent_folder, created_at, modified_at, accessed_at, is_symlink)
      VALUES (@id, @scanId, @path, @filename, @extension, @sizeBytes, @category, @parentFolder, @createdAt, @modifiedAt, @accessedAt, @isSymlink)
    `);

    const insertBatch = this.db.transaction((batch: ScannedFileInsert[]) => {
      for (const file of batch) {
        insert.run({ ...file, isSymlink: file.isSymlink ? 1 : 0 });
      }
    });

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      insertBatch(files.slice(i, i + BATCH_SIZE));
    }
  }

  query(q: ScanFilesQuery): ScanFilesResult {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 100;
    const sortBy = q.sortBy ?? 'name';
    const sortDir = q.sortDir ?? 'asc';

    const sortColumn: Record<NonNullable<ScanFilesQuery['sortBy']>, string> = {
      name: 'filename',
      size: 'size_bytes',
      modified: 'modified_at',
      category: 'category'
    };

    const conditions: string[] = ['scan_id = @scanId'];
    const params: Record<string, unknown> = { scanId: q.scanId };

    if (q.search) {
      conditions.push('filename LIKE @search');
      params['search'] = `%${q.search}%`;
    }
    if (q.category && q.category !== 'All') {
      conditions.push('category = @category');
      params['category'] = q.category;
    }

    const where = conditions.join(' AND ');
    const total = (
      this.db.prepare(`SELECT COUNT(*) as count FROM files WHERE ${where}`).get(params) as {
        count: number;
      }
    ).count;

    const rows = this.db
      .prepare(
        `SELECT * FROM files WHERE ${where} ORDER BY ${sortColumn[sortBy]} COLLATE NOCASE ${sortDir === 'desc' ? 'DESC' : 'ASC'} LIMIT @limit OFFSET @offset`
      )
      .all({ ...params, limit: pageSize, offset: (page - 1) * pageSize }) as FileRow[];

    return { files: rows.map(rowToFile), total, page, pageSize };
  }

  getStorageAnalytics(scanId: string): StorageAnalytics {
    const totals = this.db
      .prepare(
        'SELECT COUNT(*) as fileCount, COALESCE(SUM(size_bytes), 0) as totalBytes FROM files WHERE scan_id = ?'
      )
      .get(scanId) as { fileCount: number; totalBytes: number };

    const categoryRows = this.db
      .prepare(
        'SELECT category, COUNT(*) as fileCount, COALESCE(SUM(size_bytes), 0) as totalBytes FROM files WHERE scan_id = ? GROUP BY category ORDER BY totalBytes DESC'
      )
      .all(scanId) as CategoryTotal[];

    const largestFileRows = this.db
      .prepare('SELECT * FROM files WHERE scan_id = ? ORDER BY size_bytes DESC LIMIT 20')
      .all(scanId) as FileRow[];

    const largestFolderRows = this.db
      .prepare(
        'SELECT parent_folder as folder, COUNT(*) as fileCount, COALESCE(SUM(size_bytes), 0) as totalBytes FROM files WHERE scan_id = ? GROUP BY parent_folder ORDER BY totalBytes DESC LIMIT 15'
      )
      .all(scanId) as { folder: string; fileCount: number; totalBytes: number }[];

    return {
      scanId,
      totalBytes: totals.totalBytes,
      totalFiles: totals.fileCount,
      categoryTotals: categoryRows,
      largestFiles: largestFileRows.map(rowToFile),
      largestFolders: largestFolderRows
    };
  }

  /** Files grouped by size where at least two files share a size — the cheap first pass for duplicate detection. */
  getSizeCandidates(scanId: string): Map<number, ScannedFile[]> {
    const rows = this.db
      .prepare(
        `SELECT * FROM files WHERE scan_id = @scanId AND size_bytes > 0 AND size_bytes IN (
           SELECT size_bytes FROM files WHERE scan_id = @scanId AND size_bytes > 0
           GROUP BY size_bytes HAVING COUNT(*) >= 2
         ) ORDER BY size_bytes DESC`
      )
      .all({ scanId }) as FileRow[];

    const groups = new Map<number, ScannedFile[]>();
    for (const row of rows) {
      const file = rowToFile(row);
      const bucket = groups.get(file.sizeBytes);
      if (bucket) bucket.push(file);
      else groups.set(file.sizeBytes, [file]);
    }
    return groups;
  }

  getAllForScan(scanId: string): ScannedFile[] {
    const rows = this.db.prepare('SELECT * FROM files WHERE scan_id = ?').all(scanId) as FileRow[];
    return rows.map(rowToFile);
  }

  getByPaths(scanId: string, paths: string[]): ScannedFile[] {
    if (paths.length === 0) return [];
    const placeholders = paths.map(() => '?').join(',');
    const rows = this.db
      .prepare(`SELECT * FROM files WHERE scan_id = ? AND path IN (${placeholders})`)
      .all(scanId, ...paths) as FileRow[];
    return rows.map(rowToFile);
  }

  /**
   * Updates the cached path for every scan snapshot that references it
   * (not just the current one) — a file that moved on disk is stale in
   * every historical scan row that pointed at its old location.
   */
  updatePath(oldPath: string, newPath: string): void {
    this.db
      .prepare('UPDATE files SET path = ?, filename = ? WHERE path = ?')
      .run(newPath, newPath.split('/').pop() ?? newPath, oldPath);
  }

  removeByPath(path: string): void {
    this.db.prepare('DELETE FROM files WHERE path = ?').run(path);
  }
}
