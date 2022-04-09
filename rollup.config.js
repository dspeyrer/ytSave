import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { terser } from "rollup-plugin-terser";

export default {
  input: "src/script.js",
  output: {
    sourcemap: false,
    format: "esm",
    file: "dist/js/bundle.js"
  },
  plugins: [
    resolve({
      browser: true
    }),
    commonjs(),
    terser()
  ]
};
