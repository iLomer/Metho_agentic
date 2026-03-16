"use client";

import { useActionState, useState, useEffect } from "react";
import { linkRepo, type LinkRepoState } from "./link-repo-action";

interface LinkRepoClientProps {
  projectId: string;
  currentRepo: string | null;
}

interface RepoOption {
  full_name: string;
  name: string;
  description: string | null;
}

const initialState: LinkRepoState = { error: null, success: false };

export function LinkRepoClient({ projectId, currentRepo }: LinkRepoClientProps) {
  const [repos, setRepos] = useState<RepoOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [state, formAction, isPending] = useActionState(linkRepo, initialState);

  useEffect(() => {
    if (state.success) {
      setShowPicker(false);
    }
  }, [state.success]);

  async function loadRepos() {
    setLoading(true);
    try {
      const response = await fetch("/api/github/repos");
      if (response.ok) {
        const data = await response.json() as { repos: RepoOption[] };
        setRepos(data.repos);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleOpen() {
    setShowPicker(true);
    void loadRepos();
  }

  if (currentRepo && !showPicker) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-neutral-600">repo:</span>
        <span className="font-mono text-xs text-neutral-400">{currentRepo}</span>
        <button
          type="button"
          onClick={handleOpen}
          className="font-mono text-[10px] text-cyan-600 hover:text-cyan-400"
        >
          change
        </button>
      </div>
    );
  }

  if (!showPicker) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="rounded-md border border-dashed border-neutral-700 px-3 py-1.5 font-mono text-xs text-neutral-500 transition-colors hover:border-neutral-500 hover:text-neutral-300"
      >
        + link github repo
      </button>
    );
  }

  return (
    <div className="border border-neutral-800 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-xs text-neutral-300">select repo</span>
        <button
          type="button"
          onClick={() => setShowPicker(false)}
          className="font-mono text-[10px] text-neutral-600 hover:text-neutral-400"
        >
          cancel
        </button>
      </div>

      {state.error && (
        <div className="mb-2 font-mono text-[10px] text-red-400">{state.error}</div>
      )}

      {loading ? (
        <p className="font-mono text-[10px] text-neutral-600">loading repos...</p>
      ) : (
        <div className="max-h-60 space-y-1 overflow-y-auto">
          {repos.map((repo) => (
            <form key={repo.full_name} action={formAction}>
              <input type="hidden" name="project_id" value={projectId} />
              <input type="hidden" name="repo_full_name" value={repo.full_name} />
              <button
                type="submit"
                disabled={isPending}
                className="w-full text-left rounded-sm px-2 py-1.5 transition-colors hover:bg-neutral-800/50 disabled:opacity-50"
              >
                <span className="font-mono text-xs text-neutral-300">{repo.name}</span>
                {repo.description && (
                  <span className="ml-2 font-mono text-[10px] text-neutral-600 line-clamp-1">
                    {repo.description}
                  </span>
                )}
              </button>
            </form>
          ))}
          {repos.length === 0 && (
            <p className="font-mono text-[10px] text-neutral-600">no repos found</p>
          )}
        </div>
      )}
    </div>
  );
}
