// src/lib/__mocks__/supabase.ts
// Chainable Supabase mock for hook unit tests.
//
// Usage in test files:
//   jest.mock('../../lib/supabase')
//   const { mockSupabaseResponse, resetMockQueue, mockFrom, mockChain } =
//     jest.requireMock('../../lib/supabase') as typeof import('./supabase')

type MockResponse = { data: any; error: any }
const _queue: MockResponse[] = []

export function mockSupabaseResponse(data: any, error: any = null) {
  _queue.push({ data, error })
}

export function resetMockQueue() {
  _queue.length = 0
}

function dequeue(): MockResponse {
  return _queue.shift() ?? { data: null, error: null }
}

// All chain methods return `this` so calls can be chained.
// terminal methods (.single, thenable .then) consume from the response queue.
export const mockChain: any = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  single: jest.fn().mockImplementation(() => Promise.resolve(dequeue())),
  // thenable: makes `await supabase.from(...).select(...)` work
  then(resolve: (v: MockResponse) => any, reject?: (e: any) => any) {
    return Promise.resolve(dequeue()).then(resolve, reject)
  },
}

export function setupChain() {
  mockChain.select.mockReturnThis()
  mockChain.insert.mockReturnThis()
  mockChain.update.mockReturnThis()
  mockChain.delete.mockReturnThis()
  mockChain.upsert.mockReturnThis()
  mockChain.eq.mockReturnThis()
  mockChain.neq.mockReturnThis()
  mockChain.gte.mockReturnThis()
  mockChain.lte.mockReturnThis()
  mockChain.order.mockReturnThis()
  mockChain.limit.mockReturnThis()
  mockChain.in.mockReturnThis()
  mockChain.single.mockImplementation(() => Promise.resolve(dequeue()))
}

export const mockFrom = jest.fn().mockReturnValue(mockChain)

export const supabase = {
  from: mockFrom,
}
