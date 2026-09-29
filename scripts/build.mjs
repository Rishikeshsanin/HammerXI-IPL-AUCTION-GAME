import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });

await build({
  entryPoints: ['app.js'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  outfile: 'dist/app.js',
  minify: true,
  sourcemap: false,
  legalComments: 'none'
});

for (const file of ['index.html', 'styles.css', 'favicon.svg']) {
  await cp(file, `dist/${file}`);
}

console.log('HammerXI production bundle built');
