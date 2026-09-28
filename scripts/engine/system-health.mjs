import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { walkFiles } from './bundle-budget.mjs';

export function workspaceSources(root) {
  return ['apps', 'packages'].flatMap((group) => {
    const directory = path.join(root, group);
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isDirectory() && !entry.isSymbolicLink()).flatMap((entry) => walkFiles(path.join(directory, entry.name, 'src')));
  }).filter((file) => /\.[cm]?[jt]sx?$/.test(file));
}

export function inspectSources(root) {
  return workspaceSources(root).map((file) => {
    const content = fs.readFileSync(file, 'utf8');
    const tree = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
    let anyTypes = 0;
    let hooks = 0;
    function visit(node) {
      if (node.kind === ts.SyntaxKind.AnyKeyword) anyTypes++;
      if (ts.isCallExpression(node)) {
        const name = ts.isIdentifier(node.expression) ? node.expression.text : ts.isPropertyAccessExpression(node.expression) ? node.expression.name.text : '';
        if (/^use[A-Z]/.test(name)) hooks++;
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
    return { file: path.relative(root, file), lines: content.split('\n').length, hooks, anyTypes };
  });
}

export function summarizeChecks(checks) {
  const counts = { passed: 0, warning: 0, failed: 0, unmeasured: 0 };
  for (const check of checks) {
    if (!(check.status in counts)) throw new Error('Unknown check status');
    counts[check.status]++;
  }
  return { ...counts, total: checks.length, coveragePercent: checks.length ? Math.round((checks.length - counts.unmeasured) / checks.length * 100) : 0, healthScore: checks.length ? Math.round((counts.passed + counts.warning * 0.5) / checks.length * 100) : null };
}
