// Chamadas fixas, sem ID de pedido: não cria pedidos nem reserva notificações.
// A sessão (quando fornecida) fica com o chamador; não é registrada no resultado.
export async function probeOrderApi({ url, key, accessToken = key, authenticated = false, fetchImpl = fetch }) {
  const origin = new URL(url).origin;
  const results = [];
  async function rpc(name, payload) {
    const response = await fetchImpl(`${origin}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    return { status: response.status, ok: response.ok, data: await response.json() };
  }
  if (authenticated) {
    const role = await rpc('get_my_role', {});
    const ok = role.ok && role.data === 'customer';
    results.push({ name: 'Conta com perfil de cliente', ok });
    if (!ok) return results;
  }
  const submit = await rpc('submit_order_once', { p_request_id: null, p_order: {}, p_coupon_id: null });
  results.push({
    name: authenticated ? 'Criação recusa tentativa sem identificador' : 'Criação bloqueada sem login',
    ok: !submit.ok && submit.data?.code === '42501'
      && (authenticated
        ? submit.data.message === 'Authenticated user and request ID are required'
        : /permission denied for function submit_order_once/i.test(submit.data.message || '')),
    http: submit.status,
    code: submit.data?.code,
  });
  const claim = await rpc('claim_order_notification', { p_request_id: null });
  results.push({
    name: authenticated ? 'Notificação sem identificador não é reservada' : 'Reserva de notificação bloqueada sem login',
    ok: authenticated
      ? claim.ok && claim.data === false
      : !claim.ok && claim.data?.code === '42501'
        && /permission denied for function claim_order_notification/i.test(claim.data.message || ''),
    http: claim.status,
    code: claim.data?.code,
  });
  return results;
}
