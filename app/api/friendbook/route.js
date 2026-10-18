import { friendbookStore } from "../../lib/server/friendbook-store";
import { checkOrigin, errorResponse, json, readJson } from "../../lib/server/http";


export async function POST(request) {
  try {
    checkOrigin(request);
    return json({receipt:await friendbookStore().create(await readJson(request,180000))});
  } catch (error) { return errorResponse(error); }
}
