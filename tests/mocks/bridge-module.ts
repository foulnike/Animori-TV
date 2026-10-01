import { createMockBridge, type MockBridgeHandle } from './bridge'

/**
 * Вывеска повторяется целиком: без `BridgeHttpError` код, различающий отказ транспорта и
 * отказ моста, падает на `instanceof` и проверяет не тот путь. Класс настоящий.
 */
export { BridgeHttpError } from '../../src/shared/bridge/IBridge'

export let currentMock: MockBridgeHandle | null = null

export function installMockBridge(): MockBridgeHandle {
  currentMock = createMockBridge()
  return currentMock
}

function forward(key: PropertyKey): unknown {
  if (currentMock === null) throw new Error('mock bridge не установлен')
  return currentMock.bridge[key as keyof typeof currentMock.bridge]
}

export const Bridge = new Proxy({} as any, {
  get(_target, key) {
    return forward(key)
  },
  set() {
    return false
  },
})

export function resetMockBridge(): void {
  currentMock = null
}
