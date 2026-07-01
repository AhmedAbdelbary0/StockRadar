import { useState, useCallback } from 'react';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T, Args extends any[]> extends UseApiState<T> {
  execute: (...args: Args) => Promise<T | null>;
  reset: () => void;
}

/**
 * Generic hook for API calls with loading/error state management.
 */
export function useApi<T, Args extends any[] = any[]>(
  apiFunc: (...args: Args) => Promise<T>
): UseApiReturn<T, Args> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setState({ data: null, loading: true, error: null });
      try {
        const result = await apiFunc(...args);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (err: unknown) {
        let message = 'An unexpected error occurred';
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosErr = err as { response?: { data?: { error?: string; errors?: string[] } } };
          if (axiosErr.response?.data?.error) {
            message = axiosErr.response.data.error;
          } else if (axiosErr.response?.data?.errors) {
            message = axiosErr.response.data.errors.join(', ');
          }
        } else if (err instanceof Error) {
          message = err.message;
        }
        setState({ data: null, loading: false, error: message });
        return null;
      }
    },
    [apiFunc]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}

