
import { useQuery, UseQueryOptions } from '@tanstack/react-query';

export const useApiQuery = <TData = unknown, TError = unknown>(
  key: string[],
  fn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: key,
    queryFn: fn,
    ...options,
  });
};

export default useApiQuery;
