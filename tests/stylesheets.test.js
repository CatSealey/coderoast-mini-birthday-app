import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import postcss from 'postcss';

test('stylesheet entry imports every valid stylesheet module exactly once', async () => {
  const entryUrl = new URL('../css/styles.css', import.meta.url);
  const entry = postcss.parse(await readFile(entryUrl, 'utf8'));
  const imports = entry.nodes.filter((node) => node.type === 'atrule' && node.name === 'import');
  assert.ok(imports.length > 1);
  assert.ok(entry.nodes.every((node) => node.type === 'comment' || imports.includes(node)));
  const files = imports.map((node) => {
    const match = node.params.match(/^['"](\.\/parts\/[a-z-]+\.css)['"]$/);
    assert.ok(match, `Invalid stylesheet import: ${node.params}`);
    return match[1];
  });
  assert.equal(new Set(files).size, files.length);
  assert.deepEqual([...files].sort(), (await readdir(new URL('../css/parts/', import.meta.url)))
    .filter((name) => name.endsWith('.css')).map((name) => `./parts/${name}`).sort());
  for (const file of files) {
    const css = await readFile(new URL(file, entryUrl), 'utf8');
    assert.doesNotThrow(() => postcss.parse(css, { from: file }), file);
  }
  assert.equal(files[0], './parts/foundation.css');
});

test('quest steps grow naturally inside the scrollable journal', async () => {
  const css = await readFile(new URL('../css/parts/client-shell-journal.css', import.meta.url), 'utf8');
  const root = postcss.parse(css);
  const declarations = (selector) => {
    const properties = new Map();
    root.walkRules(selector, (rule) => rule.walkDecls((decl) => properties.set(decl.prop, decl.value)));
    return properties;
  };
  assert.equal(declarations('.quest-journal__scroll').get('overflow-y'), 'auto');
  const steps = declarations('.quest-steps__list');
  assert.ok(steps.size > 0);
  assert.equal(steps.has('max-height'), false);
  assert.equal(steps.has('overflow-y'), false);
  assert.equal(steps.has('overflow'), false);
});
