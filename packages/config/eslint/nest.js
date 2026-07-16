/** @type {import("eslint").Linter.Config} */
const base = require("./base");
module.exports = {
  ...base,
  extends: [...base.extends, "plugin:@typescript-eslint/strict"],
};
