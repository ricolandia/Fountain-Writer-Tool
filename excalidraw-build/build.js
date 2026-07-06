import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'dist/excalidraw-embed.js',
  format: 'iife',
  globalName: 'ExcalidrawEmbed',
  minify: true,
  loader: { '.js': 'jsx' },
  resolveExtensions: ['.js', '.jsx', '.mjs', '.cjs'],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  banner: {
    js: 'var process={env:{NODE_ENV:"production"}};',
  },
  treeShaking: true,
});
