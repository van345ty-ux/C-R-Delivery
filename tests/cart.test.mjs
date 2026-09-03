import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const { outputText } = ts.transpileModule(readFileSync(new URL('../src/utils/cart.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
});
const { addCartItem, getCartItemKey, removeCartItem, updateCartItemQuantity, removeOrderedItems } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const product = { id: 'combo', name: 'Combo', price: 30, category: 'Sushi', available: true, image: '', description: '' };
const variants = () => [
  { product, quantity: 1, observations: 'sem cebola' },
  { product, quantity: 2, observations: 'sem molho' },
  { product, quantity: 3 },
];

test('mesmo produto com instruções diferentes fica em linhas separadas', () => {
  const items = addCartItem(addCartItem([], product, 1, 'sem cebola'), product, 2, 'sem molho');
  assert.equal(items.length, 2);
  assert.deepEqual(items.map(({ quantity, observations }) => [quantity, observations]), [[1, 'sem cebola'], [2, 'sem molho']]);
});

test('soma apenas o grupo com o mesmo produto e a mesma observação', () => {
  const items = addCartItem(variants(), product, 3, 'sem molho');
  assert.deepEqual(items.map(item => item.quantity), [1, 5, 3]);
  assert.equal(items.reduce((sum, item) => sum + item.product.price * item.quantity, 0), 270);
});

test('adicionar sem observação não apaga instruções, em qualquer ordem', () => {
  for (const notes of [['sem cebola', undefined], [undefined, 'sem cebola']]) {
    const items = notes.reduce((cart, note) => addCartItem(cart, product, 1, note), []);
    assert.equal(items.length, 2);
    assert.equal(items.find(item => item.observations === 'sem cebola').quantity, 1);
  }
  const items = addCartItem(addCartItem([], product, 1), product, 2, '');
  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 3);
});

test('preserva o texto e não confunde pontuação, maiúsculas ou separadores', () => {
  const notes = ['sem molho\nEmbalar separado 🍣', 'Sem molho', 'sem molho', 'sem "molho"'];
  const items = notes.reduce((cart, note) => addCartItem(cart, product, 1, note), []);
  assert.deepEqual(items.map(item => item.observations), notes);
  assert.notEqual(getCartItemKey({ product: { ...product, id: 'a:b' }, quantity: 1, observations: 'c' }),
    getCartItemKey({ product: { ...product, id: 'a' }, quantity: 1, observations: 'b:c' }));
});

test('alterar quantidade e remover afetam somente a linha selecionada', () => {
  const items = variants();
  const key = getCartItemKey(items[1]);
  assert.deepEqual(updateCartItemQuantity(items, key, 4).map(item => item.quantity), [1, 4, 3]);
  assert.deepEqual(removeCartItem(items, key), [items[0], items[2]]);
  assert.deepEqual(updateCartItemQuantity(items, key, 0), [items[0], items[2]]);
  assert.deepEqual(updateCartItemQuantity(items, key, -1), [items[0], items[2]]);
});

test('sacola antiga e restauração JSON não precisam de IDs novos', () => {
  const oldCart = JSON.parse(JSON.stringify(variants()));
  const items = addCartItem(oldCart, product, 1, 'sem cebola');
  const restored = JSON.parse(JSON.stringify(items));
  assert.deepEqual(removeCartItem(restored, getCartItemKey(oldCart[0])), oldCart.slice(1));
  assert.deepEqual(restored.map(item => item.quantity), [2, 2, 3]);
});

test('produtos diferentes não se misturam mesmo com a mesma observação', () => {
  const items = addCartItem(variants(), { ...product, id: 'outro-combo' }, 2, 'sem cebola');
  assert.equal(items.length, 4);
  assert.deepEqual(items.map(item => item.quantity), [1, 2, 3, 2]);
});

test('operações preservam o estado anterior e ignoram uma chave inexistente', () => {
  const items = variants();
  const previous = JSON.stringify(items);
  addCartItem(items, product, 2, 'sem cebola');
  updateCartItemQuantity(items, getCartItemKey(items[0]), 10);
  removeCartItem(items, getCartItemKey(items[0]));
  assert.equal(JSON.stringify(items), previous);
  assert.deepEqual(updateCartItemQuantity(items, 'inexistente', 5), items);
  assert.deepEqual(removeCartItem(items, 'inexistente'), items);
});

test('recuperação retira somente as quantidades e observações do pedido confirmado', () => {
  const ordered = variants();
  const cart = [...ordered.map(item => ({ ...item, quantity: item.quantity + 1 })), { product, quantity: 2, observations: 'nova instrução' }];
  const result = removeOrderedItems(cart, ordered);
  assert.deepEqual(result.map(item => item.quantity), [1, 1, 1, 2]);
  assert.equal(result[3].observations, 'nova instrução');
  assert.deepEqual(removeOrderedItems(ordered, ordered), []);
  assert.deepEqual(removeOrderedItems([], ordered), []);
});
