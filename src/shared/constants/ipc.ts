/**
 * Every IPC channel CleanSpace uses. The preload script only exposes the
 * narrow, purpose-built functions in `src/preload/index.ts` — this list
 * exists so main and renderer can't drift on channel names, not so the
 * renderer can invoke channels directly.
 */
export const IPC = {
  dialogSelectFolder: 'dialog:selectFolder',
  systemGetScanTargets: 'system:getScanTargets',

  scanStart: 'scan:start',
  scanCancel: 'scan:cancel',
  scanGetSummary: 'scan:getSummary',
  scanList: 'scan:list',
  scanGetFiles: 'scan:getFiles',
  scanProgressEvent: 'scan:progress',

  analyticsGetStorageSummary: 'analytics:getStorageSummary',

  duplicatesFind: 'duplicates:find',
  duplicatesProgressEvent: 'duplicates:progress',

  cleanupAnalyze: 'cleanup:analyze',
  cleanupPlanForTarget: 'cleanup:planForTarget',

  organizePreview: 'organize:preview',
  organizeApply: 'organize:apply',
  applyProgressEvent: 'apply:progress',

  trashSend: 'trash:send',

  historyListOperations: 'history:listOperations',
  historyGetOperation: 'history:getOperation',
  historyUndo: 'history:undo',

  monitoringWatch: 'monitoring:watch',
  monitoringUnwatch: 'monitoring:unwatch',
  monitoringList: 'monitoring:list',
  monitoringEvent: 'monitoring:event',

  settingsGet: 'settings:get',
  settingsUpdate: 'settings:update'
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];
