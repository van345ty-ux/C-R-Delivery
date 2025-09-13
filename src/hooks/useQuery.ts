import { useState, useEffect } from 'react';

export function useQuery<T>(
  queryFn: () => Promise<T>,
  initialData: T
): { data: T; loading: boolean; error: Error | null; refetch: () => void } {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const executeQuery = () => {
    console.log('useQuery: executeQuery called.'); // Adicionado log aqui
    setLoading(true);
    setError(null);
    queryFn()
      .then(setData)
      .catch(err => {
        console.error("useQuery error:", err);
        setError(err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    executeQuery();
  }, []);

  return { data, loading, error, refetch: executeQuery };
}