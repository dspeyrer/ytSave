import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { terser } from "rollup-plugin-terser";
import typescript from "rollup-plugin-typescript2";

export default {
  input: "src/script.js",
  output: {
    sourcemap: true,
    format: "esm",
    file: "dist/js/bundle.js"
  },
  plugins: [
    resolve({
      browser: true
    }),
    commonjs(),
    typescript(),
    terser()
  ]
};
