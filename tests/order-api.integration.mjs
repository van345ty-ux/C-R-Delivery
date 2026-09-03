// Escritas apenas no compose local descartável. Não carrega .env de produção.
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { createOrderSubmitter } from '../src/utils/orderSubmission.ts';

const origin = 'http://127.0.0.1:58087';
const secret = 'local-only-cr-sushi-orders-jwt-secret-do-not-use-outside-tests';
const user1 = '00000000-0000-4000-8000-000000000001';
const user2 = '00000000-0000-4000-8000-000000000002';
const couponId = '00000000-0000-4000-8000-000000000010';
const failedCouponId = '00000000-0000-4000-8000-000000000011';

const marker = await fetch(`${origin}/rpc/cr_sushi_test_environment`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(10000),
});
assert.equal(await marker.json(), 'cr-sushi-isolated-order-api', 'Destino não identificado como banco descartável');

function jwt(userId) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const body = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ role: userId ? 'authenticated' : 'anon', sub: userId, exp: Math.floor(Date.now() / 1000) + 600 })}`;
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}
function client(userId) {
  return createClient(origin, jwt(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      headers: { Authorization: `Bearer ${jwt(userId)}` },
      fetch: (input, options) => {
        const target = new URL(input);
        assert.equal(target.origin, origin, 'Destino externo bloqueado');
        assert.ok(target.pathname.startsWith('/rest/v1/'), 'Somente REST local é permitido; auth/functions/envios bloqueados');
        target.pathname = target.pathname.slice('/rest/v1'.length);
        return fetch(target, { ...options, signal: options?.signal || AbortSignal.timeout(10000) });
      },
    },
  });
}
const api = client(user1);
const other = client(user2);
const anonymous = client();

function payload(method = 'cash', coupon) {
  return {
    user_id: user1,
    items: [
      { product_id: 'combo-local', name: 'Combo fictício', quantity: 1, price: 30, observations: 'sem cebola' },
      { product_id: 'combo-local', name: 'Combo fictício', quantity: 1, price: 30, observations: 'sem molho' },
    ],
    total: coupon ? 54 : 60, delivery_fee: 0, delivery_type: 'pickup', payment_method: method,
    address: null, status: 'Pedido recebido', customer_name: 'Teste local', customer_phone: '',
    coupon_used: coupon, change_for: method === 'cash' ? 100 : null, sushi_egg_delivery_day: null,
  };
}
function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
async function value(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
function setup({ storage = memoryStorage(), loseFirstResponse = false } = {}) {
  const notifications = [], replies = [];
  let lose = loseFirstResponse;
  const dependencies = {
    storage, uuid: randomUUID,
    submit: async (attempt, signal) => {
      const data = await value(api.rpc('submit_order_once', { p_request_id: attempt.requestId, p_order: attempt.payload, p_coupon_id: attempt.couponId }).abortSignal(signal));
      replies.push(data);
      // A API concluiu e fez COMMIT; simula perda da resposta antes de entregá-la ao aplicativo.
      if (lose) { lose = false; throw new Error('Resposta perdida depois do COMMIT local'); }
      return data.order;
    },
    claimNotification: async (requestId, signal) => value(api.rpc('claim_order_notification', { p_request_id: requestId }).abortSignal(signal)),
    notify: async order => { notifications.push(order); }, // Nenhum serviço de mensagens é chamado.
  };
  return { sender: createOrderSubmitter(dependencies), storage, notifications, replies };
}
const rowsFor = requestId => value(api.from('orders').select('*').eq('client_request_id', requestId));
const claimsFor = requestId => value(api.from('order_notification_claims').select('*').eq('request_id', requestId));
const couponUses = async id => (await value(api.from('coupons').select('usage_count').eq('id', id).single())).usage_count;

await test('JWT de cliente aplica perfil e API nega criação anônima', async () => {
  assert.equal(await value(api.rpc('get_my_role')), 'customer');
  const result = await anonymous.rpc('submit_order_once', { p_request_id: randomUUID(), p_order: payload(), p_coupon_id: null });
  assert.equal(result.error?.code, '42501');
});

for (const method of ['cash', 'pix', 'card']) {
  await test(`SDK + rotina real: pedido ${method}, recuperação e observações preservadas`, async () => {
    const state = setup();
    const first = await state.sender.send(user1, payload(method));
    const replay = await state.sender.send(user1, { ...payload(method), total: 999 });
    assert.equal(replay.id, first.id);
    assert.equal(replay.total, 60);
    assert.equal(replay.paymentMethod, method);
    assert.deepEqual(replay.items.map(item => item.observations), ['sem cebola', 'sem molho']);
    assert.equal((await rowsFor(first.clientRequestId)).length, 1);
    assert.equal((await claimsFor(first.clientRequestId)).length, 1);
    assert.equal(state.notifications.length, 1);
    assert.deepEqual(state.replies.map(reply => reply.created), [true, false]);
    state.sender.acknowledge(user1, first.clientRequestId);
    assert.equal(state.sender.hasPending(user1), false);
    const next = await state.sender.send(user1, payload(method));
    assert.notEqual(next.id, first.id, 'Pedido legítimo seguinte precisa de outra identidade');
    assert.notEqual(next.clientRequestId, first.clientRequestId);
  });
}

await test('Resposta perdida após COMMIT é recuperada por outra instância sem duplicar cupom', async () => {
  const before = await couponUses(couponId);
  const first = setup({ loseFirstResponse: true });
  await assert.rejects(first.sender.send(user1, payload('cash', 'TESTE'), couponId), /Resposta perdida/);
  const attempt = first.sender.readAttempt(user1);
  assert.equal(first.sender.hasPending(user1), true);
  const [stored] = await rowsFor(attempt.requestId);
  assert.ok(stored?.id);
  assert.equal(first.notifications.length, 0);
  const recovered = setup({ storage: first.storage });
  const order = await recovered.sender.send(user1, { ...payload('card'), total: 999 });
  assert.equal(order.id, stored.id);
  assert.equal(order.total, 54);
  assert.equal(order.paymentMethod, 'cash');
  assert.equal(await couponUses(couponId), before + 1);
  assert.equal((await rowsFor(attempt.requestId)).length, 1);
  assert.equal((await claimsFor(attempt.requestId)).length, 1);
  assert.equal(recovered.notifications.length, 1);
  assert.equal(recovered.replies[0].created, false);
});

await test('Duas instâncias enviam a mesma tentativa pela API: um pedido, um cupom e uma reserva', async () => {
  const before = await couponUses(couponId);
  const storage = memoryStorage();
  const left = setup({ storage }), right = setup({ storage });
  const [a, b] = await Promise.all([
    left.sender.send(user1, payload('pix', 'TESTE'), couponId),
    right.sender.send(user1, payload('pix', 'TESTE'), couponId),
  ]);
  assert.equal(a.id, b.id);
  assert.equal((await rowsFor(a.clientRequestId)).length, 1);
  assert.equal((await claimsFor(a.clientRequestId)).length, 1);
  assert.equal(await couponUses(couponId), before + 1);
  assert.equal(left.notifications.length + right.notifications.length, 1);
  assert.deepEqual([...left.replies, ...right.replies].map(reply => reply.created).sort(), [false, true]);
});

await test('Falha de cupom na API desfaz pedido e mantém tentativa para reconciliação', async () => {
  const before = await couponUses(failedCouponId);
  const state = setup();
  await assert.rejects(state.sender.send(user1, payload('cash', 'FALHA'), failedCouponId), error => error.message.includes('Falha simulada do cupom'));
  const attempt = state.sender.readAttempt(user1);
  assert.equal((await rowsFor(attempt.requestId)).length, 0);
  assert.equal((await claimsFor(attempt.requestId)).length, 0);
  assert.equal(await couponUses(failedCouponId), before);
  assert.equal(state.notifications.length, 0);
  assert.equal(state.sender.hasPending(user1), true);
});

await test('Outra conta não lê, recupera ou reserva o pedido do primeiro cliente', async () => {
  const state = setup();
  const order = await state.sender.send(user1, payload());
  assert.deepEqual(await value(other.from('orders').select('id').eq('client_request_id', order.clientRequestId)), []);
  assert.equal(await value(other.rpc('claim_order_notification', { p_request_id: order.clientRequestId })), false);
  const collision = await other.rpc('submit_order_once', { p_request_id: order.clientRequestId, p_order: { ...payload(), user_id: user2 }, p_coupon_id: null });
  assert.equal(collision.error?.code, '42501');
  const spoof = await other.rpc('submit_order_once', { p_request_id: randomUUID(), p_order: payload(), p_coupon_id: null });
  assert.equal(spoof.error?.code, '42501');
});
