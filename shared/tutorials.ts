/**
 * Single import path for the teaching manifest: the browser workspace imports
 * this module and the Host guide reads the same data. The implementation lives
 * under `src/` because the Host build compiles with `rootDir: "src"`; keeping
 * one canonical module avoids shipping two drifting copies.
 * @module deepseek-harness-finance-plugin/shared/tutorials
 */

export * from '../src/finance/tutorials.ts'
