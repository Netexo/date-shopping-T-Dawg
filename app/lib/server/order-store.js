import "server-only";
import { get, list, put } from "@vercel/blob";
import { createOrderBlobStore } from "../order-blob";

import { friendbookStore } from "./friendbook-store";

export function orderStore() {
  return createOrderBlobStore({ get, list, put }, process.env.BLOB_READ_WRITE_TOKEN, friendbookStore());
}
