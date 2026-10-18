import { cookies } from "next/headers";
import { oauthConfig, verifyFlow, authenticateCode, FLOW_COOKIE } from "../../../lib/admin-oauth";
import { ADMIN_COOKIE, SESSION_SECONDS } from "../../../lib/admin-session";
import { privateHeaders, errorResponse } from "../../../lib/server/http";
import { BackendError } from "../../../lib/backend-error";

export async function GET(request) {
  try {
    const config = oauthConfig();
    const url = new URL(request.url);
    if (url.origin !== config.origin) throw new BackendError("Die Callback-Adresse ist ungültig.",400);
    const jar = await cookies();
    const flow = verifyFlow(jar.get(FLOW_COOKIE)?.value,url.searchParams.get("state"),config);
    jar.set(FLOW_COOKIE,"",{httpOnly:true,sameSite:"lax",secure:config.secure,path:"/api/admin",maxAge:0});
    if (!flow || url.searchParams.has("error")) throw new BackendError("Die Anmeldung wurde abgebrochen oder ist abgelaufen. Bitte erneut anmelden.",401);
    const session = await authenticateCode(url.searchParams.get("code"),flow,config);
    jar.set(ADMIN_COOKIE,session,{httpOnly:true,sameSite:"strict",secure:config.secure,path:"/",maxAge:SESSION_SECONDS});
    return new Response(null,{status:303,headers:{...privateHeaders,Location:`${config.origin}/admin`}});
  } catch (error) { return errorResponse(error); }
}
