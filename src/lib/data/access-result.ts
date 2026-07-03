export type DataResult<T> = { data: T; error: null } | { data: null; error: string };

export function dataError(message = "The requested data could not be loaded."): DataResult<never> {
  return { data: null, error: message };
}
