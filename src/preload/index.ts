import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '@shared/constants/ipc';
import { CleanSpaceIpcError } from '@shared/errors';
import type {
  AppSettings,
  ApplyProgress,
  CleanupCandidate,
  CleanupPlan,
  DuplicateGroup,
  DuplicateScanProgress,
  IpcResult,
  MonitorEvent,
  OperationDetail,
  OperationRecord,
  OrganizeMove,
  OrganizePreview,
  ScanFilesQuery,
  ScanFilesResult,
  ScanProgress,
  ScanRecord,
  ScanTargetOption,
  StorageAnalytics
} from '@shared/types';

async function invoke<T>(channel: string, args?: unknown): Promise<T> {
  const result = (await ipcRenderer.invoke(channel, args)) as IpcResult<T>;
  if (!result.success) throw new CleanSpaceIpcError(result.error);
  return result.data;
}

function on<T>(channel: string, callback: (payload: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T): void => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

/**
 * The entire renderer-facing surface of CleanSpace. Every function here is
 * narrow and purpose-built — see context.md §10: "Only expose narrowly
 * scoped functions through preload," never a generic passthrough like
 * `runAnything(command)`.
 */
const cleanSpaceApi = {
  selectFolder: (): Promise<string | null> => invoke(IPC.dialogSelectFolder),
  getScanTargets: (): Promise<ScanTargetOption[]> => invoke(IPC.systemGetScanTargets),

  scan: {
    start: (rootPath: string): Promise<{ scanId: string }> => invoke(IPC.scanStart, { rootPath }),
    cancel: (scanId: string): Promise<{ cancelled: boolean }> => invoke(IPC.scanCancel, { scanId }),
    getSummary: (scanId: string): Promise<ScanRecord | null> =>
      invoke(IPC.scanGetSummary, { scanId }),
    list: (): Promise<ScanRecord[]> => invoke(IPC.scanList),
    getFiles: (query: ScanFilesQuery): Promise<ScanFilesResult> => invoke(IPC.scanGetFiles, query),
    onProgress: (cb: (progress: ScanProgress) => void): (() => void) =>
      on(IPC.scanProgressEvent, cb)
  },

  analytics: {
    getStorageSummary: (scanId: string): Promise<StorageAnalytics> =>
      invoke(IPC.analyticsGetStorageSummary, { scanId })
  },

  duplicates: {
    find: (scanId: string): Promise<DuplicateGroup[]> => invoke(IPC.duplicatesFind, { scanId }),
    onProgress: (cb: (progress: DuplicateScanProgress) => void): (() => void) =>
      on(IPC.duplicatesProgressEvent, cb)
  },

  cleanup: {
    analyze: (scanId: string): Promise<CleanupCandidate[]> =>
      invoke(IPC.cleanupAnalyze, { scanId }),
    planForTarget: (scanId: string, targetBytes: number): Promise<CleanupPlan> =>
      invoke(IPC.cleanupPlanForTarget, { scanId, targetBytes })
  },

  organize: {
    preview: (scanId: string): Promise<OrganizePreview> => invoke(IPC.organizePreview, { scanId }),
    apply: (moves: OrganizeMove[]): Promise<{ operationId: string }> =>
      invoke(IPC.organizeApply, { moves }),
    onApplyProgress: (cb: (progress: ApplyProgress) => void): (() => void) =>
      on(IPC.applyProgressEvent, cb)
  },

  trash: {
    send: (items: { path: string; sizeBytes: number }[]): Promise<{ operationId: string }> =>
      invoke(IPC.trashSend, { items })
  },

  history: {
    listOperations: (): Promise<OperationRecord[]> => invoke(IPC.historyListOperations),
    getOperation: (operationId: string): Promise<OperationDetail | null> =>
      invoke(IPC.historyGetOperation, { operationId }),
    undo: (operationId: string): Promise<OperationDetail | null> =>
      invoke(IPC.historyUndo, { operationId })
  },

  monitoring: {
    watch: (path: string): Promise<{ path: string }> => invoke(IPC.monitoringWatch, { path }),
    unwatch: (path: string): Promise<{ path: string }> => invoke(IPC.monitoringUnwatch, { path }),
    list: (): Promise<string[]> => invoke(IPC.monitoringList),
    onEvent: (cb: (event: MonitorEvent) => void): (() => void) => on(IPC.monitoringEvent, cb)
  },

  settings: {
    get: (): Promise<AppSettings> => invoke(IPC.settingsGet),
    update: (partial: Partial<AppSettings>): Promise<AppSettings> =>
      invoke(IPC.settingsUpdate, partial)
  }
};

export type CleanSpaceApi = typeof cleanSpaceApi;

contextBridge.exposeInMainWorld('cleanSpace', cleanSpaceApi);
