import { create } from "zustand";
import type { CockpitProject, AppState } from "../../shared/types";

interface CockpitStoreState {
  projects: CockpitProject[];
  appState: AppState;
}

const initialState: CockpitStoreState = {
  projects: [],
  appState: {
    sidebarOpen: true,
    activeProjectId: null,
  },
};

export const useCockpitStore = create<CockpitStoreState>()(() => initialState);
