// Lists the tests that only passed after a retry, so a retry never hides
// instability (Spec 158). Usage: node scripts/report-flaky.mjs results.json
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

export function flakyTests(report) {
  const found = [];
  const visit = (suite, titles) => {
    const path = suite.title ? [...titles, suite.title] : titles;
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        if (test.status !== 'flaky') continue;
        const first = test.results?.find(result => result.status !== 'passed');
        const error = first?.error?.message?.split('\n')[0]?.replace(/\u001b\[[0-9;]*m/g, '') ?? '';
        found.push({ project: test.projectName, title: [...path, spec.title].join(' › '), line: spec.line, error });
      }
    }
    for (const child of suite.suites ?? []) visit(child, path);
  };
  for (const suite of report.suites ?? []) visit(suite, []);
  return found;
}

export function summary(found) {
  if (found.length === 0) return '### Pruebas inestables\n\nNinguna prueba necesitó repetirse.\n';
  const rows = found.map(item => `| ${item.project} | ${item.title.replace(/\|/g, '\\|')}:${item.line} | ${item.error.replace(/\|/g, '\\|').slice(0, 160)} |`);
  return [
    '### Pruebas inestables',
    '',
    `${found.length} prueba(s) fallaron y pasaron al repetirse. Revísalas aunque la CI esté en verde.`,
    '',
    '| Proyecto | Prueba | Primer error |',
    '| --- | --- | --- |',
    ...rows,
    '',
  ].join('\n');
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/').replace(/^(?=[A-Za-z]:)/, '/')}`) {
  const file = process.argv[2];
  const found = file && existsSync(file) ? flakyTests(JSON.parse(readFileSync(file, 'utf8'))) : null;
  const text = found ? summary(found) : '### Pruebas inestables\n\nNo hay resultados de Playwright para revisar.\n';
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + '\n');
  else console.log(text);
  for (const item of found ?? []) console.log(`::warning title=Prueba inestable (${item.project})::${item.title}:${item.line}`);
}
