import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'dist');
const visited = new Set();
async function inspect(file) {
  assert.ok(file.startsWith(output + sep), 'Resource escapes the build directory');
  if (visited.has(file)) return;
  visited.add(file);
  assert.ok((await stat(file)).isFile(), `Missing build resource: ${file}`);
  const extension = extname(file);
  if (!['.html', '.js', '.mjs'].includes(extension)) return;
  const source = await readFile(file, 'utf8');
  const references = extension === '.html'
    ? Array.from(source.matchAll(/(?:src|href)="(\.[^"?#]+)(?:[?#][^"]*)?"/g), match => match[1])
    : Array.from(source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g), match => match[1]);
  for (const reference of references) await inspect(resolve(dirname(file), reference));
}
await inspect(resolve(output, 'index.html'));
const image = await readFile(resolve(output, 'art/murphy-cat.png'));
assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'Hero must be a valid PNG');
assert.ok(image.length > 10000, 'Hero image is unexpectedly small');

const child = spawn(process.execPath, ['scripts/serve.mjs', '--preview', '--port', '0'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
try {
  const origin = await new Promise((resolveURL, reject) => {
    const timeout = setTimeout(() => reject(new Error('Preview startup timed out')), 5000);
    child.once('error', error => { clearTimeout(timeout);reject(error); });
    child.once('exit', code => { clearTimeout(timeout);reject(new Error(`Preview exited early: ${code}`)); });
    let text = '';
    child.stdout.on('data', chunk => {
      text += chunk;
      const url = text.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
      if (url) { clearTimeout(timeout);resolveURL(url); }
    });
  });
  for (const file of visited) {
    const path = file.slice(output.length).split(sep).join('/');
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, `Preview failed to serve ${path}`);
    if (['.mjs', '.js'].includes(extname(file))) assert.match(response.headers.get('content-type'), /^text\/javascript/, `Wrong module MIME: ${path}`);
    assert.ok((await response.arrayBuffer()).byteLength > 0, `Empty preview resource: ${path}`);
  }
  const missing = await fetch(origin + '/not-a-real-file');
  assert.equal(missing.status, 404, 'Missing resources must return 404');
  console.log(`Verified ${visited.size} build resources, module MIME types, generated PNG and preview responses.`);
} finally {
  child.kill();
}
