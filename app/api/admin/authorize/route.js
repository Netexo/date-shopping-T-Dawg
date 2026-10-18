import { cookies } from "next/headers";
import { oauthConfig, startOAuth, FLOW_COOKIE } from "../../../lib/admin-oauth";
import { errorResponse, privateHeaders } from "../../../lib/server/http";

export async function GET(request) {
  try {
    const config = oauthConfig();
    if (new URL(request.url).origin !== config.origin) return new Response(null,{status:303,headers:{...privateHeaders,Location:`${config.origin}/api/admin/authorize`}});
    const flow = startOAuth(config);
    (await cookies()).set(FLOW_COOKIE,flow.cookie,{httpOnly:true,sameSite:"lax",secure:config.secure,path:"/api/admin",maxAge:600});
    return new Response(null,{status:303,headers:{...privateHeaders,Location:flow.url}});
  } catch (error) { return errorResponse(error); }
}
