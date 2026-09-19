// Признак слабой платформы: отдельного «телевизионного» режима нет, признак один — Android.
// Раскладка щедро пользует размытие подложки: на приставке это сто миллисекунд на кадр не из-за видеочипа,
// а потому что подложку под каждым стеклом приходится снимать заново каждый кадр. Что глушится — в theme.css у .am-lite.

const LITE = 'am-lite'

let weak = false

/// Слабая ли платформа. Верно с момента вызова markPlatform().
export function isWeakPlatform(): boolean {
  return weak
}

/** Есть ли браузер: на телевизоре его нет, и кнопка, которая никуда не ведёт, хуже отсутствия. */
export function canOpenOutside(): boolean {
  return !weak
}

/** Звать до createApp(): класс должен стоять на <html> к первой отрисовке. */
export function markPlatform(): void {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent || ''
  weak = /Android/i.test(ua)
  if (weak) document.documentElement.classList.add(LITE)
}
