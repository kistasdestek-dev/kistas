export const category = { id: '11111111-1111-4111-8111-111111111111', parent_id: null, name: 'Geliştirici Araçları', slug: 'app-devtools', icon_url: null, order_index: 1 };
export const listing = {
  id: '22222222-2222-4222-8222-222222222222', seller_id: '33333333-3333-4333-8333-333333333333', category_id: category.id,
  title: 'M0 Test Projesi', tagline: 'Tekrar üretilebilir keşif verisi', description: 'Workers test fixture', price: 0, status: 'active', boosted_until: null, upvotes_count: 7, platforms: ['Web'],
  web_url: 'https://example.com', logo_url: '/kistas-logo-256.webp', pricing_model: 'free', developer_name: 'Test Maker', created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z', images: [], category: { name: category.name },
};
export function discoveryFixtureRows() {
  return [listing, ...Array.from({ length: 70 }, (_, index) => ({ ...listing, id: `44444444-4444-4444-8444-${String(index + 1).padStart(12, '0')}`, title: `Eski Proje ${index + 1}`, upvotes_count: 1000 - Math.floor(index / 2), description: 'A'.repeat(4000) })),
    { ...listing, id: '55555555-5555-4555-8555-555555555555', title: 'M1 Yeni Proje', developer_name: 'Aranabilir Ekip', created_at: '2026-09-27T12:00:00Z', upvotes_count: 0 },
    { ...listing, id: '66666666-6666-4666-8666-666666666666', title: 'M1 Sponsor Projesi', created_at: '2026-09-26T12:00:00Z', boosted_until: '2030-01-01T00:00:00Z', upvotes_count: 0 },
    { ...listing, id: '77777777-7777-4777-8777-777777777777', title: 'Yayınlanmamış Proje', status: 'pending_review', upvotes_count: 9999 },
  ];
}
// Small independent PostgREST subset for local fixtures; unsupported grammar fails closed.
function split(expression) {
  let depth = 0, quoted = false, escaped = false, start = 0;
  const parts = [];
  for (let index = 0; index < expression.length; index++) {
    const character = expression[index];
    if (escaped) { escaped = false; continue; }
    if (quoted && character === '\\') { escaped = true; continue; }
    if (character === '"') quoted = !quoted;
    if (!quoted) {
      if (character === '(') depth++;
      if (character === ')') depth--;
      if (character === ',' && depth === 0) { parts.push(expression.slice(start, index)); start = index + 1; }
    }
  }
  if (depth !== 0 || quoted) throw new Error('Unsupported fixture grammar');
  return [...parts, expression.slice(start)];
}
function literal(raw) { return raw.startsWith('"') ? JSON.parse(raw) : raw; }
function compare(value, operator, raw) {
  const expected = literal(raw);
  if (operator === 'eq') return String(value) === expected;
  if (operator === 'gt') return value > (typeof value === 'number' ? Number(expected) : expected);
  if (operator === 'lte') return value <= (typeof value === 'number' ? Number(expected) : expected);
  if (operator === 'lt') return value < (typeof value === 'number' ? Number(expected) : expected);
  if (operator === 'cs') return JSON.parse(expected.replace('{', '["').replace('}', '"]')).every((item) => value?.includes(item));
  if (operator === 'imatch') return new RegExp(expected, 'iu').test(value ?? '');
  if (operator === 'ilike') {
    let pattern = '', escaped = false;
    for (const character of expected) {
      if (!escaped && character === '\\') { escaped = true; continue; }
      if (!escaped && (character === '%' || character === '*')) pattern += '.*';
      else if (!escaped && character === '_') pattern += '.';
      else pattern += character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      escaped = false;
    }
    return new RegExp(`^${pattern}$`, 'iu').test(value ?? '');
  }
  throw new Error(`Unsupported fixture operator: ${operator}`);
}
function condition(row, expression) {
  for (const group of ['or', 'and']) if (expression.startsWith(`${group}(`) && expression.endsWith(')')) {
    const matches = split(expression.slice(group.length + 1, -1)).map((part) => condition(row, part));
    return group === 'or' ? matches.some(Boolean) : matches.every(Boolean);
  }
  const match = /^([a-z_]+)\.([a-z]+)\.(.*)$/s.exec(expression);
  if (!match) throw new Error(`Unsupported fixture condition: ${expression}`);
  return compare(row[match[1]], match[2], match[3]);
}
export function queryDiscoveryFixture(rows, params) {
  let matches = rows.filter((row) => [...params].every(([key, value]) => {
    if (['select', 'limit', 'offset', 'order'].includes(key) || key.startsWith('images.')) return true;
    if (key === 'or') return condition(row, `or${value}`);
    if (['status', 'category_id', 'platforms', 'boosted_until', 'created_at', 'id'].includes(key)) return condition(row, `${key}.${value}`);
    throw new Error(`Unsupported fixture parameter: ${key}`);
  }));
  const count = matches.length;
  const orders = (params.get('order') || '').split(',').filter(Boolean).map((item) => item.split('.'));
  matches = [...matches].sort((a, b) => {
    for (const [field, direction] of orders) {
      if (a[field] === b[field]) continue;
      return (a[field] < b[field] ? -1 : 1) * (direction === 'desc' ? -1 : 1);
    }
    return 0;
  });
  const offset = Number(params.get('offset') || 0);
  const limit = Number(params.get('limit') || count);
  matches = matches.slice(offset, offset + limit);
  const select = params.get('select');
  if (select && !select.includes('*')) matches = matches.map((row) => Object.fromEntries(split(select).map((column) => column.startsWith('images:') ? ['images', row.images.slice(0, Number(params.get('images.limit') || row.images.length))] : [column.trim(), row[column.trim()]])));
  return { rows: matches, count, offset };
}
