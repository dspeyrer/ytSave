import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { terser } from "rollup-plugin-terser";
import typescript from "@rollup/plugin-typescript";
import svelte from "rollup-plugin-svelte";
import sveltePreprocess from "svelte-preprocess";
import css from "rollup-plugin-css-only";

export default {
  input: "src/main.ts",
  output: {
    sourcemap: true,
    format: "esm",
    file: "public/dist/bundle.js"
  },
  plugins: [
    svelte({
      preprocess: sveltePreprocess({ sourceMap: true }),
      compilerOptions: {
        dev: true
      }
    }),
    css({ output: "bundle.css" }),
    resolve({
      browser: true
    }),
    commonjs(),
    typescript(),
    terser()
  ]
};
