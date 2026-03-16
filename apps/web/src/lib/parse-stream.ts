/**
 * Parses a Claude stream-json line into a displayable message.
 * Returns null if the line should be hidden (system events, deltas, etc.)
 */
export function parseStreamLine(raw: string): { type: "text" | "tool" | "thinking" | "system" | "error"; content: string } | null {
  if (raw.startsWith("[stderr]")) {
    return { type: "error", content: raw.replace("[stderr] ", "") };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // Not JSON — show as plain text
    return raw.trim() ? { type: "text", content: raw } : null;
  }

  const type = parsed.type as string | undefined;

  // System init message — skip
  if (type === "system" && parsed.subtype === "init") {
    return null;
  }

  // Assistant message with content blocks
  if (type === "assistant") {
    const message = parsed.message as Record<string, unknown> | undefined;
    if (!message) return null;

    const content = message.content as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(content)) return null;

    const parts: string[] = [];
    for (const block of content) {
      if (block.type === "text" && typeof block.text === "string") {
        parts.push(block.text);
      } else if (block.type === "thinking" && typeof block.thinking === "string") {
        return { type: "thinking", content: block.thinking.slice(0, 200) + (block.thinking.length > 200 ? "..." : "") };
      }
    }

    if (parts.length > 0) {
      return { type: "text", content: parts.join("\n") };
    }
    return null;
  }

  // Tool use results
  if (type === "result") {
    const result = parsed.result as string | undefined;
    if (result) {
      return { type: "text", content: result };
    }
    const subtype = parsed.subtype as string | undefined;
    if (subtype === "success") {
      return { type: "system", content: "Session completed successfully" };
    }
    if (subtype === "error") {
      return { type: "error", content: (parsed.error as string) ?? "Unknown error" };
    }
    return null;
  }

  return null;
}
