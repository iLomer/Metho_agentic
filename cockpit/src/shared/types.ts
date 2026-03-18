/** Represents a project registered in the cockpit */
export interface CockpitProject {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  lastOpenedAt: string;
  status: "idle" | "active" | "error";
}

/** Overall application state */
export interface AppState {
  sidebarOpen: boolean;
  activeProjectId: string | null;
}

/** The complete cockpit store shape */
export interface CockpitStore {
  projects: CockpitProject[];
  appState: AppState;
}
