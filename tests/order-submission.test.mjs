import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
const { outputText } = ts.transpileModule(readFileSync(new URL('../src/utils/orderSubmission.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
});
const { createOrderSubmitter, orderAttemptKey } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const payload = {
  user_id: 'cliente', items: [{ product_id: 'combo', name: 'Combo', quantity: 2, price: 30, observations: 'sem cebola' }],
  total: 60, delivery_fee: 0, delivery_type: 'pickup', payment_method: 'cash', address: null,
  status: 'Pedido recebido', customer_name: 'Teste', customer_phone: '', change_for: null, sushi_egg_delivery_day: null,
};
function setup() {
  const values = new Map(), rows = new Map(), claims = new Set(), calls = [], notifications = [];
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  let count = 0;
  const dependencies = {
    storage, uuid: () => `request-${++count}`, timeoutMs: 20,
    submit: async attempt => {
      calls.push(attempt.requestId);
      if (!rows.has(attempt.requestId)) rows.set(attempt.requestId, { ...attempt.payload, id: `order-${rows.size}`, client_request_id: attempt.requestId, order_number: 1, created_at: '2026-09-02T23:00:00Z' });
      return rows.get(attempt.requestId);
    },
    claimNotification: async id => { if (claims.has(id)) return false; claims.add(id); return true; },
    notify: async order => notifications.push(order),
  };
  return { dependencies, storage, rows, claims, calls, notifications, values };
}

test('resposta perdida após gravar recupera o mesmo pedido e envia uma única notificação', async () => {
  const env = setup();
  const submit = env.dependencies.submit;
  let loseResponse = true;
  const client = createOrderSubmitter({ ...env.dependencies, submit: async (...args) => {
    const row = await submit(...args);
    if (loseResponse) { loseResponse = false; throw new Error('Conexão perdida'); }
    return row;
  } });
  await assert.rejects(client.send('cliente', payload));
  assert(client.hasPending('cliente'));
  const order = await client.send('cliente', { ...payload, total: 999 });
  assert.equal(order.total, 60);
  assert.equal(env.rows.size, 1);
  assert.deepEqual(env.calls, ['request-1', 'request-1']);
  assert.equal(env.notifications.length, 1);
});

test('timeout aborta espera; resposta tardia não cria outra notificação e retry mantém a chave', async () => {
  const env = setup();
  let signal, finish;
  const submit = env.dependencies.submit;
  let first = true;
  const client = createOrderSubmitter({ ...env.dependencies, submit: async (attempt, abortSignal) => {
    const row = await submit(attempt);
    if (first) { first = false; signal = abortSignal; return new Promise(resolve => { finish = () => resolve(row); }); }
    return row;
  } });
  await assert.rejects(client.send('cliente', payload), /resposta demorou/);
  assert(signal.aborted);
  await client.send('cliente');
  finish();
  await Promise.resolve();
  assert.equal(env.rows.size, 1);
  assert.equal(env.notifications.length, 1);
});

test('nova instância após recarregar usa a tentativa salva com seus dados originais', async () => {
  const env = setup();
  const failing = createOrderSubmitter({ ...env.dependencies, submit: async () => { throw new Error('offline'); } });
  await assert.rejects(failing.send('cliente', payload, 'cupom'));
  const restored = createOrderSubmitter(env.dependencies);
  assert.equal(restored.readAttempt('cliente').couponId, 'cupom');
  assert.equal((await restored.send('cliente')).items[0].observations, 'sem cebola');
  assert.deepEqual(env.calls, ['request-1']);
});

test('cotação usa o mesmo UUID na confirmação e sobrevive ao recarregamento', async () => {
  const env = setup();
  let first = true;
  const client = createOrderSubmitter({ ...env.dependencies, submit: async attempt => {
    assert.equal(attempt.requestId, 'quote-1');
    assert.equal(attempt.quoteId, 'quote-1');
    if (first) { first = false; throw new Error('offline'); }
    return { ...attempt.payload, id: 'order-quote', client_request_id: attempt.requestId, order_number: 2, created_at: '2026-09-05T12:00:00Z' };
  } });
  await assert.rejects(client.send('cliente', payload, 'cupom', 'quote-1'));
  assert.equal(client.readAttempt('cliente').quoteId, 'quote-1');
  const restored = createOrderSubmitter({ ...env.dependencies, submit: client.readAttempt('cliente')
    ? async attempt => ({ ...attempt.payload, id: 'order-quote', client_request_id: attempt.quoteId, order_number: 2, created_at: '2026-09-05T12:00:00Z' })
    : env.dependencies.submit });
  const order = await restored.send('cliente');
  assert.equal(order.clientRequestId, 'quote-1');
});

test('cliques concorrentes na mesma instância compartilham a operação', async () => {
  const env = setup();
  const client = createOrderSubmitter(env.dependencies);
  const a = client.send('cliente', payload), b = client.send('cliente', payload);
  assert.equal(a, b);
  await Promise.all([a, b]);
  assert.equal(env.calls.length, 1);
  assert.equal(env.notifications.length, 1);
});

test('duas instâncias recuperam a mesma chave; servidor reserva notificação uma única vez', async () => {
  const env = setup();
  const a = createOrderSubmitter(env.dependencies), b = createOrderSubmitter(env.dependencies);
  const [first, second] = await Promise.all([a.send('cliente', payload), b.send('cliente', payload)]);
  assert.equal(first.id, second.id);
  assert.equal(env.rows.size, 1);
  assert.equal(env.notifications.length, 1);
});

test('tentativas de contas diferentes são separadas e resposta de outra conta é recusada', async () => {
  const env = setup();
  const client = createOrderSubmitter(env.dependencies);
  await client.send('cliente', payload);
  assert(!client.hasPending('outro'));
  await client.send('outro', { ...payload, user_id: 'outro' });
  assert.equal(env.rows.size, 2);
  const invalid = createOrderSubmitter({ ...env.dependencies, submit: async () => ({ ...env.rows.get('request-1'), user_id: 'intruso' }) });
  await assert.rejects(invalid.send('cliente'), /não corresponde/);
});

test('falha no armazenamento impede envio e registro corrompido não ganha chave nova', async () => {
  const env = setup();
  const client = createOrderSubmitter({ ...env.dependencies, storage: { ...env.storage, setItem: () => { throw new Error('sem espaço'); } } });
  await assert.rejects(client.send('cliente', payload));
  assert.equal(env.calls.length, 0);
  env.storage.setItem(orderAttemptKey('cliente'), '{corrompido');
  await assert.rejects(createOrderSubmitter(env.dependencies).send('cliente', payload));
  assert.equal(env.calls.length, 0);
});

test('falha na reserva da notificação preserva tentativa e não regrava o pedido', async () => {
  const env = setup();
  let fail = true;
  const client = createOrderSubmitter({ ...env.dependencies, claimNotification: async id => {
    if (fail) { fail = false; throw new Error('offline'); }
    return env.dependencies.claimNotification(id);
  } });
  await assert.rejects(client.send('cliente', payload));
  await client.send('cliente');
  assert.equal(env.rows.size, 1);
  assert.equal(env.notifications.length, 1);
});

test('somente a confirmação da tentativa correta libera um novo pedido legítimo', async () => {
  const env = setup();
  const client = createOrderSubmitter(env.dependencies);
  await client.send('cliente', payload);
  client.acknowledge('cliente', 'outra-chave');
  assert(client.hasPending('cliente'));
  client.acknowledge('cliente', 'request-1');
  assert(!client.hasPending('cliente'));
  await client.send('cliente', payload);
  assert.equal(env.rows.size, 2);
});
