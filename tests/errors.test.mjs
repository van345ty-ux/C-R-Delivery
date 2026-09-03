import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/utils/errors.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
});
const { getErrorMessage } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
);

test('preserva a mensagem de erros nativos', () => {
  assert.equal(getErrorMessage(new Error('Falha de conexão')), 'Falha de conexão');
});

test('preserva mensagens de objetos retornados pela API do Supabase', () => {
  const error = { message: 'Acesso negado', code: '42501', details: null, hint: null };
  assert.equal(getErrorMessage(error), 'Acesso negado');
});

test('preserva o texto alternativo específico de cada formulário', () => {
  for (const error of [new Error(''), { message: '' }, {}]) {
    assert.equal(getErrorMessage(error, 'Erro ao salvar o perfil.'), 'Erro ao salvar o perfil.');
  }
});

test('valores inesperados não causam outra falha no tratamento do erro', () => {
  for (const error of [null, undefined, 'falha', 42, false, { message: 42 }, { message: null }]) {
    assert.equal(getErrorMessage(error), 'Erro desconhecido');
  }
});
