import typescript from "rollup-plugin-typescript2";

export default {
  input: "src/index.ts",
  output: [
    {
      file: "dist/wait-in-parallel.es.js",
      format: "es",
      sourcemap: true
    },
    {
      file: "dist/wait-in-parallel.cjs.js",
      format: "cjs",
      sourcemap: true
    },
    {
      file: "dist/wait-in-parallel.umd.js",
      format: "umd",
      name: "AbstractedClient",
      sourcemap: true
    }
  ],
  external: [
    "firebase-api-surface",
    "typed-conversions",
    "serialized-query",
    "@firebase/app-types"
  ],
  plugins: [
    typescript({
      tsconfig: "tsconfig.es.json"
    })
  ]
};
