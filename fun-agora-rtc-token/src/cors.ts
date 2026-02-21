export function handleCors(request: Request, allowedOriginsStr: string): Response | null {
  if (request.method !== 'OPTIONS') return null;

  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = allowedOriginsStr.split(',').map(o => o.trim());
  const isAllowed = allowedOrigins.includes(origin) || allowedOrigins.includes('*');

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export function addCorsHeaders(response: Response, request: Request, allowedOriginsStr: string): Response {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = allowedOriginsStr.split(',').map(o => o.trim());
  const isAllowed = allowedOrigins.includes(origin) || allowedOrigins.includes('*');

  const newResponse = new Response(response.body, response);
  newResponse.headers.set('Access-Control-Allow-Origin', isAllowed ? origin : allowedOrigins[0]);
  newResponse.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  return newResponse;
}
