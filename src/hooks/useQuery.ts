import { useState, useEffect, useCallback } from 'react';

export const TIMEOUT_MS = 30000; // 30 segundos
export const MAX_RETRIES = 3;

// Função helper para adicionar timeout a uma Promise
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout - a requisição demorou muito')), timeoutMs)
    ),
  ]);
}

// Função helper para retry com backoff
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`useQuery: Tentativa ${attempt}/${retries}`);
      return await fn();
    } catch (error) {
      if (attempt === retries) {
        console.error(`useQuery: Todas as ${retries} tentativas falharam`);
        throw error;
      }
      const delayMs = 1000 * attempt; // 1s, 2s, 3s
      console.log(`useQuery: Tentando novamente em ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('Retry failed');
}

export function useQuery<T>(
  queryFn: () => Promise<T>,
  initialData: T
): { data: T; loading: boolean; error: Error | null; refetch: () => void } {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const executeQuery = useCallback(async () => {
    console.log('useQuery: Executando query...');
    setLoading(true);
    setError(null);

    try {
      const result = await withRetry(() => withTimeout(queryFn(), TIMEOUT_MS));
      setData(result);
      console.log('useQuery: Query executada com sucesso');
    } catch (err) {
      console.error("useQuery error:", err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [queryFn]);

  useEffect(() => {
    executeQuery();
  }, [executeQuery]);

  // Detecta quando o usuário volta para a aba
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && error) {
        console.log('useQuery: Aba ficou ativa novamente, recarregando dados...');
        executeQuery();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [error, executeQuery]);

  return { data, loading, error, refetch: executeQuery };
}