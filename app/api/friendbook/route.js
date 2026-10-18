import { requireAdmin } from "../../lib/server/auth";
import { friendbookStore } from "../../lib/server/friendbook-store";
import { checkOrigin, errorResponse, json, readJson } from "../../lib/server/http";

export async function POST(request) {
  try {
    checkOrigin(request);
    return json({receipt:await friendbookStore().create(await readJson(request,180000))});
  } catch (error) { return errorResponse(error); }
}
export async function GET(request) {
  try {
    await requireAdmin();
    const requested = Number(new URL(request.url).searchParams.get("page") || 0);
    const page = Number.isSafeInteger(requested) && requested >= 0 && requested <= 10000 ? requested : 0;
    return json(await friendbookStore().list(page));
  } catch (error) { return errorResponse(error); }
}
