import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBets, useCreateBet } from '@/hooks/useBets';
import { useBankroll, useUpdateBankroll } from '@/hooks/usePredictions';

const fromMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => fromMock(...args),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-a' } }),
}));

const createBuilder = (response: any) => {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(() => Promise.resolve(response)),
    single: vi.fn(() => Promise.resolve(response)),
    then: (resolve: any, reject: any) => Promise.resolve(response).then(resolve, reject),
  };
  return builder;
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('isolamento de dados por user_id', () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it('useBets filtra por user_id', async () => {
    const builder = createBuilder({ data: [], error: null });
    fromMock.mockReturnValue(builder);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useBets(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fromMock).toHaveBeenCalledWith('bets');
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-a');
  });

  it('useCreateBet insere user_id no payload', async () => {
    const builder = createBuilder({ data: { id: 'bet-1' }, error: null });
    let insertPayload: any = null;
    builder.insert = vi.fn((payload: any) => {
      insertPayload = payload;
      return builder;
    });
    fromMock.mockReturnValue(builder);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateBet(), { wrapper });

    await result.current.mutateAsync({
      home_team: 'Casa',
      away_team: 'Fora',
      league: 'Liga',
      fixture_id: 1,
      prediction: '1',
      stake: 10,
      potential_profit: 15,
      odd: 2,
    });

    expect(insertPayload.user_id).toBe('user-a');
  });

  it('useBankroll filtra por user_id', async () => {
    const builder = createBuilder({ data: { id: 'row-1', amount: 100, user_id: 'user-a' }, error: null });
    fromMock.mockReturnValue(builder);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useBankroll(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fromMock).toHaveBeenCalledWith('bankroll');
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-a');
  });

  it('useUpdateBankroll restringe update ao user_id', async () => {
    const upsertBuilder = createBuilder({ data: null, error: null });
    fromMock.mockReturnValue(upsertBuilder);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateBankroll(), { wrapper });

    await result.current.mutateAsync(250);

    expect(fromMock).toHaveBeenCalledWith('bankroll');
    expect(upsertBuilder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-a', amount: 250 }),
      { onConflict: 'user_id' }
    );
  });
});
