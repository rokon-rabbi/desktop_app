import type { CleanSpaceApi } from '../../preload/index';

declare global {
  interface Window {
    cleanSpace: CleanSpaceApi;
  }
}

export {};
