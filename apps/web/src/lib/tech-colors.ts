/**
 * Maps technology names to Tailwind color classes for badges.
 * Uses lowercase matching for flexibility.
 */
const TECH_COLORS: Record<string, string> = {
  // Languages
  typescript: "text-blue-400",
  javascript: "text-yellow-400",
  python: "text-emerald-400",
  rust: "text-orange-400",
  go: "text-cyan-400",
  ruby: "text-red-400",
  swift: "text-orange-300",
  kotlin: "text-purple-400",
  java: "text-red-300",
  php: "text-indigo-300",
  "c#": "text-green-400",
  "c++": "text-blue-300",

  // Frameworks
  "next.js": "text-neutral-200",
  react: "text-sky-400",
  vue: "text-emerald-400",
  svelte: "text-orange-400",
  nuxt: "text-green-400",
  angular: "text-red-400",
  astro: "text-purple-300",
  remix: "text-blue-300",
  "node.js": "text-green-400",
  express: "text-neutral-300",
  fastify: "text-neutral-300",
  django: "text-green-300",
  flask: "text-neutral-300",
  rails: "text-red-400",
  laravel: "text-red-300",

  // CSS / UI
  tailwind: "text-cyan-400",
  "tailwind css": "text-cyan-400",
  css: "text-blue-300",
  "shadcn/ui": "text-neutral-200",
  sass: "text-pink-400",

  // Databases & BaaS
  supabase: "text-emerald-400",
  firebase: "text-amber-400",
  postgresql: "text-blue-300",
  postgres: "text-blue-300",
  mysql: "text-blue-400",
  mongodb: "text-green-400",
  redis: "text-red-400",
  prisma: "text-indigo-300",
  drizzle: "text-green-300",

  // Hosting & infra
  vercel: "text-neutral-200",
  netlify: "text-teal-400",
  aws: "text-amber-400",
  docker: "text-blue-400",
  cloudflare: "text-orange-400",

  // Tools & testing
  vitest: "text-green-400",
  jest: "text-red-300",
  playwright: "text-green-300",
  storybook: "text-pink-400",
  git: "text-orange-400",
  github: "text-neutral-200",

  // AI tools
  "claude code": "text-amber-300",
  cursor: "text-purple-400",
  v0: "text-neutral-200",
  bolt: "text-yellow-400",
  lovable: "text-pink-400",
  copilot: "text-blue-300",
  "github copilot": "text-blue-300",
  chatgpt: "text-emerald-300",

  // Other
  stripe: "text-purple-400",
  resend: "text-blue-300",
  zod: "text-blue-400",
  pnpm: "text-amber-400",
  bun: "text-neutral-200",
  turbopack: "text-red-400",
};

export function getTechColor(tech: string): string {
  const key = tech.toLowerCase().trim();

  // Exact match
  if (TECH_COLORS[key]) return TECH_COLORS[key];

  // Partial match (e.g. "Next.js 16" matches "next.js")
  for (const [pattern, color] of Object.entries(TECH_COLORS)) {
    if (key.includes(pattern) || pattern.includes(key)) return color;
  }

  return "text-neutral-500";
}
