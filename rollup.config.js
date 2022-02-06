import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import json from '@rollup/plugin-json'
import typescript from '@rollup/plugin-typescript'
import { terser } from 'rollup-plugin-terser'
import { babel } from '@rollup/plugin-babel'
import del from 'rollup-plugin-delete'

export default {
  input: './lib/exec-pq.ts',
  external: [
    /@babel\/runtime/
  ],
  output: [
    {
      file: './dist/exec-pq.js',
      format: 'esm',
      name: 'exec-pq',
    },
    {
      file: './dist/exec-pq.min.js',
      format: 'esm',
      name: 'exec-pq',
      sourcemap: true,
      plugins: [terser()]
    },

    {
      file: './dist/exec-pq.cjs',
      format: 'cjs',
      name: 'exec-pq',
    }
  ],
  plugins: [
    del({ targets: ['./dist/**'] }),
    commonjs(),
    nodeResolve(),
    json(),
    typescript({ tsconfig: './tsconfig.json' }),
    babel({ babelHelpers: 'runtime' })
  ]
}
