import type { Handler } from "./helpers";

export interface Route {
  method: string;
  pattern: string[];
  handler: Handler;
}

export function matchRoute(
  method: string,
  segments: string[],
  routes: Route[]
): { handler: Handler; params: string[] } | null {
  for (const route of routes) {
    if (route.method !== method) continue;
    if (route.pattern.length !== segments.length) continue;

    const params: string[] = [];
    let match = true;
    for (let i = 0; i < route.pattern.length; i++) {
      if (route.pattern[i] === "*") {
        params.push(segments[i]);
      } else if (route.pattern[i] === "**") {
        params.push(segments.slice(i).join("/"));
        break;
      } else if (route.pattern[i] !== segments[i]) {
        match = false;
        break;
      }
    }
    if (match) return { handler: route.handler, params };
  }
  return null;
}
