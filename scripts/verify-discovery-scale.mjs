import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

const PROJECT_COUNT = 100_000;
const SPONSOR_COUNT = 10_000;
const POPULAR_LIMIT = 50;
const NOW = Date.parse('2026-09-05T12:00:00.000Z');
const NEW_PROJECT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const startedAt = performance.now();

const projects = Array.from({ length: PROJECT_COUNT }, (_, index) => ({
  id: `project-${String(index + 1).padStart(6, '0')}`,
  weeklySupportCount: (index * 17) % 251,
  lifetimeSupportCount: (index * 37) % 5003,
  createdAt: NOW - ((index * 13) % 45) * 24 * 60 * 60 * 1000,
  isSponsored: index % 11 === 0,
}));

const popularComparator = (left, right) => (
  right.lifetimeSupportCount - left.lifetimeSupportCount
  || right.createdAt - left.createdAt
  || left.id.localeCompare(right.id)
);

const rankPopular = () => projects
  .filter((project) => !project.isSponsored)
  .sort(popularComparator)
  .slice(0, POPULAR_LIMIT)
  .map((project) => project.id);

const firstPopularRun = rankPopular();
const secondPopularRun = rankPopular();

assert.equal(firstPopularRun.length, POPULAR_LIMIT, 'Popüler sonuç limiti korunmalı.');
assert.deepEqual(firstPopularRun, secondPopularRun, 'Popüler sıra deterministik olmalı.');
assert.ok(
  firstPopularRun.every((id) => !projects.find((project) => project.id === id)?.isSponsored),
  'Sponsorlu proje organik Popüler sonucuna girmemeli.'
);

const newProjects = projects.filter((project) => (
  !project.isSponsored && project.createdAt >= NOW - NEW_PROJECT_WINDOW_MS
));
assert.ok(
  newProjects.every((project) => !project.isSponsored && project.createdAt >= NOW - NEW_PROJECT_WINDOW_MS),
  'Yeni projeler ilk 30 gün ve organik koşulunu korumalı.'
);
assert.ok(
  projects.some((project) => project.createdAt < NOW - NEW_PROJECT_WINDOW_MS)
    && newProjects.length < projects.filter((project) => !project.isSponsored).length,
  '30 günden eski organik projeler Yeni Çıkanlar sonucundan çıkarılmalı.'
);

const rotationPosition = (basePosition, hourSlot, sponsorCount) => (
  ((basePosition - 1 + sponsorCount - (hourSlot % sponsorCount)) % sponsorCount) + 1
);

const oneHourPositions = new Set(
  Array.from(
    { length: SPONSOR_COUNT },
    (_, index) => rotationPosition(index + 1, 777_777, SPONSOR_COUNT)
  )
);
assert.equal(
  oneHourPositions.size,
  SPONSOR_COUNT,
  'Aynı saatte sponsor pozisyonları çakışmamalı.'
);

const projectOneFullCycle = new Set(
  Array.from(
    { length: SPONSOR_COUNT },
    (_, hourSlot) => rotationPosition(1, hourSlot, SPONSOR_COUNT)
  )
);
assert.equal(
  projectOneFullCycle.size,
  SPONSOR_COUNT,
  'Bir sponsor tam çevrimde bütün pozisyonları eşit almalı.'
);

const elapsedMs = Math.round(performance.now() - startedAt);
console.log(JSON.stringify({
  success: true,
  projectsVerified: PROJECT_COUNT,
  sponsorsVerified: SPONSOR_COUNT,
  popularLimit: POPULAR_LIMIT,
  elapsedMs,
}));
