/**
 * Paths CleanSpace must never scan, watch, or modify, even if a user
 * somehow points a dialog at them. Checked with a resolved-path prefix
 * match, not a string prefix match (see safety/paths.ts).
 */
export const PROTECTED_ROOTS = [
  '/proc',
  '/sys',
  '/dev',
  '/run',
  '/boot',
  '/bin',
  '/sbin',
  '/lib',
  '/lib64',
  '/usr',
  '/etc',
  '/root'
] as const;

/** Folders CleanSpace suggests to the user as scan targets, relative to $HOME. */
export const DEFAULT_SCAN_TARGETS = [
  { label: 'Downloads', relativePath: 'Downloads' },
  { label: 'Desktop', relativePath: 'Desktop' },
  { label: 'Documents', relativePath: 'Documents' },
  { label: 'Pictures', relativePath: 'Pictures' },
  { label: 'Videos', relativePath: 'Videos' }
] as const;

export const FILE_CATEGORIES = [
  'Documents',
  'Images',
  'Videos',
  'Audio',
  'Archives',
  'Installers',
  'Code',
  'Disk Images',
  'Other'
] as const;

/** Deterministic extension → category map. Lowercase, without the leading dot. */
export const EXTENSION_CATEGORY_MAP: Record<string, (typeof FILE_CATEGORIES)[number]> = {
  // Documents
  pdf: 'Documents',
  doc: 'Documents',
  docx: 'Documents',
  odt: 'Documents',
  rtf: 'Documents',
  txt: 'Documents',
  md: 'Documents',
  xls: 'Documents',
  xlsx: 'Documents',
  ods: 'Documents',
  csv: 'Documents',
  ppt: 'Documents',
  pptx: 'Documents',
  odp: 'Documents',
  epub: 'Documents',
  // Images
  jpg: 'Images',
  jpeg: 'Images',
  png: 'Images',
  gif: 'Images',
  bmp: 'Images',
  webp: 'Images',
  svg: 'Images',
  heic: 'Images',
  tif: 'Images',
  tiff: 'Images',
  raw: 'Images',
  ico: 'Images',
  // Videos
  mp4: 'Videos',
  mkv: 'Videos',
  mov: 'Videos',
  avi: 'Videos',
  webm: 'Videos',
  flv: 'Videos',
  wmv: 'Videos',
  m4v: 'Videos',
  mpg: 'Videos',
  mpeg: 'Videos',
  // Audio
  mp3: 'Audio',
  wav: 'Audio',
  flac: 'Audio',
  aac: 'Audio',
  ogg: 'Audio',
  m4a: 'Audio',
  wma: 'Audio',
  opus: 'Audio',
  // Archives
  zip: 'Archives',
  rar: 'Archives',
  '7z': 'Archives',
  tar: 'Archives',
  gz: 'Archives',
  bz2: 'Archives',
  xz: 'Archives',
  tgz: 'Archives',
  // Installers
  deb: 'Installers',
  rpm: 'Installers',
  appimage: 'Installers',
  run: 'Installers',
  exe: 'Installers',
  msi: 'Installers',
  snap: 'Installers',
  flatpak: 'Installers',
  // Code
  js: 'Code',
  ts: 'Code',
  jsx: 'Code',
  tsx: 'Code',
  py: 'Code',
  java: 'Code',
  c: 'Code',
  cpp: 'Code',
  h: 'Code',
  hpp: 'Code',
  go: 'Code',
  rs: 'Code',
  rb: 'Code',
  php: 'Code',
  sh: 'Code',
  json: 'Code',
  yaml: 'Code',
  yml: 'Code',
  html: 'Code',
  css: 'Code',
  sql: 'Code',
  // Disk Images
  iso: 'Disk Images',
  img: 'Disk Images',
  dmg: 'Disk Images',
  vdi: 'Disk Images',
  vmdk: 'Disk Images',
  qcow2: 'Disk Images'
};

/** Extensions treated as installer-like when computing "old installer" cleanup candidates. */
export const INSTALLER_EXTENSIONS = new Set(['deb', 'rpm', 'appimage', 'run', 'exe', 'msi']);

export const ARCHIVE_EXTENSIONS = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'tgz']);

/** Age, in days, after which an installer/archive becomes a cleanup candidate. */
export const OLD_FILE_THRESHOLD_DAYS = 30;

/** Size, in bytes, above which an unused file is flagged for review (250 MB). */
export const LARGE_FILE_THRESHOLD_BYTES = 250 * 1024 * 1024;

/** Days of inactivity (by access time) before a large file counts as "unused". */
export const UNUSED_ACCESS_THRESHOLD_DAYS = 90;

export const PARTIAL_HASH_BYTES = 64 * 1024;

export const SCAN_PROGRESS_BATCH_SIZE = 100;
export const SCAN_PROGRESS_BATCH_MS = 150;
