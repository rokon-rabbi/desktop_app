import chokidar, { type FSWatcher } from 'chokidar';
import { assertSafeScanRoot } from '@main/safety/paths';
import { logger } from '@main/safety/logger';
import type { MonitorEvent } from '@shared/types';

export type MonitorEventHandler = (event: MonitorEvent) => void;

/**
 * Watches user-selected folders (e.g. ~/Downloads) for newly added files.
 * `ignoreInitial` means it only reports files that show up *after*
 * watching starts — it never floods the renderer with the folder's
 * existing contents, and `awaitWriteFinish` avoids firing on a file that's
 * still being downloaded.
 */
export class FolderMonitor {
  private watchers = new Map<string, FSWatcher>();

  constructor(private readonly onEvent: MonitorEventHandler) {}

  async watch(rawPath: string): Promise<string> {
    const folder = await assertSafeScanRoot(rawPath);
    if (this.watchers.has(folder)) return folder;

    const watcher = chokidar.watch(folder, {
      ignoreInitial: true,
      depth: 4,
      awaitWriteFinish: { stabilityThreshold: 800, pollInterval: 100 }
    });

    watcher.on('add', (path) => {
      this.onEvent({ folder, path, type: 'add', timestamp: new Date().toISOString() });
    });
    watcher.on('unlink', (path) => {
      this.onEvent({ folder, path, type: 'unlink', timestamp: new Date().toISOString() });
    });
    watcher.on('error', (error) => {
      logger.warn('monitoring', 'Watcher error', {
        errorCode: (error as NodeJS.ErrnoException).code
      });
    });

    this.watchers.set(folder, watcher);
    logger.info('monitoring', 'Started watching folder', { module: 'monitoring' });
    return folder;
  }

  async unwatch(rawPath: string): Promise<void> {
    const watcher = this.watchers.get(rawPath);
    if (!watcher) return;
    await watcher.close();
    this.watchers.delete(rawPath);
  }

  list(): string[] {
    return [...this.watchers.keys()];
  }

  async closeAll(): Promise<void> {
    await Promise.all([...this.watchers.values()].map((w) => w.close()));
    this.watchers.clear();
  }
}
