export interface TaskDependency {
  sliceId: string;
  needs: string[];
  blocks: string[];
}
