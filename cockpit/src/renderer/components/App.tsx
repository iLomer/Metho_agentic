import { useCockpitStore } from "../store";

export function App(): React.JSX.Element {
  const projectCount = useCockpitStore((s) => s.projects.length);

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-neutral-950 text-white">
      <h1 className="text-4xl font-bold tracking-tight">Meto Cockpit</h1>
      <p className="mt-4 text-lg text-neutral-400">
        Multi-project orchestrator for Claude Code
      </p>
      <div className="mt-8 rounded-lg border border-neutral-800 bg-neutral-900 px-6 py-4 text-sm text-neutral-500">
        {projectCount} projects registered
      </div>
    </div>
  );
}
