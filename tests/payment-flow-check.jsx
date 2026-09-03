import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import { Cart } from '../src/components/Cart';
import { ThemeContext } from '../src/contexts/theme-context';
import { Button } from '../src/components/ui/button';
import { getCartItemKey } from '../src/utils/cart';
import { orderProtectionEnabled } from '../src/utils/protectedOrderSubmission';
import { writes } from './fixtures/supabase.mjs';
import '../src/index.css';

if (!orderProtectionEnabled) throw new Error('Use a configuração de teste visual com a proteção ligada.');
const user = { id: 'cliente-teste-visual', name: 'Cliente fictício', email: 'cliente@example.test', phone: '' };
const flags = ['isMercadoPagoReturnFlow', 'isPixReturnFlow', 'hasSeenMercadoPagoWarning', 'pixPaymentInitiated', 'hasAcknowledgedPixReturnConfirmation', 'hasSeenPixInstructions'];
const readFlag = key => localStorage.getItem(key) === 'true';
const initialItems = ['sem cebola', 'sem molho'].map(observations => ({
  product: { id: 'combo-ficticio', name: 'Combo de teste', price: 30, category: 'Sushi', image: '/assets/logo.png', description: '', available: true },
  quantity: 1, observations,
}));
function resetScenario() {
  for (const key of flags) localStorage.setItem(key, 'false');
  localStorage.removeItem(`cr-sushi:pending-order:${user.id}`);
  localStorage.setItem('cartDeliveryType', 'pickup');
  localStorage.setItem('cartAddress', '');
  localStorage.setItem('cartCouponCode', '');
  localStorage.setItem('cartAppliedCoupon', 'null');
  localStorage.setItem('payment-flow-test-initialized', 'true');
}
if (!localStorage.getItem('payment-flow-test-initialized')) resetScenario();

function PaymentFlowCheck() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(initialItems);
  const [returnFlags, setReturnFlags] = useState({ card: readFlag('isMercadoPagoReturnFlow'), pix: readFlag('isPixReturnFlow') });
  const [blocked, setBlocked] = useState(0);
  useEffect(() => {
    const update = () => {
      setReturnFlags({ card: readFlag('isMercadoPagoReturnFlow'), pix: readFlag('isPixReturnFlow') });
      setBlocked(writes.length);
    };
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    const timer = setInterval(() => setBlocked(writes.length), 500);
    return () => { window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update); clearInterval(timer); };
  }, []);
  const restart = () => {
    setOpen(false);
    resetScenario();
    setItems(initialItems);
    setReturnFlags({ card: false, pix: false });
  };
  return <ThemeContext.Provider value={{ theme: 'light', allowThemeToggle: false, isWorldCupMode: false, toggleTheme() {}, setTheme() {}, async toggleWorldCupMode() {} }}>
    <main className="max-w-lg mx-auto p-6 space-y-4 bg-white text-gray-900">
      <h1 className="text-2xl font-bold">Conferência visual dos pagamentos</h1>
      <p>Componente real da sacola, com proteção ligada e dados fictícios. Gravação de pedidos e envio de mensagens estão bloqueados.</p>
      <p>Dinheiro: confira o troco. Pix: confira as instruções e o aviso ao retornar. Cartão: confira o aviso e a nova aba.</p>
      <p>A chave Pix é inválida para pagamento e o cartão abre uma página local de teste. Nenhuma cobrança é feita.</p>
      <div className="flex gap-3">
        <Button className="bg-red-700 text-white hover:bg-red-800" onClick={() => setOpen(true)}>Abrir sacola de teste</Button>
        <Button variant="outline" onClick={restart}>Reiniciar teste</Button>
      </div>
      <p role="status">Gravações reais: 0. Tentativas bloqueadas neste teste: {blocked}.</p>
      <p>Feche a sacola e use “Reiniciar teste” para começar outro cenário.</p>
    </main>
    {open && <Cart
      items={items} user={user} onClose={() => setOpen(false)}
      onUpdateQuantity={(key, quantity) => setItems(current => current.map(item => getCartItemKey(item) === key ? { ...item, quantity } : item))}
      onRemoveItem={key => setItems(current => current.filter(item => getCartItemKey(item) !== key))}
      onOrderCreated={() => { throw new Error('Teste visual não pode confirmar um pedido.'); }}
      isStoreOpen canPlaceOrder selectedCity="Una" deliveryFee={3} comandatubaDeliveryFee={8}
      isMercadoPagoReturnFlow={returnFlags.card} isPixReturnFlow={returnFlags.pix}
      pixKey="CHAVE-FICTICIA-NAO-PAGAR" mercadoPagoLink={`${location.origin}/tests/payment-tab.html`}
    />}
    <Toaster />
  </ThemeContext.Provider>;
}
createRoot(document.getElementById('root')).render(<PaymentFlowCheck />);
