// GET   /api/requests/:id -> request + events + latest forecast run + decisions + activity
// PATCH /api/requests/:id -> edit draft fields / confirm AI-extracted events (logs EVENT_CONFIRMED)
import { notImplemented } from "../../notImplemented";

export async function GET() {
  return notImplemented("GET /api/requests/:id");
}
export async function PATCH() {
  return notImplemented("PATCH /api/requests/:id");
}
