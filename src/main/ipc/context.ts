import { ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from 'electron';
import { ZodError, type ZodType } from 'zod';
import type { Repositories } from '@main/database';
import type { FolderMonitor } from '@main/monitoring';
import { toAppError } from '@main/safety/errors';
import type { IpcChannel } from '@shared/constants/ipc';
import type { IpcResult } from '@shared/types';

export interface IpcContext {
  repos: Repositories;
  monitor: FolderMonitor;
  getWindow: () => BrowserWindow | null;
}

export function makeEventSender(getWindow: () => BrowserWindow | null) {
  return function sendEvent<T>(channel: IpcChannel, payload: T): void {
    const win = getWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  };
}

/**
 * Registers a validated, error-safe IPC handler. Every handler goes
 * through this: args are parsed with a Zod schema before touching
 * anything (context.md §10, "IPC arguments must be validated"), and
 * thrown errors are translated into a plain, structured-clone-safe
 * IpcResult rather than an Electron-serialized Error — see §21.
 */
export function handleIpc<Args, Result>(
  channel: IpcChannel,
  schema: ZodType<Args>,
  handler: (args: Args, event: IpcMainInvokeEvent) => Promise<Result>
): void {
  ipcMain.handle(channel, async (event, rawArgs): Promise<IpcResult<Result>> => {
    try {
      const args = schema.parse(rawArgs);
      const data = await handler(args, event);
      return { success: true, data };
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          success: false,
          error: {
            code: 'INVALID_ARGUMENTS',
            message: 'The request was malformed.',
            technical: error.message
          }
        };
      }
      return { success: false, error: toAppError(error, channel) };
    }
  });
}

/** For handlers that take no arguments. */
export function handleIpcVoid<Result>(
  channel: IpcChannel,
  handler: (event: IpcMainInvokeEvent) => Promise<Result>
): void {
  ipcMain.handle(channel, async (event): Promise<IpcResult<Result>> => {
    try {
      const data = await handler(event);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: toAppError(error, channel) };
    }
  });
}
