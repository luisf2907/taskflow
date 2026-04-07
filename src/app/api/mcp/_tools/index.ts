import type { ToolDef } from "../_lib/types";
import { workspaceTools } from "./workspaces";
import { cardTools } from "./cards";
import { sprintTools } from "./sprints";
import { repoTools } from "./repos";
import { workTools } from "./work";
import { aiTools } from "./ai";

export const tools: ToolDef[] = [
  ...workspaceTools,
  ...cardTools,
  ...sprintTools,
  ...repoTools,
  ...workTools,
  ...aiTools,
];
