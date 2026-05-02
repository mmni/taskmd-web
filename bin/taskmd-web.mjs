#!/usr/bin/env node
import("../dist/server/cli.js").catch((err) => {
  console.error("Failed to start taskmd-web:", err);
  process.exit(1);
});
