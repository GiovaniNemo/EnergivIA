const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  watchFolders: [require("path").resolve(__dirname, "../..")],
  resolver: {
    nodeModulesPaths: [
      require("path").resolve(__dirname, "node_modules"),
      require("path").resolve(__dirname, "../../node_modules"),
    ],
  },
};

module.exports = mergeConfig(defaultConfig, config);
