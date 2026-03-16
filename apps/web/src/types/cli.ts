import type { ConnectedService, ProjectUrls } from "@/types/database";

/**
 * The shape of a project object returned by CLI API endpoints.
 * Matches the columns selected from the projects table.
 */
export interface CliProjectResponse {
  id: string;
  name: string;
  description: string | null;
  status: string;
  stack: string[];
  ai_tools: string[];
  connected_services: ConnectedService[];
  urls: ProjectUrls;
  monthly_cost: number;
  notes: string | null;
  is_public: boolean;
  slug: string | null;
  created_at: string;
  updated_at: string;
}
