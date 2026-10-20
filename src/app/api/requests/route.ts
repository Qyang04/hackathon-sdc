// Owner: B. Contract in docs/CONTRACTS.md.
// GET  /api/requests        -> list requests (id, title, client, status, createdAt)
// POST /api/requests        -> create a DRAFT request with proposal events; logs REQUEST_CREATED
import { notImplemented } from "../notImplemented";

export async function GET() {
  return notImplemented("GET /api/requests");
}
export async function POST() {
  return notImplemented("POST /api/requests");
}
