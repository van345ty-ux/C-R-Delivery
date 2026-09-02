export const queries = [];
export const writes = [];
export const fixture = { products: [], coupons: [] };
const authListeners = new Set();
export const authFixture = {
  session: null,
  getSession: null,
  emit(event, session) {
    this.session = session;
    for (const listener of authListeners) listener(event, session);
  },
};

const forbiddenWrite = () => {
  writes.push('blocked');
  throw new Error('Este teste não permite gravações ou envios.');
};

class Query {
  constructor(table) { this.table = table; this.filters = []; this.isSingle = false; }
  select() { return this; }
  eq(key, value) { this.filters.push([key, value]); return this; }
  in() { return this; }
  or() { return this; }
  order() { return this; }
  limit() { return this; }
  single() { this.isSingle = true; return this; }
  then(resolve, reject) {
    queries.push({ table: this.table, filters: [...this.filters] });
    const data = this.table === 'settings'
      ? (this.isSingle ? { value: 'Promoções do Dia' } : [])
      : (fixture[this.table] || []);
    return Promise.resolve({ data: this.isSingle && Array.isArray(data) ? data[0] ?? null : data, error: null }).then(resolve, reject);
  }
  insert = forbiddenWrite;
  update = forbiddenWrite;
  upsert = forbiddenWrite;
  delete = forbiddenWrite;
}

export const supabase = {
  auth: {
    getSession: () => authFixture.getSession
      ? authFixture.getSession()
      : Promise.resolve({ data: { session: authFixture.session }, error: null }),
    onAuthStateChange: listener => {
      authListeners.add(listener);
      return { data: { subscription: { unsubscribe: () => authListeners.delete(listener) } } };
    },
    signOut: forbiddenWrite,
  },
  from: table => new Query(table),
  channel: () => ({ on() { return this; }, subscribe() { return this; } }),
  removeChannel: () => Promise.resolve(),
  rpc: forbiddenWrite,
  functions: { invoke: forbiddenWrite },
};
