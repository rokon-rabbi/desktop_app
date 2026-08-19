import type { FILE_CATEGORIES } from '@shared/constants';

export type FileCategory = (typeof FILE_CATEGORIES)[number];

export type ScanStatus = 'running' | 'completed' | 'cancelled' | 'error';

export interface ScanRecord {
  id: string;
  rootPath: string;
  status: ScanStatus;
  startedAt: string;
  completedAt: string | null;
  fileCount: number;
  totalBytes: number;
  errorMessage: string | null;
}

export interface ScannedFile {
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

export interface ScanProgress {
  scanId: string;
  filesScanned: number;
  bytesScanned: number;
  currentPath: string;
  directoriesSkipped: number;
  errorsCount: number;
  done: boolean;
}

export interface ScanFilesQuery {
  scanId: string;
  search?: string;
  category?: FileCategory | 'All';
  sortBy?: 'name' | 'size' | 'modified' | 'category';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface ScanFilesResult {
  files: ScannedFile[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CategoryTotal {
  category: FileCategory;
  fileCount: number;
  totalBytes: number;
}

export interface StorageAnalytics {
  scanId: string;
  totalBytes: number;
  totalFiles: number;
  categoryTotals: CategoryTotal[];
  largestFiles: ScannedFile[];
  largestFolders: { folder: string; totalBytes: number; fileCount: number }[];
}

export interface DuplicateGroup {
  id: string;
  sizeBytes: number;
  hash: string;
  files: ScannedFile[];
  wastedBytes: number;
}

export interface DuplicateScanProgress {
  scanId: string;
  stage: 'grouping' | 'partial-hash' | 'full-hash' | 'done';
  processed: number;
  total: number;
}

export type CleanupRisk = 'safe' | 'review' | 'important';

export interface CleanupCandidate {
  id: string;
  scanId: string;
  path: string;
  sizeBytes: number;
  reason: string;
  risk: CleanupRisk;
  category: FileCategory;
  kind: 'duplicate' | 'old-installer' | 'old-archive' | 'large-unused';
}

export interface CleanupPlanRequest {
  scanId: string;
  targetBytes: number;
}

export interface CleanupPlanGroup {
  kind: CleanupCandidate['kind'];
  label: string;
  candidates: CleanupCandidate[];
  totalBytes: number;
}

export interface CleanupPlan {
  targetBytes: number;
  achievedBytes: number;
  metTarget: boolean;
  selected: CleanupCandidate[];
  groups: CleanupPlanGroup[];
}

export interface OrganizeMove {
  id: string;
  sourcePath: string;
  destinationPath: string;
  category: FileCategory;
  reason: string;
  sizeBytes: number;
  collision: boolean;
}

export interface OrganizePreview {
  scanId: string;
  moves: OrganizeMove[];
  skipped: { path: string; reason: string }[];
}

export type OperationType = 'MOVE' | 'TRASH' | 'RESTORE';
export type OperationStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'undone';

export interface OperationItem {
  id: string;
  operationId: string;
  sourcePath: string;
  destinationPath: string | null;
  sizeBytes: number;
  status: OperationStatus;
  errorMessage: string | null;
}

export interface OperationRecord {
  id: string;
  type: OperationType;
  status: OperationStatus;
  createdAt: string;
  completedAt: string | null;
  itemCount: number;
  totalBytes: number;
  canUndo: boolean;
  summary: string;
}

export interface OperationDetail extends OperationRecord {
  items: OperationItem[];
}

export interface ApplyProgress {
  operationId: string;
  itemsDone: number;
  itemsTotal: number;
  currentPath: string;
  done: boolean;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  monitoredFolders: string[];
  defaultScanRoots: string[];
  confirmBeforeApply: boolean;
}

export interface MonitorEvent {
  folder: string;
  path: string;
  type: 'add' | 'unlink';
  timestamp: string;
}

export interface ScanTargetOption {
  label: string;
  path: string;
  exists: boolean;
}

export interface AppError {
  code: string;
  message: string;
  technical?: string;
}

export type IpcResult<T> = { success: true; data: T } | { success: false; error: AppError };
