#!/usr/bin/env node
"use strict";

const { main } = require("../src/cli");

main(process.argv).then(
  (code) => {
    process.exit(code ?? 0);
  },
  (err) => {
    const message = err && err.message ? err.message : String(err);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  }
);
