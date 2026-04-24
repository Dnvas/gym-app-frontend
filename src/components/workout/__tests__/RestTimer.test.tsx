import React from 'react'
import { Vibration } from 'react-native'
import { render, fireEvent, act } from '@testing-library/react-native'
import RestTimer from '../RestTimer'

// ── Setup ─────────────────────────────────────────────────────────────────────

jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {})

beforeEach(() => {
  jest.useFakeTimers()
  jest.clearAllMocks()
})

afterEach(() => {
  jest.runOnlyPendingTimers()
  jest.useRealTimers()
})

function renderTimer(props: Partial<React.ComponentProps<typeof RestTimer>> = {}) {
  const onClose = jest.fn()
  const onSkip = jest.fn()
  const utils = render(
    <RestTimer
      visible={true}
      duration={props.duration ?? 60}
      onClose={props.onClose ?? onClose}
      onSkip={props.onSkip ?? onSkip}
      {...props}
    />
  )
  return { ...utils, onClose, onSkip }
}

// ── Display ───────────────────────────────────────────────────────────────────

describe('display', () => {
  it('renders the initial duration as a formatted MM:SS string', () => {
    const { getByText } = renderTimer({ duration: 90 })
    expect(getByText('1:30')).toBeTruthy()
  })

  it('renders a sub-minute duration correctly', () => {
    const { getByText } = renderTimer({ duration: 45 })
    expect(getByText('0:45')).toBeTruthy()
  })

  it('pads single-digit seconds with a leading zero', () => {
    const { getByText } = renderTimer({ duration: 65 })
    expect(getByText('1:05')).toBeTruthy()
  })
})

// ── Countdown ─────────────────────────────────────────────────────────────────

describe('countdown', () => {
  it('decrements the display by 1 second after 1000ms', () => {
    const { getByText } = renderTimer({ duration: 5 })
    expect(getByText('0:05')).toBeTruthy()

    act(() => { jest.advanceTimersByTime(1000) })

    expect(getByText('0:04')).toBeTruthy()
  })

  it('calls onClose once when the full duration has elapsed', () => {
    const onClose = jest.fn()
    renderTimer({ duration: 3, onClose })

    act(() => { jest.advanceTimersByTime(3000) })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose before the duration has elapsed', () => {
    const onClose = jest.fn()
    renderTimer({ duration: 5, onClose })

    act(() => { jest.advanceTimersByTime(4000) })

    expect(onClose).not.toHaveBeenCalled()
  })

  it('vibrates when the countdown reaches zero', () => {
    renderTimer({ duration: 1 })

    act(() => { jest.advanceTimersByTime(1000) })

    expect(Vibration.vibrate).toHaveBeenCalledTimes(1)
  })
})

// ── Controls ──────────────────────────────────────────────────────────────────

describe('controls', () => {
  it('pressing "Skip Rest" calls onSkip immediately', () => {
    const { getByText, onSkip } = renderTimer()
    fireEvent.press(getByText('Skip Rest'))
    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  it('+15s button increases the displayed time by 15 seconds', () => {
    const { getByText } = renderTimer({ duration: 30 })
    expect(getByText('0:30')).toBeTruthy()

    fireEvent.press(getByText('+15s'))

    expect(getByText('0:45')).toBeTruthy()
  })

  it('-15s button decreases the displayed time by 15 seconds', () => {
    const { getByText } = renderTimer({ duration: 60 })
    fireEvent.press(getByText('-15s'))
    expect(getByText('0:45')).toBeTruthy()
  })

  it('-15s button floors at 0:00 and does not go negative', () => {
    const { getByText } = renderTimer({ duration: 10 })
    // 10s - 15s would be negative; Math.max(0, ...) floors it
    fireEvent.press(getByText('-15s'))
    expect(getByText('0:00')).toBeTruthy()
  })
})
