/**
 * Test helper: answer a CLI's interactive prompts one at a time.
 *
 * Each answer is written only after the child's stdout shows that a new clack
 * prompt is on screen and the output has been quiet for a short moment. This
 * replaces a fixed sleep between answers, which desyncs the answers when the
 * CLI starts slowly (for example on a Docker bind mount).
 *
 * Detection rule: clack prints every active prompt (text, select, confirm)
 * on a line that starts with the state marker followed by two spaces. That is
 * "◆" (unicode) or "*" (ASCII fallback), the same with or without a TTY.
 * ANSI codes are stripped first, so colour does not matter; clack redraws a
 * prompt in place with cursor-up and erase codes, which become line breaks so
 * the redrawn marker starts its own line. A re-render while typing or after a
 * validation error prints the marker again, so a "new prompt" is the marker
 * appearing after a line that carries a different marker (the "◇" of a
 * submitted prompt, or "■" cancelled), not every marker. Answer i is sent
 * once i + 1 prompts have been seen, the latest one is still active, and
 * stdout has been quiet for QUIET_MS.
 */

import { stripVTControlCharacters } from "node:util";

/** How long stdout must be silent after a prompt appears before answering. */
const QUIET_MS = 60;

/** Default longest wait for one prompt before failing with a clear error. */
const DEFAULT_PROMPT_TIMEOUT_MS = 15_000;

const ACTIVE_MARKERS = new Set(["◆", "*"]);
/** Marker of a prompt in the error state: a re-render of the same prompt. */
const ERROR_MARKERS = new Set(["▲", "!"]);
/** Markers that end a prompt: submitted or cancelled. */
const CLOSED_MARKERS = new Set(["◇", "o", "■", "x"]);

const MARKER_LINE = /^[ \t]*(◆|\*|▲|!|◇|o|■|x) {2}/;

export interface AnswerPromptsOptions {
  /** Longest wait for each prompt, in ms. Default 15000. */
  promptTimeoutMs?: number;
}

/** The parts of a spawned child the helper needs. */
export interface PromptedChild {
  stdin: NodeJS.WritableStream;
  stdout: NodeJS.ReadableStream;
  /** Optional: called when a prompt never appears, so the child does not linger. */
  kill?: () => unknown;
}

/** Strips ANSI; cursor-up and erase-down (an in-place redraw) become newlines. */
function toPlainText(raw: string): string {
  return stripVTControlCharacters(raw.replace(/\u001b\[[0-9;]*[AJ]/g, "\n"));
}

/** Counts prompts shown so far and whether the latest one is still active. */
export function scanPrompts(rawStdout: string): { prompts: number; active: boolean } {
  let prompts = 0;
  let last = "";
  for (const line of toPlainText(rawStdout).split(/\r?\n/)) {
    const marker = MARKER_LINE.exec(line)?.[1];
    if (marker === undefined) continue;
    if (ACTIVE_MARKERS.has(marker) && !ACTIVE_MARKERS.has(last) && !ERROR_MARKERS.has(last)) {
      prompts++;
    }
    last = marker;
  }
  return { prompts, active: ACTIVE_MARKERS.has(last) };
}

/**
 * Writes each answer to the child's stdin once its next prompt is showing.
 * Resolves after the last answer is written (or when stdout ends). Rejects,
 * and kills the child, naming the waiting answer and the stdout seen so far if
 * a prompt does not show up within the timeout.
 */
export function answerPrompts(
  child: PromptedChild,
  answers: string[],
  options: AnswerPromptsOptions = {},
): Promise<void> {
  const timeoutMs = options.promptTimeoutMs ?? DEFAULT_PROMPT_TIMEOUT_MS;

  return new Promise((resolve, reject) => {
    let seen = "";
    let index = 0;
    let quietTimer: NodeJS.Timeout | undefined;
    let guardTimer: NodeJS.Timeout | undefined;
    let finished = false;

    function finish(error?: Error): void {
      if (finished) return;
      finished = true;
      clearTimeout(quietTimer);
      clearTimeout(guardTimer);
      child.stdout.removeListener("data", onData);
      child.stdout.removeListener("end", onEnd);
      child.stdout.removeListener("close", onEnd);
      if (error) {
        child.kill?.();
        reject(error);
      } else {
        resolve();
      }
    }

    function armGuard(): void {
      clearTimeout(guardTimer);
      guardTimer = setTimeout(() => {
        finish(
          new Error(
            `answerPrompts: no prompt appeared for answer ${index + 1} of ` +
              `${answers.length} (${JSON.stringify(answers[index])}) within ` +
              `${timeoutMs} ms. stdout so far:\n${toPlainText(seen)}`,
          ),
        );
      }, timeoutMs);
    }

    function trySend(): void {
      if (finished) return;
      const { prompts, active } = scanPrompts(seen);
      if (!active || prompts < index + 1) return;
      child.stdin.write(answers[index]);
      index++;
      if (index >= answers.length) {
        finish();
        return;
      }
      armGuard();
    }

    function onData(data: Buffer | string): void {
      seen += data.toString();
      clearTimeout(quietTimer);
      quietTimer = setTimeout(trySend, QUIET_MS);
    }

    function onEnd(): void {
      finish();
    }

    if (answers.length === 0) {
      resolve();
      return;
    }

    child.stdout.on("data", onData);
    child.stdout.on("end", onEnd);
    child.stdout.on("close", onEnd);
    armGuard();
  });
}
