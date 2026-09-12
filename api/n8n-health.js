const N8N_HEALTH_URL = 'https://n8n.meuapp-on.online/healthz';
const HEALTH_TIMEOUT_MS = 5_000;

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ online: false });
  }

  const controller = new globalThis.AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

  try {
    const healthResponse = await globalThis.fetch(N8N_HEALTH_URL, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!healthResponse.ok) {
      return response.status(503).json({ online: false });
    }

    const health = await healthResponse.json();
    const online = health?.status === 'ok';
    return response.status(online ? 200 : 503).json({ online });
  } catch {
    return response.status(503).json({ online: false });
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}
