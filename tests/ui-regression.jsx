import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../src/App';
import { HomePage } from '../src/components/HomePage';
import { Menu } from '../src/components/Menu';
import { Cart } from '../src/components/Cart';
import { OrderTracking } from '../src/components/OrderTracking';
import { orderProtectionEnabled } from '../src/utils/protectedOrderSubmission';
import { orderAttemptKey } from '../src/utils/orderSubmission';
import toast, { Toaster } from 'react-hot-toast';
import { WorldCupTheme } from '../src/components/WorldCupTheme';
import { AdminBonificationCoupons } from '../src/components/admin/AdminBonificationCoupons';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { ThemeContext, useTheme } from '../src/contexts/theme-context';
import { queries, writes, fixture, authFixture, supabase } from './fixtures/supabase.mjs';

window.IS_REACT_ACT_ENVIRONMENT = true;
const noop = () => {};
const sandbox = document.querySelector('#sandbox');
let root;
let passed = 0;
let failed = 0;
let restoreAppFixture = () => {};
let restoreClock = () => {};
let restoreSubmission = () => {};
const context = {
  theme: 'light', allowThemeToggle: false, isWorldCupMode: false,
  toggleTheme: noop, setTheme: noop, toggleWorldCupMode: async () => {},
};
const props = {
  selectedCity: 'Una', user: null, cart: [],
  onAddToCart: noop, onRemoveFromCart: noop, onUpdateCartItem: noop,
  onLogin: noop, onOrderCreated: noop, onBackToLocationSelect: noop, onProfileClick: noop,
  logoUrl: '/assets/logo.png', heroImageUrl: '/assets/logo.png',
  heroTitleText: 'Teste', heroTitleFontSize: '24px', heroTitleFontColor: '#000',
  heroTitleBorderColor: '#000', heroSubtitleText: '', heroSubtitleFontSize: '14px',
  heroSubtitleFontColor: '#000', heroSubtitleBorderColor: '#000', heroTextBackgroundEnabled: false,
  isStoreOpen: true, canPlaceOrder: true, showPreOrderModal: false,
  setShowPreOrderModal: noop, showPreOrderBanner: false,
  isMercadoPagoReturnFlow: false, isPixReturnFlow: false,
  setIsPixReturnFlow: noop, menuMobileColumns: '1', onTriggerValentine: noop,
  isValentineThemeActive: false, deliveryFee: 3, comandatubaDeliveryFee: 8,
  pixKey: 'CHAVE-DE-TESTE', mercadoPagoLink: 'about:blank',
};

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const render = async element => { await act(async () => { root.render(element); }); };
const themed = (element, extra = {}) => <ThemeContext.Provider value={{ ...context, ...extra }}>{element}</ThemeContext.Provider>;
const promotionRequests = () => queries.filter(q => q.table === 'products' && q.filters.some(([k, v]) => k === 'category' && v === 'Promoção')).length;

async function check(name, body) {
  queries.length = 0;
  fixture.products = [];
  fixture.coupons = [];
  fixture.orders = [];
  for (const key of Object.keys(localStorage)) if (key.startsWith('cr-sushi:pending-order:')) localStorage.removeItem(key);
  for (const key of ['isMercadoPagoReturnFlow', 'isPixReturnFlow', 'hasSeenMercadoPagoWarning', 'pixPaymentInitiated', 'hasAcknowledgedPixReturnConfirmation', 'hasSeenPixInstructions']) localStorage.setItem(key, 'false');
  localStorage.setItem('cartAppliedCoupon', 'null');
  localStorage.setItem('cartDeliveryType', 'pickup');
  localStorage.setItem('cartAddress', '');
  localStorage.setItem('cartCouponCode', '');
  localStorage.setItem('promotionModalLastShown', '0');
  localStorage.setItem('showPromotionModalOnLoad', 'false');
  localStorage.setItem('pendingMenuFilter', 'Todos');
  sessionStorage.setItem('hasSeenValentinePopup', 'false');
  sessionStorage.setItem('hasSeenWorldCupPreOrder', 'false');
  root = createRoot(sandbox);
  const result = document.createElement('li');
  try {
    await body();
    passed++;
    result.textContent = `PASSOU — ${name}`;
  } catch (error) {
    failed++;
    result.textContent = `FALHOU — ${name}: ${error.message}`;
  } finally {
    await act(async () => root.unmount());
    restoreAppFixture();
    restoreAppFixture = () => {};
    restoreClock();
    restoreClock = () => {};
    restoreSubmission();
    restoreSubmission = () => {};
    toast.remove();
    authFixture.session = null;
    authFixture.getSession = null;
    document.querySelector('#results').append(result);
  }
}

for (const flow of ['isPixReturnFlow', 'isMercadoPagoReturnFlow']) {
  await check(`${flow}: retorno abre carrinho e não dispara promoções ou popup sazonal`, async () => {
    await render(themed(<HomePage {...props} selectedCity="Comandatuba" isValentineThemeActive {...{ [flow]: true }} />, { isWorldCupMode: true }));
    assert(sandbox.textContent.includes('Carrinho'), 'Carrinho não abriu');
    assert(promotionRequests() === 0, 'Buscou promoções durante retorno do pagamento');
    assert(!sandbox.textContent.includes('Atendimento Especial'), 'Popup sazonal abriu durante pagamento');
  });
}

await check('Troca para Comandatuba abre o aviso uma vez; nova renderização não o reabre', async () => {
  await render(themed(<HomePage {...props} />, { isWorldCupMode: true }));
  assert(!sandbox.textContent.includes('Atendimento Especial'), 'Aviso de Comandatuba apareceu em Una');
  await render(themed(<HomePage {...props} selectedCity="Comandatuba" />, { isWorldCupMode: true }));
  assert(sandbox.textContent.includes('Atendimento Especial'), 'Aviso não abriu ao mudar para Comandatuba');
  const count = promotionRequests();
  const close = sandbox.querySelector('button[aria-label="Fechar"]');
  assert(close, 'Botão de fechar não encontrado');
  await act(async () => close.click());
  await render(themed(<HomePage {...props} selectedCity="Comandatuba" heroTitleText="Outra renderização" />, { isWorldCupMode: true }));
  assert(!sandbox.textContent.includes('Atendimento Especial'), 'Popup reabriu após fechar');
  assert(promotionRequests() === count, 'Repetiu consulta sem mudança de dependências');
});

await check('Cupons: nova referência do mesmo usuário não refaz a consulta; outro ID refaz', async () => {
  const menuProps = { ...props, selectedCategory: 'Todos', onCategoryChange: noop };
  await render(themed(<Menu {...menuProps} user={{ id: 'cliente-teste-a' }} />));
  const count = queries.filter(q => q.table === 'coupons').length;
  await render(themed(<Menu {...menuProps} user={{ id: 'cliente-teste-a', name: 'Nome alterado' }} />));
  assert(queries.filter(q => q.table === 'coupons').length === count, 'Consultou novamente para o mesmo ID');
  await render(themed(<Menu {...menuProps} user={{ id: 'cliente-teste-b' }} />));
  assert(queries.filter(q => q.table === 'coupons').length === count + 1, 'Não atualizou ao trocar usuário');
});

await check('Animação: encerra após 9 segundos sem reiniciar o temporizador', async () => {
  const original = window.setTimeout;
  let finish;
  let scheduled = 0;
  window.setTimeout = (callback, delay, ...args) => {
    if (delay === 9000) { scheduled++; finish = callback; return original(noop, 60000); }
    return original(callback, delay, ...args);
  };
  try {
    await render(<WorldCupTheme />);
    assert(sandbox.querySelector('.ball-float-container-wc'), 'Animação não apareceu');
    await act(async () => finish());
    assert(!sandbox.querySelector('.ball-float-container-wc'), 'Animação não encerrou');
    assert(scheduled === 1, 'Temporizador foi reiniciado ao ocultar');
  } finally { window.setTimeout = original; }
});

await check('Cupons administrativos: renderizações comuns não repetem a carga', async () => {
  await render(<AdminBonificationCoupons />);
  const count = queries.length;
  assert(count === 3, `Esperadas 3 consultas iniciais, recebidas ${count}`);
  await render(<AdminBonificationCoupons />);
  assert(queries.length === count, 'Carga administrativa repetida sem necessidade');
});

await check('Contexto separado: alternância de tema chega ao consumidor e ao documento', async () => {
  function Probe() {
    const { theme, toggleTheme } = useTheme();
    return <button onClick={toggleTheme}>{theme}</button>;
  }
  localStorage.setItem('app-theme', 'light');
  await render(<ThemeProvider><Probe /></ThemeProvider>);
  assert(sandbox.textContent === 'light', 'Tema inicial incorreto');
  await act(async () => sandbox.querySelector('button').click());
  assert(sandbox.textContent === 'dark', 'Consumidor não recebeu o novo tema');
  assert(document.documentElement.getAttribute('data-theme') === 'dark', 'Tema não chegou ao documento');
});

const testUser = { id: 'cliente-teste', email: 'cliente@example.test', user_metadata: { full_name: 'Cliente Teste' } };
const profileRow = { id: testUser.id, full_name: 'Cliente Teste', phone: '', birth_date: '2000-01-01', role: 'customer' };
const savedCart = JSON.stringify([{ product: { id: 'produto-teste', name: 'Combo de teste', price: 30, category: 'Sushi', image: '/assets/logo.png', description: '', available: true }, quantity: 2, observations: 'Observação preservada' }]);

function installAppFixture(profileResponse, hours = Array.from({ length: 7 }, (_, day_of_week) => ({ day_of_week, is_open: true, open_time: '00:00', close_time: '23:59' }))) {
  const originalFetch = window.fetch;
  const originalTimeout = window.setTimeout;
  const authTimers = [];
  authFixture.session = { user: testUser, access_token: 'test-only-token' };
  localStorage.setItem('sb-supabase-auth-token', JSON.stringify(authFixture.session));
  localStorage.setItem('selectedCity', 'Una');
  localStorage.setItem('lastView', 'home');
  localStorage.setItem('cart', savedCart);
  window.setTimeout = (callback, delay, ...args) => {
    if (delay === 12000) {
      authTimers.push(callback);
      return originalTimeout(noop, 60000);
    }
    return originalTimeout(callback, delay, ...args);
  };
  window.fetch = async (input, options = {}) => {
    const url = new URL(String(input), location.href);
    if (url.origin === 'https://supabase.test') {
      if (url.pathname.endsWith('/profiles')) return profileResponse(options);
      if (options.method && options.method !== 'GET') throw new Error('Gravação inesperada no teste');
      const data = url.pathname.endsWith('/settings')
        ? [{ key: 'app_logo_url', value: '/assets/logo.png' }, { key: 'hero_image_url', value: '/assets/logo.png' }]
        : url.pathname.endsWith('/cities')
          ? [{ id: 'una', name: 'Una', active: true }]
          : hours;
      return Response.json(data);
    }
    if (url.origin !== location.origin) throw new Error('Conexão externa bloqueada pelo teste');
    // A verificação de versão deve enxergar a própria página de teste.
    if (url.pathname === '/index.html') return new Response(document.documentElement.outerHTML);
    return originalFetch(input, options);
  };
  restoreAppFixture = () => {
    window.fetch = originalFetch;
    window.setTimeout = originalTimeout;
    localStorage.removeItem('sb-supabase-auth-token');
  };
  return { timeout: () => authTimers.at(-1)() };
}

await check('Falha no perfil: tentar novamente recupera conta e carrinho no retorno do pagamento externo', async () => {
  let failedProfile = true;
  installAppFixture(() => failedProfile ? new Response('', { status: 500 }) : Response.json([profileRow]));
  localStorage.setItem('isMercadoPagoReturnFlow', 'true');
  localStorage.setItem('hasSeenMercadoPagoWarning', 'true');
  await render(<App />);
  assert(sandbox.textContent.includes('Tentar novamente'), 'Não ofereceu recuperação');
  assert(localStorage.getItem('cart') === savedCart, 'Alterou o carrinho após falhar');
  assert(localStorage.getItem('isMercadoPagoReturnFlow') === 'true', 'Perdeu o retorno do pagamento');
  failedProfile = false;
  await act(async () => [...sandbox.querySelectorAll('button')].find(button => button.textContent === 'Tentar novamente').click());
  assert(!sandbox.textContent.includes('Tentar novamente'), 'Não recuperou a conta');
  assert(sandbox.textContent.includes('Carrinho') && sandbox.textContent.includes('Combo de teste'), 'Não retomou a sacola preenchida');
  assert(localStorage.getItem('hasSeenMercadoPagoWarning') === 'true', 'Apagou a confirmação do aviso');
  assert(localStorage.getItem('cart') === savedCart, 'Alterou itens ou observações durante recuperação');
});

await check('Perfil sem resposta: timeout aborta a consulta e mantém o retorno do Pix', async () => {
  let aborted = false;
  const controls = installAppFixture(({ signal }) => new Promise((_, reject) => {
    signal.addEventListener('abort', () => { aborted = true; reject(new DOMException('Aborted', 'AbortError')); });
  }));
  localStorage.setItem('isPixReturnFlow', 'true');
  await render(<App />);
  await act(async () => controls.timeout());
  assert(aborted, 'A consulta não foi cancelada');
  assert(sandbox.textContent.includes('Tentar novamente'), 'Continuou preso no carregamento');
  assert(localStorage.getItem('isPixReturnFlow') === 'true', 'Perdeu o retorno Pix');
  assert(localStorage.getItem('cart') === savedCart, 'Perdeu o carrinho');
});

await check('Perfil ausente com falha ao criar: oferece recuperação', async () => {
  let simulatedCreates = 0;
  installAppFixture(options => {
    if (options.method === 'POST') { simulatedCreates++; return new Response('', { status: 403 }); }
    return Response.json([]);
  });
  await render(<App />);
  assert(simulatedCreates === 1, 'Não exerceu a criação simulada do perfil ausente');
  assert(sandbox.textContent.includes('Tentar novamente'), 'Falha de criação deixou tela carregando');
});

for (const mode of ['rejeitada', 'sem resposta']) {
  await check(`Consulta da sessão ${mode}: mostra recuperação`, async () => {
    const controls = installAppFixture(() => Response.json([profileRow]));
    authFixture.getSession = () => mode === 'rejeitada' ? Promise.reject(new Error('Falha simulada')) : new Promise(() => {});
    await render(<App />);
    if (mode === 'sem resposta') await act(async () => controls.timeout());
    assert(sandbox.textContent.includes('Tentar novamente'), 'Sessão com falha deixou tela carregando');
    assert(localStorage.getItem('cart') === savedCart, 'Falha da sessão apagou o carrinho');
  });
}

await check('Resposta tardia do perfil não restaura a conta após sair', async () => {
  let finishProfile;
  installAppFixture(() => new Promise(resolve => { finishProfile = resolve; }));
  await render(<App />);
  await act(async () => authFixture.emit('SIGNED_OUT', null));
  const afterLogout = sandbox.textContent;
  await act(async () => finishProfile(Response.json([profileRow])));
  assert(sandbox.textContent === afterLogout, 'Resposta antiga alterou a tela depois de sair');
  assert(localStorage.getItem('cart') === '[]', 'Resposta antiga recuperou dados após saída explícita');
});

await check('Erro tardio da sessão inicial não substitui uma conta já recuperada por evento', async () => {
  let rejectInitialSession;
  installAppFixture(() => Response.json([profileRow]));
  authFixture.getSession = () => new Promise((_, reject) => { rejectInitialSession = reject; });
  await render(<App />);
  await act(async () => authFixture.emit('INITIAL_SESSION', authFixture.session));
  assert(!sandbox.textContent.includes('Tentar novamente'), 'Evento não recuperou a conta');
  const recoveredScreen = sandbox.textContent;
  await act(async () => rejectInitialSession(new Error('Falha antiga simulada')));
  assert(sandbox.textContent === recoveredScreen, 'Erro antigo substituiu a conta recuperada');
});

function installClock(time) {
  const OriginalDate = window.Date;
  const originalInterval = window.setInterval;
  const originalClear = window.clearInterval;
  const visibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState');
  let now = new OriginalDate(time).getTime();
  const intervals = new Map();
  window.Date = class extends OriginalDate {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  };
  window.setInterval = (callback, delay, ...args) => {
    if (delay !== 30000) return originalInterval(callback, delay, ...args);
    const id = originalInterval(noop, 60000);
    intervals.set(id, callback);
    return id;
  };
  window.clearInterval = id => { intervals.delete(id); originalClear(id); };
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  restoreClock = () => {
    window.Date = OriginalDate;
    window.setInterval = originalInterval;
    window.clearInterval = originalClear;
    for (const id of intervals.keys()) originalClear(id);
    if (visibilityDescriptor) Object.defineProperty(document, 'visibilityState', visibilityDescriptor);
    else delete document.visibilityState;
  };
  return {
    set: time => { now = new OriginalDate(time).getTime(); },
    tick: () => { assert(intervals.size === 1, 'Intervalos duplicados de atualização'); for (const callback of intervals.values()) callback(); },
  };
}

const regularHours = Array.from({ length: 7 }, (_, day_of_week) => ({ day_of_week, is_open: true, open_time: '18:00:00', close_time: '23:00:00' }));
const finishButton = () => sandbox.querySelector('button[aria-label="Finalizar pedido"], button[aria-label="Verificar pedido anterior"]');
const clickPayment = async label => act(async () => sandbox.querySelector(`input[aria-label="${label}"]`).click());
const acknowledge = async () => act(async () => [...sandbox.querySelectorAll('button')].find(button => button.textContent === 'Entendi').click());
const cartProps = {
  ...props, items: JSON.parse(savedCart), user: { id: testUser.id, name: 'Cliente Teste', phone: '', email: testUser.email },
  onClose: noop, onUpdateQuantity: noop, onRemoveItem: noop,
};
const renderCart = extra => render(themed(<><Cart {...cartProps} {...extra} /><Toaster /></>));

await check('Relógio atualiza abertura e fechamento sem recarregar a sacola ou consultar novamente', async () => {
  const clock = installClock('2026-09-02T17:59:00-03:00');
  installAppFixture(() => Response.json([profileRow]), regularHours);
  localStorage.setItem('isMercadoPagoReturnFlow', 'true');
  await render(<App />);
  assert(finishButton()?.disabled, 'Antes da abertura deveria bloquear');
  const count = queries.length;
  clock.set('2026-09-02T18:00:00-03:00');
  await act(async () => clock.tick());
  assert(finishButton() && !finishButton().disabled, 'Não abriu pelo temporizador');
  clock.set('2026-09-02T23:00:00-03:00');
  await act(async () => clock.tick());
  assert(finishButton().disabled, 'Não fechou pelo temporizador');
  assert(queries.length === count, 'Refaz consultas na atualização do relógio');
  assert(localStorage.getItem('cart') === savedCart, 'Mudou a sacola ao atualizar horário');
});

await check('Voltar à aba atualiza imediatamente por foco, pageshow e visibilidade', async () => {
  const clock = installClock('2026-09-02T17:59:00-03:00');
  installAppFixture(() => Response.json([profileRow]), regularHours);
  localStorage.setItem('isMercadoPagoReturnFlow', 'true');
  await render(<App />);
  clock.set('2026-09-02T18:00:00-03:00');
  await act(async () => window.dispatchEvent(new Event('focus')));
  assert(finishButton() && !finishButton().disabled, 'Foco não atualizou horário');
  clock.set('2026-09-02T23:00:00-03:00');
  await act(async () => window.dispatchEvent(new Event('pageshow')));
  assert(finishButton().disabled, 'pageshow não atualizou horário');
  clock.set('2026-09-03T18:00:00-03:00');
  await act(async () => document.dispatchEvent(new Event('visibilitychange')));
  assert(!finishButton().disabled, 'Visibilidade não atualizou horário no dia seguinte');
});

await check('Fechamento preserva aviso do cartão, abertura em outra aba e continuação do pedido', async () => {
  const originalOpen = window.open;
  const opened = [];
  window.open = (...args) => { opened.push(args); return null; };
  try {
    await renderCart();
    await clickPayment('Pagamento com cartão via Mercado Pago');
    await act(async () => finishButton().click());
    assert(sandbox.textContent.includes('Atenção ao Pagamento!'), 'Não exigiu o aviso original');
    await renderCart({ canPlaceOrder: false, isStoreOpen: false });
    assert(sandbox.textContent.includes('Atenção ao Pagamento!'), 'Fechamento removeu o aviso aberto');
    await acknowledge();
    assert(opened.length === 1 && opened[0][0] === 'about:blank' && opened[0][1] === '_blank', 'Mudou a abertura em outra aba');
    assert(localStorage.getItem('hasSeenMercadoPagoWarning') === 'true', 'Perdeu a confirmação do aviso');
    assert(!finishButton().disabled, 'Fechamento bloqueou continuação do pagamento iniciado');
    assert(sandbox.textContent.includes('cujo pagamento já foi iniciado'), 'Não explicou a exceção');
  } finally { window.open = originalOpen; }
});

await check('Loja fechada: retorno sozinho não libera pedido e não permite iniciar novo pagamento', async () => {
  await renderCart({ canPlaceOrder: false, isStoreOpen: false, isMercadoPagoReturnFlow: true });
  assert(finishButton().disabled, 'Liberou cartão sem passar pelo aviso');
  await renderCart({ canPlaceOrder: false, isStoreOpen: false });
  const pix = sandbox.querySelector('input[aria-label="Pagamento via PIX"]');
  assert(pix.disabled, 'Permitiu iniciar um Pix novo depois do fechamento');
  assert(sandbox.querySelector('input[aria-label="Pagamento com cartão via Mercado Pago"]').disabled, 'Permitiu iniciar cartão depois do fechamento');
  await act(async () => pix.click());
  assert(!sandbox.textContent.includes('Instruções para Pagamento PIX'), 'Iniciou pagamento novo com loja fechada');
  await clickPayment('Pagamento em dinheiro na entrega');
  assert(finishButton().disabled, 'Liberou novo pedido em dinheiro com loja fechada');
});

await check('Instruções Pix abertas antes de fechar continuam disponíveis ao retornar à aba', async () => {
  const clock = installClock('2026-09-02T22:59:00-03:00');
  await renderCart();
  await clickPayment('Pagamento via PIX');
  assert(sandbox.textContent.includes('Instruções para Pagamento PIX'), 'Não abriu instruções');
  await renderCart({ canPlaceOrder: false, isStoreOpen: false });
  assert(sandbox.textContent.includes('Instruções para Pagamento PIX'), 'Fechamento removeu instruções');
  await acknowledge();
  assert(localStorage.getItem('pixPaymentInitiated') === 'true', 'Não preservou o início do Pix');
  clock.set('2026-09-02T23:05:00-03:00');
  await act(async () => document.dispatchEvent(new Event('visibilitychange')));
  assert(sandbox.textContent.includes('Pagamento Pix Realizado?'), 'Volta à aba não pediu confirmação');
  await acknowledge();
  assert(!finishButton().disabled, 'Fechamento bloqueou Pix iniciado com instruções abertas');
});

await check('Retorno Pix após fechar preserva confirmação e bloqueios; dinheiro não herda a exceção', async () => {
  localStorage.setItem('pixPaymentInitiated', 'true');
  localStorage.setItem('hasSeenPixInstructions', 'true');
  await renderCart({ canPlaceOrder: false, isStoreOpen: false, isPixReturnFlow: true });
  assert(sandbox.textContent.includes('Pagamento Pix Realizado?'), 'Não apresentou confirmação de retorno');
  assert(sandbox.querySelector('input[aria-label="Pagamento em dinheiro na entrega"]').disabled, 'Desbloqueou troca antes da confirmação');
  await act(async () => finishButton().click());
  assert(sandbox.textContent.includes('Vá até o seu banco'), 'Removeu a validação anterior à confirmação Pix');
  assert(writes.length === 0, 'Tentou criar pedido antes da confirmação');
  await acknowledge();
  assert(!finishButton().disabled, 'Bloqueou continuação do Pix após confirmação');
  assert(!sandbox.textContent.includes('Pagamento Pix Realizado?'), 'Não fechou confirmação');
  await clickPayment('Pagamento em dinheiro na entrega');
  assert(finishButton().disabled, 'Dinheiro herdou exceção do Pix');
  assert(localStorage.getItem('pixPaymentInitiated') === null, 'Não limpou indicadores Pix na troca');
});

await check('Exceção de retorno não remove exigência de chave e instruções Pix', async () => {
  localStorage.setItem('pixPaymentInitiated', 'true');
  localStorage.setItem('hasAcknowledgedPixReturnConfirmation', 'true');
  await renderCart({ canPlaceOrder: false, isStoreOpen: false, isPixReturnFlow: true });
  assert(finishButton().disabled, 'Liberou Pix sem instruções');
  localStorage.setItem('hasSeenPixInstructions', 'true');
  await act(async () => window.dispatchEvent(new Event('storage')));
  await renderCart({ canPlaceOrder: false, isStoreOpen: false, isPixReturnFlow: true, pixKey: '' });
  assert(finishButton().disabled, 'Liberou Pix sem chave');
});

await check('Comandatuba continua permitindo pré-agendamento com loja fechada', async () => {
  const clock = installClock('2026-09-02T23:00:00-03:00');
  installAppFixture(() => Response.json([profileRow]), regularHours);
  localStorage.setItem('selectedCity', 'Comandatuba');
  localStorage.setItem('isMercadoPagoReturnFlow', 'true');
  await render(<App />);
  assert(finishButton() && !finishButton().disabled, 'Bloqueou Comandatuba após fechamento');
  assert(sandbox.textContent.includes('agendar seu pedido para mais tarde'), 'Perdeu mensagem de pré-agendamento');
  clock.set('2026-09-03T04:00:00-03:00');
  await act(async () => clock.tick());
  assert(!finishButton().disabled, 'Bloqueou pré-agendamento na madrugada');
});

const variantItems = [
  { product: JSON.parse(savedCart)[0].product, quantity: 1, observations: 'sem cebola' },
  { product: JSON.parse(savedCart)[0].product, quantity: 2, observations: 'sem molho' },
  { product: JSON.parse(savedCart)[0].product, quantity: 1 },
];
const byLabel = label => sandbox.querySelector(`[aria-label="${label}"]`);
const flushOrderReservation = () => orderProtectionEnabled && navigator.locks
  ? navigator.locks.request(`cr-sushi:order-reservation:${testUser.id}`, noop)
  : Promise.resolve();
const clickLabel = async label => {
  const button = label === 'Finalizar pedido' ? finishButton() : byLabel(label);
  assert(button && !button.disabled, `Controle indisponível: ${label}`);
  await act(async () => { button.click(); await flushOrderReservation(); });
};
const displayedAmount = label => [...sandbox.querySelectorAll('span')].find(span => span.textContent === label)?.parentElement.textContent;
const readCart = () => JSON.parse(localStorage.getItem('cart'));
const openCart = async () => act(async () => [...sandbox.querySelectorAll('header button')].at(-1).click());

await check('Sacola: adicionar pelo cardápio preserva instruções; quantidade, remoção e restauração isolam as linhas', async () => {
  installClock('2026-09-02T20:00:00-03:00');
  installAppFixture(() => Response.json([profileRow]), regularHours);
  fixture.products = [variantItems[0].product];
  localStorage.setItem('cart', JSON.stringify([variantItems[0]]));
  await render(<App />);
  for (const [note, quantity] of [['sem molho', 2], ['', 1], ['sem cebola', 1]]) {
    await clickLabel('Adicionar Combo de teste ao carrinho');
    const textarea = byLabel('Observações adicionais para o produto');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, note);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    if (quantity === 2) await clickLabel('Aumentar quantidade');
    await clickLabel(`Adicionar ${quantity} Combo de teste ao carrinho`);
  }
  assert(JSON.stringify(readCart().map(item => [item.quantity, item.observations])) === JSON.stringify([[2, 'sem cebola'], [2, 'sem molho'], [1, undefined]]), 'Agrupou incorretamente ou apagou instruções');
  await openCart();
  assert(sandbox.querySelectorAll('h4').length === 3, 'Não exibiu três linhas');
  assert(displayedAmount('Subtotal:') === 'Subtotal:R$ 150.00', 'Subtotal incorreto');
  await clickLabel('Aumentar quantidade de Combo de teste (sem cebola)');
  assert(JSON.stringify(readCart().map(item => item.quantity)) === '[3,2,1]', 'Aumento alterou outra linha');
  const persisted = localStorage.getItem('cart');
  await render(<App key="restaurado" />);
  await openCart();
  assert(localStorage.getItem('cart') === persisted && sandbox.querySelectorAll('h4').length === 3, 'Remontagem perdeu as linhas salvas');
  await clickLabel('Remover Combo de teste do carrinho (sem molho)');
  assert(readCart().length === 2 && readCart()[0].observations === 'sem cebola', 'Remoção afetou outra personalização');
  await clickLabel('Diminuir quantidade de Combo de teste');
  assert(readCart().length === 1 && readCart()[0].quantity === 3, 'Zerar quantidade removeu outra linha');
  assert(displayedAmount('Total:') === 'Total:R$ 90.00', 'Total não acompanhou as alterações');
});

for (const flow of ['isMercadoPagoReturnFlow', 'isPixReturnFlow']) {
  await check(`Sacola com observações: ${flow} preserva linhas e bloqueios de edição`, async () => {
    installClock('2026-09-02T20:00:00-03:00');
    installAppFixture(() => Response.json([profileRow]), regularHours);
    const persisted = JSON.stringify(variantItems);
    localStorage.setItem('cart', persisted);
    localStorage.setItem(flow, 'true');
    localStorage.setItem(flow === 'isMercadoPagoReturnFlow' ? 'hasSeenMercadoPagoWarning' : 'pixPaymentInitiated', 'true');
    if (flow === 'isPixReturnFlow') localStorage.setItem('hasSeenPixInstructions', 'true');
    await render(<App />);
    assert(sandbox.querySelectorAll('h4').length === 3, 'Perdeu linhas no retorno');
    for (const button of sandbox.querySelectorAll('button[aria-label^="Remover Combo"], button[aria-label^="Aumentar quantidade de Combo"], button[aria-label^="Diminuir quantidade de Combo"]')) {
      assert(button.disabled, 'Desbloqueou edição durante retorno protegido');
      await act(async () => button.click());
    }
    assert(localStorage.getItem('cart') === persisted, 'Alterou a sacola durante retorno protegido');
    assert(displayedAmount('Total:') === 'Total:R$ 120.00', 'Retorno mudou total');
  });
}

await check('Linhas distintas mantêm subtotal, desconto e taxas de Una/Comandatuba', async () => {
  localStorage.setItem('cartDeliveryType', 'delivery');
  localStorage.setItem('cartAddress', 'Endereço fictício');
  localStorage.setItem('cartAppliedCoupon', JSON.stringify({ id: 'cupom-teste', code: 'TESTE10', discount: 10 }));
  await renderCart({ items: variantItems });
  assert(displayedAmount('Subtotal:') === 'Subtotal:R$ 120.00', 'Subtotal incorreto');
  assert(displayedAmount('Desconto:') === 'Desconto:-R$ 12.00', 'Desconto incorreto');
  assert(displayedAmount('Total:') === 'Total:R$ 111.00', 'Total de Una incorreto');
  await renderCart({ items: variantItems, selectedCity: 'Comandatuba' });
  assert(displayedAmount('Total:') === 'Total:R$ 116.00', 'Total de Comandatuba incorreto');
});

// Interceptações exclusivamente locais: o cliente de produção não é importado
// neste ambiente. Nenhuma chamada abaixo alcança banco ou serviço de mensagens.
const completedSimulations = [];
for (const method of ['cash', 'card', 'pix']) {
  await check(`Pedido simulado em ${method}: preserva cada observação no registro e no payload WhatsApp`, async () => {
    const originalFrom = supabase.from;
    const originalRpc = supabase.rpc;
    const originalInvoke = supabase.functions.invoke;
    const originalOpen = window.open;
    const inserted = [];
    const messages = [];
    const opened = [];
    let completed;
    supabase.from = table => table !== 'orders' ? originalFrom(table) : {
      insert(payload) {
        inserted.push(JSON.parse(JSON.stringify(payload)));
        return { select: () => ({ single: async () => ({ data: { ...payload, id: 'pedido-simulado', order_number: 42, created_at: '2026-09-02T23:00:00Z' }, error: null }) }) };
      },
    };
    supabase.rpc = (name, args) => ({ abortSignal: async () => {
      if (name === 'claim_order_notification') return { data: true, error: null };
      assert(name === 'submit_order_once', 'RPC inesperada');
      inserted.push(JSON.parse(JSON.stringify(args.p_order)));
      return { data: { order: { ...args.p_order, id: 'pedido-simulado', order_number: 42, created_at: '2026-09-02T23:00:00Z', client_request_id: args.p_request_id }, created: true }, error: null };
    } });
    supabase.functions.invoke = async (name, options) => {
      assert(name === 'whatsapp-router', 'Tentativa inesperada de integração');
      messages.push(JSON.parse(JSON.stringify(options.body)));
      return { error: null };
    };
    window.open = (...args) => { opened.push(args); return null; };
    try {
      await renderCart({ items: variantItems, onOrderCreated: order => { completed = order; } });
      await clickPayment({ cash: 'Pagamento em dinheiro na entrega', card: 'Pagamento com cartão via Mercado Pago', pix: 'Pagamento via PIX' }[method]);
      if (method === 'cash') await clickLabel('Não preciso de troco');
      if (method === 'card') {
        await clickLabel('Finalizar pedido');
        assert(inserted.length === 0 && sandbox.textContent.includes('Atenção ao Pagamento!'), 'Não exigiu aviso antes da abertura externa');
        await acknowledge();
        assert(opened.length === 1 && opened[0][1] === '_blank', 'Não manteve outra aba');
      }
      if (method === 'pix') {
        assert(sandbox.textContent.includes('Instruções para Pagamento PIX'), 'Não abriu instruções');
        await acknowledge();
        // Remontagem reproduz a volta ao app com os indicadores persistidos.
        await render(<div />);
        await renderCart({ items: variantItems, isPixReturnFlow: true, onOrderCreated: order => { completed = order; } });
        assert(sandbox.textContent.includes('Pagamento Pix Realizado?'), 'Não exigiu confirmação de retorno');
        await acknowledge();
      }
      await clickLabel('Finalizar pedido');
      assert(inserted.length === 1 && messages.length === 1 && completed, 'Não concluiu uma única simulação de registro/notificação');
      const expectedItems = variantItems.map(item => ({ name: item.product.name, quantity: item.quantity, price: item.product.price, observations: item.observations }));
      assert(JSON.stringify(inserted[0].items.map(({ product_id, ...item }) => { assert(product_id === variantItems[0].product.id, 'Mudou ID do produto'); return item; })) === JSON.stringify(expectedItems), 'Registro misturou observações ou quantidades');
      assert(JSON.stringify(messages[0].message_data.items) === JSON.stringify(expectedItems), 'Payload WhatsApp perdeu instruções');
      assert(inserted[0].total === 120 && inserted[0].payment_method === method, 'Alterou total ou forma de pagamento');
      assert(messages[0].message_data.total === '120.00', 'Notificação recebeu total diferente');
      completedSimulations.push(completed);
    } finally {
      supabase.from = originalFrom;
      supabase.rpc = originalRpc;
      supabase.functions.invoke = originalInvoke;
      window.open = originalOpen;
    }
  });
}

await check('Acompanhamento exibe linhas distintas e instruções após ler o pedido salvo', async () => {
  const order = completedSimulations[0];
  assert(order, 'Simulação anterior não gerou pedido');
  const originalFrom = supabase.from;
  const originalError = console.error;
  const keyWarnings = [];
  console.error = (...args) => { if (/same key|unique.*key/.test(args.join(' '))) keyWarnings.push(args); originalError(...args); };
  supabase.from = table => table !== 'orders' ? originalFrom(table) : {
    select() { return this; }, eq() { return this; },
    single: async () => ({ data: {
      id: order.id, order_number: order.orderNumber, created_at: order.createdAt,
      total: 120, delivery_fee: 0, delivery_type: 'pickup', payment_method: 'cash',
      customer_name: order.customerName, customer_phone: order.customerPhone,
      status: 'Em preparação',
      items: variantItems.map(item => ({ product_id: item.product.id, name: item.product.name, quantity: item.quantity, price: item.product.price, observations: item.observations })),
    }, error: null }),
  };
  try {
    await render(<OrderTracking order={order} onBack={noop} />);
    assert(sandbox.textContent.includes('Obs: sem cebola') && sandbox.textContent.includes('Obs: sem molho'), 'Acompanhamento perdeu instruções');
    assert(sandbox.textContent.split('Combo de teste').length - 1 === 3, 'Acompanhamento uniu linhas');
    assert(keyWarnings.length === 0, 'Linhas do acompanhamento têm chaves React duplicadas');
  } finally { supabase.from = originalFrom; console.error = originalError; }
});

function simulateProtectedOrders(initialMode = 'normal') {
  const originalRpc = supabase.rpc;
  const originalInvoke = supabase.functions.invoke;
  const calls = [], rows = new Map(), claimed = new Set(), notifications = [];
  let mode = initialMode, release;
  supabase.rpc = (name, args) => ({ abortSignal: async signal => {
    if (name === 'claim_order_notification') {
      if (mode === 'claim-error') { mode = 'normal'; throw new Error('Falha simulada na reserva'); }
      const first = !claimed.has(args.p_request_id);
      claimed.add(args.p_request_id);
      return { data: first, error: null };
    }
    assert(name === 'submit_order_once', 'RPC inesperada');
    calls.push(JSON.parse(JSON.stringify(args)));
    if (mode === 'missing-rpc') return { data: null, error: { code: 'PGRST202', message: 'Função ausente (simulação)' } };
    if (!rows.has(args.p_request_id)) rows.set(args.p_request_id, { ...args.p_order, client_request_id: args.p_request_id, id: 'pedido-protegido', order_number: 43, created_at: '2026-09-02T23:00:00Z' });
    const result = { data: { order: rows.get(args.p_request_id) }, error: null };
    fixture.orders = [...rows.values()];
    if (mode === 'lost-response') { mode = 'normal'; throw new Error('Resposta perdida após gravar (simulação)'); }
    if (mode === 'pending') {
      return new Promise((resolve, reject) => {
        release = () => { mode = 'normal'; resolve(result); };
        signal.addEventListener('abort', () => { mode = 'normal'; reject(new DOMException('Aborted', 'AbortError')); });
      });
    }
    return result;
  } });
  supabase.functions.invoke = async (name, options) => {
    assert(name === 'whatsapp-router', 'Envio inesperado');
    notifications.push(options.body);
    return { error: null };
  };
  restoreSubmission = () => { supabase.rpc = originalRpc; supabase.functions.invoke = originalInvoke; };
  return { calls, rows, notifications, release: () => release() };
}

if (orderProtectionEnabled) {
  await check('Resposta perdida: após fechar a sacola/loja recupera o pedido sem novo pagamento', async () => {
    const simulation = simulateProtectedOrders('lost-response');
    let completed;
    await renderCart({ items: variantItems, onOrderCreated: order => { completed = order; } });
    await clickPayment('Pagamento em dinheiro na entrega');
    await clickLabel('Não preciso de troco');
    await clickLabel('Finalizar pedido');
    assert(sandbox.textContent.includes('Verificar pedido anterior'), 'Não ofereceu recuperação');
    const attempt = localStorage.getItem(orderAttemptKey(testUser.id));
    await render(<div />);
    await renderCart({ items: [], canPlaceOrder: false, isStoreOpen: false, onOrderCreated: order => { completed = order; } });
    assert(!finishButton().disabled, 'Bloqueou recuperação com sacola vazia/loja fechada');
    await clickLabel('Finalizar pedido');
    assert(completed?.total === 120 && completed.items.length === 3, 'Não recuperou o conteúdo original');
    assert(simulation.rows.size === 1 && simulation.notifications.length === 1, 'Duplicou pedido/notificação');
    assert(simulation.calls[1].p_request_id === JSON.parse(attempt).requestId, 'Trocou a chave');
    assert(localStorage.getItem(orderAttemptKey(testUser.id)) === null, 'Não encerrou a tentativa confirmada');
  });

  await check('RPC ausente: mantém a tentativa e nunca recorre à inserção sem proteção', async () => {
    const simulation = simulateProtectedOrders('missing-rpc');
    await renderCart();
    await clickPayment('Pagamento em dinheiro na entrega');
    await clickLabel('Não preciso de troco');
    await clickLabel('Finalizar pedido');
    await clickLabel('Finalizar pedido');
    assert(simulation.calls.length === 2 && simulation.calls[0].p_request_id === simulation.calls[1].p_request_id, 'Gerou outra tentativa');
    assert(writes.length === 0 && simulation.rows.size === 0, 'Usou fallback inseguro');
  });

  await check('Clique duplo antes da resposta executa apenas uma finalização', async () => {
    const simulation = simulateProtectedOrders('pending');
    let completions = 0;
    await renderCart({ onOrderCreated: () => { completions++; } });
    await clickPayment('Pagamento em dinheiro na entrega');
    await clickLabel('Não preciso de troco');
    await act(async () => { finishButton().click(); finishButton().click(); await flushOrderReservation(); });
    assert(simulation.calls.length === 1, 'Disparou duas operações');
    await act(async () => simulation.release());
    assert(completions === 1 && simulation.notifications.length === 1, 'Concluiu duas vezes');
  });

  await check('Timeout da gravação permite verificar a mesma tentativa', async () => {
    const simulation = simulateProtectedOrders('pending');
    const originalTimeout = window.setTimeout;
    let expire;
    window.setTimeout = (callback, delay, ...args) => {
      if (delay === 60000) { expire = callback; return originalTimeout(noop, 60000); }
      return originalTimeout(callback, delay, ...args);
    };
    try {
      await renderCart();
      await clickPayment('Pagamento em dinheiro na entrega');
      await clickLabel('Não preciso de troco');
      await clickLabel('Finalizar pedido');
      await act(async () => expire());
      assert(sandbox.textContent.includes('Verificar pedido anterior'), 'Timeout não ofereceu recuperação');
      await clickLabel('Finalizar pedido');
      assert(simulation.rows.size === 1 && simulation.notifications.length === 1, 'Timeout gerou duplicidade');
    } finally { window.setTimeout = originalTimeout; }
  });

  await check('Troca de conta durante resposta não limpa a sacola da outra conta', async () => {
    const simulation = simulateProtectedOrders('pending');
    let completions = 0;
    await renderCart({ onOrderCreated: () => { completions++; } });
    await clickPayment('Pagamento em dinheiro na entrega');
    await clickLabel('Não preciso de troco');
    await clickLabel('Finalizar pedido');
    await renderCart({ user: { ...cartProps.user, id: 'outro-cliente' }, onOrderCreated: () => { completions++; } });
    await act(async () => simulation.release());
    assert(completions === 0, 'Resposta antiga alterou a outra conta');
    assert(localStorage.getItem(orderAttemptKey(testUser.id)), 'Perdeu a tentativa da primeira conta');
  });

  await check('Recuperar pedido anterior preserva itens acrescentados depois na sacola', async () => {
    installClock('2026-09-02T23:30:00-03:00');
    installAppFixture(() => Response.json([profileRow]), regularHours);
    simulateProtectedOrders();
    const extra = { ...variantItems[0], quantity: 2, observations: 'acrescentado depois' };
    localStorage.setItem('cart', JSON.stringify([...variantItems, extra]));
    localStorage.setItem('isMercadoPagoReturnFlow', 'true');
    localStorage.setItem(orderAttemptKey(testUser.id), JSON.stringify({
      requestId: 'tentativa-anterior', couponId: null,
      payload: { user_id: testUser.id, items: variantItems.map(item => ({ product_id: item.product.id, name: item.product.name, price: item.product.price, quantity: item.quantity, observations: item.observations })),
        total: 120, delivery_fee: 0, delivery_type: 'pickup', payment_method: 'cash', status: 'Pedido recebido', customer_name: 'Teste', customer_phone: '', address: null, change_for: null, sushi_egg_delivery_day: null },
    }));
    await render(<App />);
    await clickLabel('Finalizar pedido');
    assert(JSON.stringify(readCart()) === JSON.stringify([extra]), 'Apagou os itens novos ao recuperar');
  });

  await check('Falha ao reservar notificação permite recuperar sem duplicar pedido', async () => {
    const simulation = simulateProtectedOrders('claim-error');
    await renderCart();
    await clickPayment('Pagamento em dinheiro na entrega');
    await clickLabel('Não preciso de troco');
    await clickLabel('Finalizar pedido');
    await clickLabel('Finalizar pedido');
    assert(simulation.rows.size === 1 && simulation.notifications.length === 1, 'Repetiu efeitos após falha de reserva');
  });
}

assert(writes.length === 0, 'Houve tentativa de gravação ou envio fora das interceptações locais');
document.querySelector('#status').textContent = `Concluído: ${passed} passaram, ${failed} falharam; zero gravações ou envios reais; ${completedSimulations.length} pedidos simulados localmente.`;
