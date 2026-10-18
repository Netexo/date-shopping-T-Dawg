import { OrderValidationError } from "../../lib/order-validation";
import { orderStore } from "../../lib/server/order-store";
import { checkOrigin, errorResponse, json, readJson } from "../../lib/server/http";


export async function POST(request) {
  try {
    checkOrigin(request);
    const receipt = await orderStore().create(await readJson(request));
    return json({ receipt });
  } catch (error) {
    if (error instanceof OrderValidationError) return json({ error: error.message }, 400);
    return errorResponse(error);
  }
}
