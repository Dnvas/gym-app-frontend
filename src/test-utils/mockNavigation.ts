// src/test-utils/mockNavigation.ts
// Factory for navigation prop mocks used in screen tests.
export function createNavigationMock() {
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
    removeListener: jest.fn(),
    canGoBack: jest.fn(() => true),
    dispatch: jest.fn(),
    reset: jest.fn(),
    isFocused: jest.fn(() => true),
  }
}
