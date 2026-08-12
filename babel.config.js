// Used only by Jest to transpile TS sources and JS test files.
// The published build is produced by tsc (see the build script), not Babel.
module.exports = {
  presets: [
    ["@babel/preset-env", { targets: { node: "current" } }],
    "@babel/preset-typescript",
  ],
};
