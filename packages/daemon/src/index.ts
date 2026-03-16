#!/usr/bin/env node

import { startServer } from "./server.js";

const args = process.argv.slice(2);
const command = args[0];

const HELP = `
  meto daemon — local agent dispatcher

  usage:
    meto-daemon start [--port 7890]

  the daemon runs a websocket server on localhost
  that the meto dashboard connects to for:
    - reading project boards from local files
    - creating and moving tasks locally
    - dispatching claude code agent sessions
    - streaming agent output in real-time

  options:
    --port    port number (default: 7890)
    --help    show this help
`;

if (!command || command === "--help" || command === "-h") {
  process.stdout.write(HELP);
  process.exit(0);
}

if (command === "start") {
  const portIndex = args.indexOf("--port");
  const port = portIndex !== -1 ? Number(args[portIndex + 1]) : 7890;

  if (Number.isNaN(port)) {
    process.stderr.write("  error: invalid port number\n");
    process.exit(1);
  }

  startServer(port);
} else {
  process.stdout.write(`  unknown command: "${command}"\n`);
  process.stdout.write(HELP);
  process.exit(1);
}
