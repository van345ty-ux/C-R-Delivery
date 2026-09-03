import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useForm } from 'react-hook-form';
import { createClient } from '@supabase/supabase-js';
import { Button } from '../src/components/ui/button';
import { probeOrderApi } from './order-api-probe.mjs';
import '../src/index.css';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

function ApiCheck() {
  const { register, handleSubmit, reset } = useForm();
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('Aguardando login para verificar o acesso.');

  async function check(credentials) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setResults([]);
    setStatus('Verificando…');
    // Cliente exclusivo deste diagnóstico: não lê nem salva a sessão do aplicativo.
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'cr-sushi-api-check' },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) },
    });
    try {
      const anonymousResults = await probeOrderApi({ url, key });
      setResults(anonymousResults);
      if (anonymousResults.some(result => !result.ok)) {
        setStatus('Verificação anônima precisa de revisão. Envie o resultado antes de continuar.');
        return;
      }
      const { data, error } = await client.auth.signInWithPassword(credentials);
      reset();
      if (error || !data.session) {
        setStatus('Não foi possível entrar. Confira o e-mail e a senha de uma conta existente.');
        return;
      }
      const authenticatedResults = await probeOrderApi({ url, key, accessToken: data.session.access_token, authenticated: true });
      const all = [...anonymousResults, ...authenticatedResults];
      setResults(all);
      setStatus(all.every(result => result.ok)
        ? 'Acesso verificado. Envie o resultado para continuar. A proteção permanece desativada.'
        : 'Há uma verificação pendente. Use uma conta comum de cliente e envie o resultado.');
    } catch {
      setStatus('Não foi possível concluir a conexão. Envie esta mensagem para verificarmos.');
    } finally {
      reset();
      // Fecha apenas a sessão criada aqui; não encerra outras sessões da conta.
      try { await client.auth.signOut({ scope: 'local' }); } catch { /* sessão não persistida */ }
      running.current = false;
      setBusy(false);
    }
  }

  return <main className="max-w-lg mx-auto p-6 space-y-4 text-gray-900 bg-white">
    <h1 className="text-2xl font-bold">Verificar acesso aos pedidos</h1>
    <p>Diagnóstico local conectado ao Supabase do sistema. Não cria pedidos, consome cupons ou envia mensagens.</p>
    <p>Entre com uma conta comum de cliente, sem acesso administrativo. A senha não é salva nesta página.</p>
    <form onSubmit={handleSubmit(check)} className="space-y-4">
      <label className="block">E-mail
        <input type="email" autoComplete="username" required disabled={busy}
          className="block w-full border rounded p-2" {...register('email', { required: true })} />
      </label>
      <label className="block">Senha
        <input type="password" autoComplete="current-password" required disabled={busy}
          className="block w-full border rounded p-2" {...register('password', { required: true })} />
      </label>
      <Button type="submit" disabled={busy} className="bg-red-700 text-white hover:bg-red-800">
        {busy ? 'Verificando…' : 'Entrar e verificar acesso'}
      </Button>
    </form>
    <p role="status">{status}</p>
    <ul className="space-y-2">{results.map(result => <li key={result.name}>
      <strong>{result.ok ? 'OK' : 'REVISAR'}</strong> — {result.name}
    </li>)}</ul>
    <p className="text-sm">Esta verificação não testa criação de pedidos nem pagamentos. Não altera a ativação do aplicativo.</p>
  </main>;
}

createRoot(document.getElementById('root')).render(<ApiCheck />);
