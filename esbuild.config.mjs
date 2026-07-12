import esbuild from 'esbuild';

const args = process.argv.slice(2);
const watch = args.includes('--watch');

const config = {
  sourcemap: watch ? 'inline' : false,
  bundle: true,
  target: 'es6',
  entryPoints: ['src/main.ts'],
  outdir: '.',
  external: ['obsidian'],
  format: 'cjs',
};

if (watch) {
  esbuild.context(config).then(context => context.watch());
} else {
  esbuild.build(config);
}
