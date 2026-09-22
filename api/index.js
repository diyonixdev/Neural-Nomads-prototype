// Vercel serverless entry point for the FarmDirect API.
// vercel.json rewrites every /api/* request here, passing the original path
// in the __path query parameter, and we hand it to the existing Node handler
// in server/aiIntentApi.mjs unchanged.
import requestHandler from '../server/aiIntentApi.mjs';

// Routes the API server serves at the root rather than under /api.
const ROOT_PATHS = new Set(['docs', 'health']);

export default function handler(request, response) {
  const captured = request.query?.__path;
  if (typeof captured === 'string') {
    // Rebuild the query string the caller actually sent, minus our own marker.
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(request.query)) {
      if (key === '__path') continue;
      for (const v of Array.isArray(value) ? value : [value]) params.append(key, v);
    }
    const search = params.toString();
    const path = captured.replace(/^\/+/, '');
    const pathname = ROOT_PATHS.has(path) ? `/${path}` : `/api/${path}`;
    request.url = search ? `${pathname}?${search}` : pathname;
  }
  return requestHandler(request, response);
}
