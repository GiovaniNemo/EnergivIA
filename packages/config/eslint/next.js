/** @type {import("eslint").Linter.Config} */
const base = require("./base");
module.exports = {
  ...base,
  extends: [...base.extends, "next/core-web-vitals", "next/typescript"],
  env: {
    ...base.env,
    browser: true,
  },
};
