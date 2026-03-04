import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import * as p from "@clack/prompts";

/**
 * Manages SIGINT cleanup during scaffold writing.
 *
 * When armed with an output directory, a SIGINT will remove that directory
 * and print a cleanup message. When not armed, SIGINT exits cleanly
 * (the default behavior from clack's prompt cancellation).
 */
export class InterruptionHandler {
  private outputDir: string | undefined;
  private readonly boundHandler: () => void;

  constructor() {
    this.outputDir = undefined;
    this.boundHandler = () => {
      this.handleInterrupt();
    };
  }

  /**
   * Registers the SIGINT handler.
   */
  install(): void {
    process.on("SIGINT", this.boundHandler);
  }

  /**
   * Removes the SIGINT handler.
   */
  uninstall(): void {
    process.removeListener("SIGINT", this.boundHandler);
  }

  /**
   * Arms the handler with the output directory that should be cleaned up
   * if SIGINT is received. Call this just before scaffold writing begins.
   */
  arm(outputDirectory: string): void {
    this.outputDir = resolve(outputDirectory);
  }

  /**
   * Disarms the handler. Call this after scaffold writing completes
   * successfully so that a late SIGINT does not remove the user's project.
   */
  disarm(): void {
    this.outputDir = undefined;
  }

  private handleInterrupt(): void {
    if (this.outputDir !== undefined) {
      const dir = this.outputDir;
      this.outputDir = undefined;

      rm(dir, { recursive: true, force: true })
        .then(() => {
          p.log.warning("Interrupted. Cleaned up partial scaffold.");
          process.exit(0);
        })
        .catch(() => {
          p.log.warning("Interrupted. Could not clean up partial scaffold.");
          process.exit(0);
        });
    } else {
      p.cancel("Interrupted.");
      process.exit(0);
    }
  }
}
