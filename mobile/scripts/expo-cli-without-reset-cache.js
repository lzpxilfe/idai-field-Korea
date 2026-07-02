#!/usr/bin/env node

const expoCliPath = require.resolve('@expo/cli/build/bin/cli', {
  paths: [process.cwd()],
});

process.argv = process.argv.filter((argument) => argument !== '--reset-cache');

require(expoCliPath);
