import { authenticateApiKey } from "@/lib/mcp-auth";
import { applyRateLimit, applyApiKeyRateLimit } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";

import { matchRoute, type Route } from "../_lib/router";

import {
  handleListWorkspaces,
  handleGetWorkspace,
} from "../_handlers/workspaces";
import {
  handleListCards,
  handleGetCard,
  handleCreateCard,
  handleUpdateCard,
  handleDeleteCard,
  handleToggleChecklistItem,
  handleMoveCard,
} from "../_handlers/cards";
import { handleStartWork, handleFinishWork } from "../_handlers/work";
import {
  handleListSprints,
  handleSprintSummary,
  handleSprintColumns,
  handleCreateSprint,
  handleUpdateSprint,
} from "../_handlers/sprints";
import {
  handleListRepos,
  handleListPRs,
  handleListBranches,
  handleCreatePR,
} from "../_handlers/repos";
import {
  handleAIGenerateCards,
  handleAIEnhanceCard,
} from "../_handlers/ai";

// =============================================
// ROUTES TABLE
// =============================================

const routes: Route[] = [
  // Workspaces
  { method: "GET", pattern: ["workspaces"], handler: handleListWorkspaces },
  { method: "GET", pattern: ["workspaces", "*"], handler: handleGetWorkspace },

  // Cards
  { method: "GET", pattern: ["cards"], handler: handleListCards },
  { method: "GET", pattern: ["cards", "*"], handler: handleGetCard },
  { method: "POST", pattern: ["cards"], handler: handleCreateCard },
  { method: "PATCH", pattern: ["cards", "*"], handler: handleUpdateCard },
  { method: "DELETE", pattern: ["cards", "*"], handler: handleDeleteCard },
  { method: "POST", pattern: ["cards", "*", "move"], handler: handleMoveCard },
  { method: "POST", pattern: ["cards", "*", "start-work"], handler: handleStartWork },
  { method: "POST", pattern: ["cards", "*", "finish-work"], handler: handleFinishWork },

  // Checklists
  { method: "PATCH", pattern: ["checklist-items", "*"], handler: handleToggleChecklistItem },

  // Sprints
  { method: "GET", pattern: ["sprints"], handler: handleListSprints },
  { method: "GET", pattern: ["sprints", "*", "summary"], handler: handleSprintSummary },
  { method: "GET", pattern: ["sprints", "*", "columns"], handler: handleSprintColumns },
  { method: "POST", pattern: ["sprints"], handler: handleCreateSprint },
  { method: "PATCH", pattern: ["sprints", "*"], handler: handleUpdateSprint },

  // GitHub
  { method: "GET", pattern: ["repos"], handler: handleListRepos },
  { method: "GET", pattern: ["repos", "*", "*", "prs"], handler: handleListPRs },
  { method: "GET", pattern: ["repos", "*", "*", "branches"], handler: handleListBranches },
  { method: "POST", pattern: ["prs"], handler: handleCreatePR },

  // IA
  { method: "POST", pattern: ["ai", "generate-cards"], handler: handleAIGenerateCards },
  { method: "POST", pattern: ["ai", "enhance-card"], handler: handleAIEnhanceCard },
];

// =============================================
// ENTRY POINT
// =============================================

async function handleRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const limited = applyRateLimit(request, "api-v1", {
    maxRequests: 60,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const authResult = await authenticateApiKey(request);
  if (authResult instanceof NextResponse) return authResult;

  // Rate limit por API key (alem do IP acima)
  const keyLimited = applyApiKeyRateLimit(authResult.keyId, "api-v1");
  if (keyLimited) return keyLimited;

  const { path } = await params;
  const method = request.method;

  const matched = matchRoute(method, path, routes);
  if (!matched) {
    return NextResponse.json(
      { error: `Rota nao encontrada: ${method} /api/v1/${path.join("/")}` },
      { status: 404 }
    );
  }

  try {
    return await matched.handler(authResult, request, matched.params);
  } catch (err) {
    console.error(`[API v1] ${method} /${path.join("/")}:`, err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
