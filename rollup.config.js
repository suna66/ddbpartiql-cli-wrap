const terser = require("@rollup/plugin-terser");
const commonjs = require("@rollup/plugin-commonjs");
const nodeResolve = require("@rollup/plugin-node-resolve");
const typescript = require("rollup-plugin-typescript2");
const json = require("@rollup/plugin-json");

var sourceMap = true;
var compress = false;
if (process.env.BUILD == "production") {
    sourceMap = false;
    compress = true;
}

module.exports = {
    input: "src/index.ts",

    output: {
        file: "dist/main.js",
        format: "cjs",
        sourcemap: sourceMap,
        inlineDynamicImports: true,
    },

    plugins: [
        typescript({
            tsconfig: "./tsconfig.json",
        }),
        json(),
        nodeResolve(),
        commonjs(),
        compress ? terser() : undefined,
    ],
};
