import test from 'node:test';
import assert from 'node:assert/strict';
import { probeOrderApi } from './order-api-probe.mjs';

function fakeApi(replies) {
  const calls = [];
  return {
    calls,
    fetchImpl: async (url, options) => {
      calls.push({ path: new URL(url).pathname, payload: JSON.parse(options.body), method: options.method });
      assert.equal(options.headers.Authorization, 'Bearer test-only');
      const reply = replies.shift();
      assert.ok(reply, 'Chamada extra não prevista');
      return new Response(JSON.stringify(reply.data), { status: reply.status });
    },
  };
}
const config = { url: 'https://supabase.test', key: 'test-only' };

test('probe anônimo só usa IDs nulos e reconhece negação das duas RPCs', async () => {
  const api = fakeApi([
    { status: 401, data: { code: '42501', message: 'permission denied for function submit_order_once' } },
    { status: 401, data: { code: '42501', message: 'permission denied for function claim_order_notification' } },
  ]);
  assert.ok((await probeOrderApi({ ...config, ...api })).every(result => result.ok));
  assert.deepEqual(api.calls, [
    { path: '/rest/v1/rpc/submit_order_once', method: 'POST', payload: { p_request_id: null, p_order: {}, p_coupon_id: null } },
    { path: '/rest/v1/rpc/claim_order_notification', method: 'POST', payload: { p_request_id: null } },
  ]);
});

test('probe autenticado exige cliente e só verifica caminhos sem gravação', async () => {
  const api = fakeApi([
    { status: 200, data: 'customer' },
    { status: 403, data: { code: '42501', message: 'Authenticated user and request ID are required' } },
    { status: 200, data: false },
  ]);
  const results = await probeOrderApi({ ...config, ...api, authenticated: true });
  assert.equal(results.length, 3);
  assert.ok(results.every(result => result.ok));
  assert.deepEqual(api.calls.map(call => call.payload), [{}, { p_request_id: null, p_order: {}, p_coupon_id: null }, { p_request_id: null }]);
});

test('probe interrompe se a conta é administrativa', async () => {
  const api = fakeApi([{ status: 200, data: 'admin' }]);
  assert.deepEqual(await probeOrderApi({ ...config, ...api, authenticated: true }), [{ name: 'Conta com perfil de cliente', ok: false }]);
  assert.equal(api.calls.length, 1);
});

test('RPC inexistente não é confundida com bloqueio de acesso', async () => {
  const api = fakeApi([1, 2].map(() => ({ status: 404, data: { code: 'PGRST202', message: 'Function not found' } })));
  assert.ok((await probeOrderApi({ ...config, ...api })).every(result => !result.ok));
});
