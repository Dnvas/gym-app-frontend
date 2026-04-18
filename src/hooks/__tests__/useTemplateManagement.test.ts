import { renderHook, act } from '@testing-library/react-native'
import { useTemplateManagement } from '../useTemplateManagement'
import { TemplateExerciseFormData } from '../../types/workout'

jest.mock('../../lib/supabase')
jest.mock('../../contexts/AuthContext')

const { mockSupabaseResponse, resetMockQueue, mockFrom, mockChain, setupChain } =
  jest.requireMock('../../lib/supabase') as typeof import('../../lib/__mocks__/supabase')

import * as AuthContextModule from '../../contexts/AuthContext'
const mockUseAuthContext = AuthContextModule.useAuthContext as jest.Mock

const MOCK_USER = { id: 'user-123' }

const makeExercise = (overrides = {}): TemplateExerciseFormData => ({
  tempId: 'temp-1',
  exercise_id: 'ex-1',
  exercise: {} as any,
  order_index: 0,
  target_sets: 3,
  target_reps: 10,
  target_rpe: null,
  rest_seconds: 90,
  notes: null,
  ...overrides,
})

beforeEach(() => {
  jest.clearAllMocks()
  resetMockQueue()
  setupChain()
  mockFrom.mockReturnValue(mockChain)
  mockUseAuthContext.mockReturnValue({ user: MOCK_USER })
})

describe('createTemplate', () => {
  it('inserts template then exercises and returns templateId', async () => {
    mockSupabaseResponse({ id: 'tpl-1' })  // workout_templates insert → single()
    mockSupabaseResponse([])               // template_exercises insert → thenable

    const { result } = renderHook(() => useTemplateManagement())
    let res: any
    await act(async () => {
      res = await result.current.createTemplate('Push Day', 'desc', [makeExercise()])
    })

    expect(res.success).toBe(true)
    expect(res.templateId).toBe('tpl-1')
    expect(mockFrom).toHaveBeenNthCalledWith(1, 'workout_templates')
    expect(mockFrom).toHaveBeenNthCalledWith(2, 'template_exercises')
  })

  it('skips exercise insert when exercise list is empty', async () => {
    mockSupabaseResponse({ id: 'tpl-1' })

    const { result } = renderHook(() => useTemplateManagement())
    let res: any
    await act(async () => {
      res = await result.current.createTemplate('Empty', null, [])
    })

    expect(res.success).toBe(true)
    expect(mockFrom).toHaveBeenCalledTimes(1)
  })

  it('returns success: false when not authenticated', async () => {
    mockUseAuthContext.mockReturnValueOnce({ user: null })

    const { result } = renderHook(() => useTemplateManagement())
    let res: any
    await act(async () => {
      res = await result.current.createTemplate('Push', null, [])
    })

    expect(res.success).toBe(false)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('surfaces template insert error', async () => {
    mockSupabaseResponse(null, { message: 'DB error' })

    const { result } = renderHook(() => useTemplateManagement())
    let res: any
    await act(async () => {
      res = await result.current.createTemplate('Push', null, [makeExercise()])
    })

    expect(res.success).toBe(false)
    expect(res.error).toBeTruthy()
  })
})

describe('deleteTemplate', () => {
  it('deletes template_exercises BEFORE workout_templates', async () => {
    mockSupabaseResponse(null)  // template_exercises delete
    mockSupabaseResponse(null)  // workout_templates delete

    const { result } = renderHook(() => useTemplateManagement())
    await act(async () => {
      await result.current.deleteTemplate('tpl-1')
    })

    expect(mockFrom).toHaveBeenNthCalledWith(1, 'template_exercises')
    expect(mockFrom).toHaveBeenNthCalledWith(2, 'workout_templates')
  })

  it('scopes workout_templates delete by created_by', async () => {
    mockSupabaseResponse(null)
    mockSupabaseResponse(null)

    const { result } = renderHook(() => useTemplateManagement())
    await act(async () => {
      await result.current.deleteTemplate('tpl-1')
    })

    const eqCalls = mockChain.eq.mock.calls
    const createdByCall = eqCalls.find((c: any[]) => c[0] === 'created_by')
    expect(createdByCall).toBeDefined()
    expect(createdByCall![1]).toBe(MOCK_USER.id)
  })

  it('surfaces child delete error without deleting parent', async () => {
    mockSupabaseResponse(null, { message: 'FK error' })

    const { result } = renderHook(() => useTemplateManagement())
    let res: any
    await act(async () => {
      res = await result.current.deleteTemplate('tpl-1')
    })

    expect(res.success).toBe(false)
    // Only called once — parent delete was not attempted
    expect(mockFrom).toHaveBeenCalledTimes(1)
  })
})

describe('updateTemplate', () => {
  it('deletes exercises then re-inserts them (replace strategy)', async () => {
    mockSupabaseResponse(null)   // update workout_templates
    mockSupabaseResponse(null)   // delete template_exercises
    mockSupabaseResponse([])     // insert template_exercises

    const { result } = renderHook(() => useTemplateManagement())
    let res: any
    await act(async () => {
      res = await result.current.updateTemplate('tpl-1', 'New Name', null, [makeExercise()])
    })

    expect(res.success).toBe(true)
    expect(mockChain.delete).toHaveBeenCalled()
    expect(mockChain.insert).toHaveBeenCalled()
  })
})

describe('fetchTemplateForEdit', () => {
  it('returns template sorted by order_index', async () => {
    const unsorted = {
      id: 'tpl-1',
      name: 'Push',
      template_exercises: [
        { id: 'te-2', order_index: 1 },
        { id: 'te-1', order_index: 0 },
      ],
    }
    mockSupabaseResponse(unsorted)

    const { result } = renderHook(() => useTemplateManagement())
    let template: any
    await act(async () => {
      template = await result.current.fetchTemplateForEdit('tpl-1')
    })

    expect(template.template_exercises[0].order_index).toBe(0)
    expect(template.template_exercises[1].order_index).toBe(1)
  })

  it('returns null and sets error on query failure', async () => {
    mockSupabaseResponse(null, { message: 'Not found' })

    const { result } = renderHook(() => useTemplateManagement())
    let template: any
    await act(async () => {
      template = await result.current.fetchTemplateForEdit('tpl-x')
    })

    expect(template).toBeNull()
    expect(result.current.error).toBeTruthy()
  })
})
