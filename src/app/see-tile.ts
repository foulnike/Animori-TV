// Отметка о появлении плитки в окне: спрашивать источники стоит о том, что видно.
// Наблюдатель один на окно, а не на плитку: сотня расчётов об один экран никому не нужна.
// Просьба одноразовая: спросили — сняли с наблюдения, ответ уже лежит в памяти ядра.

import type { Directive } from 'vue'

import { Logger } from '@/utils/logger'

/**
 * Насколько раньше края окна считать плитку показанной. Примерно ряд запаса:
 * пока человек долистывает до него, ответ уже едет, и метка не выскакивает
 * на глазах поверх готового постера.
 */
const LOOK_AHEAD_PX = 300

/**
 * Что делать, когда узел показался. Слабые ссылки: снятая с экрана плитка
 * уводит свою запись сама, а в длинном списке таких узлов сотни.
 */
const calls = new WeakMap<Element, () => void>()

let eye: IntersectionObserver | null = null

/** Зовёт обработчик. Чужая ошибка не должна снимать наблюдение с остальных плиток. */
function run(call: () => void): void {
  try {
    call()
  } catch (e) {
    Logger('WARN', 'Показ плитки: обработчик споткнулся', e)
  }
}

/** Узел показался: зовём обработчик один раз и больше за узлом не следим. */
function fire(el: Element): void {
  const call = calls.get(el)
  if (call === undefined) return

  calls.delete(el)
  eye?.unobserve(el)

  run(call)
}

/** Наблюдатель окна. Заводится перед первой плиткой и дальше живёт один на всех. */
function eyeNode(): IntersectionObserver | null {
  if (eye !== null) return eye
  if (typeof IntersectionObserver === 'undefined') return null

  eye = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue

        fire(entry.target)
      }
    },
    { rootMargin: `${String(LOOK_AHEAD_PX)}px 0px`, threshold: 0 },
  )

  return eye
}

/**
 * Одноразовая отметка о показе: v-seen="() => onSeen(row.mediaId)".
 *
 * Значение — что сделать, когда узел впервые попал в окно. Не функция — следить
 * не за чем, и узел не берётся вовсе: условие в разметке не нужно.
 */
export const seen: Directive<HTMLElement, (() => void) | null | undefined> = {
  mounted(el, binding) {
    const call = binding.value
    if (typeof call !== 'function') return

    const watcher = eyeNode()
    if (watcher === null) {
      // Движок без наблюдателя пересечений: считаем плитку показанной сразу.
      // Лишние вопросы лучше сетки, где меток нет вовсе.
      run(call)
      return
    }

    calls.set(el, call)
    watcher.observe(el)
  },

  updated(el, binding) {
    // Строка перерисовывается на месте: приехало русское название, пришла
    // чужая метка. Обработчик при этом каждый раз новый, и прежний указывал бы
    // на выписку прошлой перерисовки.
    if (!calls.has(el)) return

    const call = binding.value
    if (typeof call === 'function') calls.set(el, call)
  },

  unmounted(el) {
    if (!calls.has(el)) return

    calls.delete(el)
    eye?.unobserve(el)
  },
}
