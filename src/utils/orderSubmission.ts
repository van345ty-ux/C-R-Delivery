import type { Order, StoredOrderItem } from '../types';

export interface OrderPayload {
  user_id: string;
  items: StoredOrderItem[];
  total: number;
  delivery_fee: number;
  delivery_type: Order['deliveryType'];
  payment_method: Order['paymentMethod'];
  address: string | null;
  status: string;
  customer_name: string;
  customer_phone: string;
  coupon_used?: string;
  change_for: number | null;
  sushi_egg_delivery_day: string | null;
}

export interface SubmittedOrder extends OrderPayload {
  id: string;
  order_number: number;
  created_at: string;
  client_request_id: string;
}

interface ConfirmedOrder extends Order { clientRequestId: string }

interface Attempt {
  requestId: string;
  payload: OrderPayload;
  couponId: string | null;
  quoteId?: string;
}

export const orderAttemptKey = (userId: string) => `cr-sushi:pending-order:${userId}`;

export function toOrder(row: SubmittedOrder): Order {
  return {
    id: row.id, orderNumber: row.order_number,
    items: row.items.map(item => ({
      quantity: item.quantity, observations: item.observations,
      product: { id: item.product_id || '', name: item.name, price: item.price, image: '', description: '', category: '', available: true },
    })),
    total: row.total, deliveryFee: row.delivery_fee, deliveryType: row.delivery_type,
    paymentMethod: row.payment_method, address: row.address ?? undefined, status: row.status,
    customerName: row.customer_name, customerPhone: row.customer_phone, createdAt: row.created_at,
    couponUsed: row.coupon_used, changeFor: row.change_for, sushi_egg_delivery_day: row.sushi_egg_delivery_day,
  };
}

interface Dependencies {
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  uuid: () => string;
  submit: (attempt: Attempt, signal: AbortSignal) => Promise<SubmittedOrder>;
  claimNotification: (requestId: string, signal: AbortSignal) => Promise<boolean>;
  notify: (order: Order) => Promise<unknown>;
  reserve?: (userId: string, work: () => Attempt) => Promise<Attempt>;
  timeoutMs?: number;
}

// Uma instância compartilhada mantém cliques/remontagens da mesma aba na mesma promessa.
export function createOrderSubmitter({ storage, uuid, submit, claimNotification, notify, reserve = async (_userId, work) => work(), timeoutMs = 60000 }: Dependencies) {
  const running = new Map<string, Promise<ConfirmedOrder>>();
  const hasPending = (userId: string) => storage.getItem(orderAttemptKey(userId)) !== null;

  const readAttempt = (userId: string): Attempt | null => {
    const value = storage.getItem(orderAttemptKey(userId));
    if (value === null) return null;
    const parsed: Attempt = JSON.parse(value);
    if (!parsed?.requestId || parsed.payload?.user_id !== userId || !Array.isArray(parsed.payload?.items)) {
      throw new Error('Não foi possível ler a tentativa anterior. Procure a loja antes de repetir o pedido.');
    }
    return parsed;
  };

  async function bounded<T>(work: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        work(controller.signal),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new Error('A resposta demorou. Use “Verificar pedido anterior” para recuperar esta mesma tentativa.'));
          }, timeoutMs);
        }),
      ]);
    } finally { clearTimeout(timer); }
  }

  function send(userId: string, payload?: OrderPayload, couponId: string | null = null, quoteId?: string): Promise<ConfirmedOrder> {
    const active = running.get(userId);
    if (active) return active;
    const operation = (async () => {
      const saved = await reserve(userId, () => {
        const attempt = readAttempt(userId);
        if (attempt) return attempt;
        if (!payload || payload.user_id !== userId) throw new Error('Não há tentativa anterior para recuperar.');
        const requestId = quoteId || uuid();
        const created = { requestId, payload, couponId, ...(quoteId ? { quoteId } : {}) };
        // Persistir antes da rede; se falhar, não inicia gravação sem identidade.
        storage.setItem(orderAttemptKey(userId), JSON.stringify(created));
        return created;
      });
      const row = await bounded(signal => submit(saved, signal));
      if (row.client_request_id !== saved.requestId || row.user_id !== userId) {
        throw new Error('A resposta não corresponde à tentativa deste cliente.');
      }
      const order = toOrder(row);
      // A reserva no servidor evita repetir a notificação em respostas concorrentes.
      const claimed = await bounded(signal => claimNotification(saved.requestId, signal));
      if (claimed) {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([notify(order), new Promise(resolve => { timer = setTimeout(resolve, 5000); })]);
        } catch (error) { console.error('Falha ao notificar o pedido já registrado:', error); }
        finally { clearTimeout(timer); }
      }
      return { ...order, clientRequestId: saved.requestId };
    })();
    running.set(userId, operation);
    const cleanup = () => { if (running.get(userId) === operation) running.delete(userId); };
    void operation.then(cleanup, cleanup);
    return operation;
  }

  // Somente após a interface assumir o pedido; uma falha anterior mantém a chave.
  const acknowledge = (userId: string, requestId: string) => {
    const attempt = readAttempt(userId);
    if (attempt?.requestId === requestId) storage.removeItem(orderAttemptKey(userId));
  };
  return { send, hasPending, readAttempt, acknowledge };
}
