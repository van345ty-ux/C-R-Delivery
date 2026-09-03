import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const { outputText } = ts.transpileModule(readFileSync(new URL('../src/utils/storeStatus.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
});
const { getStoreStatus } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const regular = [{ day_of_week: 3, is_open: true, open_time: '18:00', close_time: '23:00' }];
const statusAt = (time, hours = regular, city = 'Una') => getStoreStatus(hours, city, new Date(time));

test('abre no horário exato e fecha no limite configurado', () => {
  assert.equal(statusAt('2026-09-02T17:59:59-03:00').isStoreOpen, false);
  assert.equal(statusAt('2026-09-02T18:00:00-03:00').isStoreOpen, true);
  assert.equal(statusAt('2026-09-02T22:59:59-03:00').isStoreOpen, true);
  assert.equal(statusAt('2026-09-02T23:00:00-03:00').isStoreOpen, false);
});

test('aceita horários com segundos vindos do banco sem atrasar a abertura', () => {
  const hours = [{ ...regular[0], open_time: '18:00:00', close_time: '23:00:00' }];
  assert.equal(statusAt('2026-09-02T18:00:00-03:00', hours).isStoreOpen, true);
  assert.equal(statusAt('2026-09-02T23:00:00-03:00', hours).isStoreOpen, false);
});

test('calcula o dia e a hora em Brasília, inclusive quando já é outro dia em UTC', () => {
  assert.equal(statusAt('2026-09-03T01:00:00Z').isStoreOpen, true);
  assert.equal(statusAt('2026-09-03T02:00:00Z').isStoreOpen, false);
});

test('respeita dias desativados e ausência de grade em Una', () => {
  assert.equal(statusAt('2026-09-02T20:00:00-03:00', [{ ...regular[0], is_open: false }]).canPlaceOrder, false);
  assert.equal(statusAt('2026-09-02T20:00:00-03:00', []).canPlaceOrder, false);
  assert.equal(statusAt('2026-09-03T20:00:00-03:00').canPlaceOrder, false);
});

test('turno atravessa meia-noite e termina no fechamento do dia anterior', () => {
  const hours = [{ ...regular[0], close_time: '02:00:00' }];
  assert.equal(statusAt('2026-09-02T23:59:59-03:00', hours).isStoreOpen, true);
  assert.equal(statusAt('2026-09-03T00:00:00-03:00', hours).isStoreOpen, true);
  assert.equal(statusAt('2026-09-03T01:59:59-03:00', hours).isStoreOpen, true);
  assert.equal(statusAt('2026-09-03T02:00:00-03:00', hours).isStoreOpen, false);
});

test('turno de domingo continua na segunda-feira', () => {
  const hours = [{ day_of_week: 0, is_open: true, open_time: '22:00', close_time: '01:00' }];
  assert.equal(statusAt('2026-09-07T00:30:00-03:00', hours).isStoreOpen, true);
  assert.equal(statusAt('2026-09-07T01:00:00-03:00', hours).isStoreOpen, false);
});

test('não abre com horários inválidos nem interpreta horários iguais como 24 horas', () => {
  for (const [open_time, close_time] of [['inválido', '23:00'], ['18:00', '25:00'], ['00:00', '00:00']]) {
    assert.equal(statusAt('2026-09-02T20:00:00-03:00', [{ ...regular[0], open_time, close_time }]).isStoreOpen, false);
  }
});

test('Comandatuba mantém agendamento 24 horas mesmo com loja fechada ou grade ausente', () => {
  for (const city of ['Comandatuba', 'ILHA DE COMANDATUBA']) {
    const status = statusAt('2026-09-03T04:00:00-03:00', [], city);
    assert.equal(status.isStoreOpen, false);
    assert.equal(status.canPlaceOrder, true);
    assert.equal(status.showPreOrderBanner, true);
  }
});
