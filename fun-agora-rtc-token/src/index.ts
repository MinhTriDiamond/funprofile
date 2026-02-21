import { RtcTokenBuilder, RtcRole } from 'agora-token';
import { handleCors, addCorsHeaders } from './cors';
import { validateInput } from './validate';

interface Env {
  AGORA_APP_ID: string;
  AGORA_APP_CERTIFICATE: string;
  API_KEY: string;
  ALLOWED_ORIGINS: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    const corsResponse = handleCors(request, env.ALLOWED_ORIGINS);
    if (corsResponse) return corsResponse;

    // Only allow POST
    if (request.method !== 'POST') {
      return addCorsHeaders(
        new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 }),
        request, env.ALLOWED_ORIGINS
      );
    }

    // Authenticate via X-API-Key
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey || apiKey !== env.API_KEY) {
      return addCorsHeaders(
        new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
        request, env.ALLOWED_ORIGINS
      );
    }

    try {
      const body = await request.json() as { channelName?: string; uid?: string | number; role?: string };
      const validation = validateInput(body);
      if (!validation.valid) {
        return addCorsHeaders(
          new Response(JSON.stringify({ error: validation.error }), { status: 400 }),
          request, env.ALLOWED_ORIGINS
        );
      }

      const { channelName, uid, role } = body;
      const agoraRole = role === 'subscriber' ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;

      // Token expires in 24 hours
      const expirationInSeconds = 86400;
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const privilegeExpiredTs = currentTimestamp + expirationInSeconds;

      // Use 0 as uid for string-based uid (Agora will use account name)
      const uidNum = typeof uid === 'number' ? uid : 0;
      const userAccount = typeof uid === 'string' ? uid : '';

      let token: string;
      if (userAccount) {
        token = RtcTokenBuilder.buildTokenWithUserAccount(
          env.AGORA_APP_ID,
          env.AGORA_APP_CERTIFICATE,
          channelName!,
          userAccount,
          agoraRole,
          expirationInSeconds,
          expirationInSeconds
        );
      } else {
        token = RtcTokenBuilder.buildTokenWithUid(
          env.AGORA_APP_ID,
          env.AGORA_APP_CERTIFICATE,
          channelName!,
          uidNum,
          agoraRole,
          expirationInSeconds,
          expirationInSeconds
        );
      }

      const result = {
        token,
        app_id: env.AGORA_APP_ID,
        uid: userAccount || uidNum,
        channel: channelName,
        expires_at: privilegeExpiredTs,
      };

      return addCorsHeaders(
        new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
        request, env.ALLOWED_ORIGINS
      );
    } catch (err: any) {
      console.error('Token generation error:', err);
      return addCorsHeaders(
        new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500 }),
        request, env.ALLOWED_ORIGINS
      );
    }
  },
};
