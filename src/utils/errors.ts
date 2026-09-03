// O Supabase pode retornar objetos com message sem serem instâncias de Error.
export function getErrorMessage(error: unknown, fallback = 'Erro desconhecido'): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message
  ) {
    return error.message;
  }

  return fallback;
}
