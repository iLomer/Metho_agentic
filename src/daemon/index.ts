import { startServer } from "./server.js";

const DEFAULT_PORT = 7890;

/**
 * Runs the meto daemon WebSocket server.
 * The daemon stays running until terminated via SIGINT or SIGTERM.
 */
export function runDaemon(port: number = DEFAULT_PORT): void {
  startServer(port);
}
