const hashProjectForSeed = (projectId: string, seed: number): number => {
  let hash = seed | 0;
  for (let index = 0; index < projectId.length; index += 1) {
    hash = Math.imul(hash ^ projectId.charCodeAt(index), 16777619);
  }
  return hash >>> 0;
};

export const selectStableRandomPreview = <T extends { id: string }>(
  items: T[],
  limit: number,
  seed: number,
): T[] => [...items]
  .sort((left, right) => hashProjectForSeed(left.id, seed) - hashProjectForSeed(right.id, seed))
  .slice(0, Math.max(0, limit));
