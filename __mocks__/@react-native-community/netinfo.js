const listeners = []

const NetInfo = {
  addEventListener: jest.fn((cb) => {
    listeners.push(cb)
    return jest.fn(() => {
      const i = listeners.indexOf(cb)
      if (i > -1) listeners.splice(i, 1)
    })
  }),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}

module.exports = NetInfo
module.exports.default = NetInfo
