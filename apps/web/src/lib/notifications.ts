const announcementStaticPaths = new Set(['/', '/browse', '/new', '/popular', '/blog']);
const listingPathPattern = /^\/listings\/[a-f0-9-]{36}$/i;

export const isValidAnnouncementPath = (path?: string): path is string => (
  Boolean(path) && (announcementStaticPaths.has(path as string) || listingPathPattern.test(path as string))
);
