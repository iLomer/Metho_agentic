import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { TechStack } from "../types.js";

/**
 * Result of tech stack auto-detection.
 */
export interface DetectedStack {
  /** The detected stack identifier matching TechStack presets, or "custom" */
  stack: TechStack;
  /** The manifest file that was used for detection */
  detectedVia: string;
  /** Human-readable label for the detected stack */
  label: string;
}

/**
 * Checks whether a file exists at the given path.
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stats = await stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Reads and parses a package.json file. Returns null if the file
 * does not exist or cannot be parsed.
 */
async function readPackageJson(
  projectDir: string,
): Promise<Record<string, unknown> | null> {
  const pkgPath = join(projectDir, "package.json");
  try {
    const content = await readFile(pkgPath, "utf-8");
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Checks whether a dependency exists in package.json dependencies
 * or devDependencies.
 */
function hasDependency(
  pkg: Record<string, unknown>,
  depName: string,
): boolean {
  const deps = pkg["dependencies"];
  const devDeps = pkg["devDependencies"];

  if (deps !== null && deps !== undefined && typeof deps === "object") {
    if (depName in (deps as Record<string, unknown>)) {
      return true;
    }
  }

  if (devDeps !== null && devDeps !== undefined && typeof devDeps === "object") {
    if (depName in (devDeps as Record<string, unknown>)) {
      return true;
    }
  }

  return false;
}

/**
 * Determines the most specific Node.js stack from package.json contents.
 * Checks for framework-specific dependencies to distinguish between
 * Next.js, React Native, Vite+React, and generic Node.js CLI.
 */
function detectNodeStack(pkg: Record<string, unknown>): DetectedStack {
  // Next.js detection (maps to nextjs-supabase preset)
  if (hasDependency(pkg, "next")) {
    return {
      stack: "nextjs-supabase",
      detectedVia: "package.json",
      label: "Next.js",
    };
  }

  // React Native detection
  if (hasDependency(pkg, "react-native")) {
    return {
      stack: "react-native",
      detectedVia: "package.json",
      label: "React Native",
    };
  }

  // Vite + React detection (check vite first, then confirm React)
  if (hasDependency(pkg, "vite") && hasDependency(pkg, "react")) {
    return {
      stack: "vite-react",
      detectedVia: "package.json",
      label: "Vite + React",
    };
  }

  // Generic Node.js CLI fallback for package.json projects
  return {
    stack: "nodejs-cli",
    detectedVia: "package.json",
    label: "Node.js",
  };
}

/**
 * Auto-detects the tech stack of a project by examining manifest files
 * in the project root directory.
 *
 * Detection order:
 * 1. package.json — inspects dependencies for Next.js, React Native,
 *    Vite+React, or falls back to Node.js CLI
 * 2. go.mod — Go
 * 3. pyproject.toml or requirements.txt — Python (FastAPI preset)
 * 4. pubspec.yaml — Flutter
 * 5. Cargo.toml — Rust (returns "custom" since no Rust preset exists)
 *
 * Root-level manifests only. Does not recurse into subdirectories.
 *
 * @param projectDir - Absolute path to the project root directory
 * @returns The detected stack result, or a "custom" fallback if no manifest is found
 */
export async function detectStack(projectDir: string): Promise<DetectedStack> {
  // 1. Check package.json first (most common, and allows sub-detection)
  const pkg = await readPackageJson(projectDir);
  if (pkg !== null) {
    return detectNodeStack(pkg);
  }

  // 2. Check go.mod
  if (await fileExists(join(projectDir, "go.mod"))) {
    return {
      stack: "go",
      detectedVia: "go.mod",
      label: "Go",
    };
  }

  // 3. Check Python manifests
  if (await fileExists(join(projectDir, "pyproject.toml"))) {
    return {
      stack: "python-fastapi",
      detectedVia: "pyproject.toml",
      label: "Python",
    };
  }

  if (await fileExists(join(projectDir, "requirements.txt"))) {
    return {
      stack: "python-fastapi",
      detectedVia: "requirements.txt",
      label: "Python",
    };
  }

  // 4. Check Flutter
  if (await fileExists(join(projectDir, "pubspec.yaml"))) {
    return {
      stack: "flutter",
      detectedVia: "pubspec.yaml",
      label: "Flutter",
    };
  }

  // 5. Check Rust (no preset — returns "custom")
  if (await fileExists(join(projectDir, "Cargo.toml"))) {
    return {
      stack: "custom",
      detectedVia: "Cargo.toml",
      label: "Rust",
    };
  }

  // No manifest detected
  return {
    stack: "custom",
    detectedVia: "none",
    label: "Unknown",
  };
}
