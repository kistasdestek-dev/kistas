export const LAUNCH_ARCHIVE_RETENTION_MS = 72 * 60 * 60 * 1000;

export function isLaunchArchiveExpired(updatedAt: string, now = Date.now()): boolean {
  const timestamp = Date.parse(updatedAt);
  return !Number.isFinite(timestamp) || timestamp + LAUNCH_ARCHIVE_RETENTION_MS <= now;
}
