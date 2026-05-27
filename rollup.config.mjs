import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import { rmSync } from "fs";
import { dirname, resolve as resolvePath } from "path";
import copy from "rollup-plugin-copy";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function cleanDist() {
  return {
    name: "clean-dist",
    buildStart() {
      rmSync(resolvePath(__dirname, "dist"), { recursive: true, force: true });
    },
  };
}

export default {
  input: "src/extension.ts",
  output: {
    dir: "dist",
    format: "cjs",
    sourcemap: true,
    exports: "named",
  },
  external: ["vscode", "path", "fs", "util", "stream", "os", "assert"],
  plugins: [
    cleanDist(),
    resolve(),
    commonjs(),
    json(),
    typescript({
      tsconfig: "./tsconfig.json",
    }),
    copy({
      targets: [{ src: "src/dict", dest: "dist" }],
      verbose: true,
      flatten: false,
    }),
  ],
};
