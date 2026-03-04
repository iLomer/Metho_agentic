/**
 * Represents a node in a file tree structure.
 * Each node has a name and optional children (directories have children, files do not).
 */
interface TreeNode {
  name: string;
  children: Map<string, TreeNode>;
}

/**
 * Builds a tree structure from a list of file paths.
 * Paths are split on "/" to create nested directory nodes.
 */
function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = { name: "", children: new Map() };

  for (const filePath of paths) {
    const parts = filePath.split("/");
    let current = root;

    for (const part of parts) {
      if (!current.children.has(part)) {
        current.children.set(part, { name: part, children: new Map() });
      }
      current = current.children.get(part)!;
    }
  }

  return root;
}

/**
 * Recursively formats a tree node into indented text lines.
 * Uses box-drawing characters for visual structure.
 */
function formatNode(
  node: TreeNode,
  prefix: string,
  isLast: boolean,
  lines: string[],
): void {
  const connector = isLast ? "└── " : "├── ";
  const extension = isLast ? "    " : "│   ";

  if (node.name !== "") {
    lines.push(`${prefix}${connector}${node.name}`);
  }

  const children = Array.from(node.children.values()).sort((a, b) => {
    const aIsDir = a.children.size > 0;
    const bIsDir = b.children.size > 0;
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return a.name.localeCompare(b.name);
  });

  const childPrefix = node.name === "" ? "" : prefix + extension;

  for (let i = 0; i < children.length; i++) {
    const isChildLast = i === children.length - 1;
    formatNode(children[i], childPrefix, isChildLast, lines);
  }
}

/**
 * Formats a list of relative file paths into a tree-view string.
 * The output uses box-drawing characters to show hierarchy.
 *
 * @param paths - Array of relative file paths (using "/" as separator)
 * @returns Formatted tree string
 */
export function formatFileTree(paths: string[]): string {
  const normalizedPaths = paths.map((p) => p.replace(/\\/g, "/"));
  const root = buildTree(normalizedPaths);
  const lines: string[] = [];

  const children = Array.from(root.children.values()).sort((a, b) => {
    const aIsDir = a.children.size > 0;
    const bIsDir = b.children.size > 0;
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return a.name.localeCompare(b.name);
  });

  for (let i = 0; i < children.length; i++) {
    const isLast = i === children.length - 1;
    formatNode(children[i], "", isLast, lines);
  }

  return lines.join("\n");
}
