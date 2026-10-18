import "server-only";
import { get, list, put } from "@vercel/blob";
import { createFriendbookBlobStore } from "../friendbook-blob";

export function friendbookStore() {
  return createFriendbookBlobStore({get,list,put},process.env.BLOB_READ_WRITE_TOKEN);
}
