import { listWorkTasks } from "@/lib/workTasks.js";
import { jsonResponse } from "@/lib/http.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/work-tasks — alimenta o Kanban em src/app/(panels)/work-tasks/page.js. */
export async function GET() {
  try {
    const tasks = await listWorkTasks();
    return jsonResponse({ ok: true, tasks });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err?.message || err) }, 500);
  }
}
