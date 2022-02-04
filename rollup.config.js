import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import json from '@rollup/plugin-json'
import typescript from '@rollup/plugin-typescript'
import { terser } from 'rollup-plugin-terser'
import { babel } from '@rollup/plugin-babel'
import del from 'rollup-plugin-delete'

export default {
  input: './lib/ExecPQ.ts',
  external: [
    /@babel\/runtime/
  ],
  output: [
    {
      file: './dist/ExecPQ.js',
      format: 'esm',
      name: 'ExecPQ',
      exports: 'default'
    },
    {
      file: './dist/ExecPQ.min.js',
      format: 'esm',
      name: 'ExecPQ',
      exports: 'default',
      sourcemap: true,
      plugins: [terser()]
    },

    {
      file: './dist/ExecPQ.cjs',
      format: 'cjs',
      name: 'ExecPQ',
      exports: 'default'
    }
  ],
  plugins: [
    del({ targets: ['./dist/**'] }),
    commonjs(),
    nodeResolve(),
    json(),
    typescript(),
    babel({ babelHelpers: 'runtime' })
  ]
}
