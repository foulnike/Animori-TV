// Очередь «Назад» для окон поверх экрана: пока окно открыто, «Назад» значит «закрыть окно».
// Аппаратная кнопка на Android достаётся оболочке раньше страницы: окно обязано сказать наружу, что живо.
// Закрываются сначала записавшиеся окна; прочие — клавишей Escape, её слушают все наши окна.

/// Записанный шаг «Назад». Возвращает true, если шаг принят — то есть окно
/// закрылось и наружу идти не надо.
type Stop = () => boolean

const stops: Stop[] = []

/// Верхнее из окон в разметке. Окна ставятся по `v-if`, поэтому наличие
/// узла и есть «окно открыто».
function opened(): Element | null {
  return document.querySelector('[role="dialog"]')
}

/// Говорит оболочке, есть ли сейчас кому принять шаг «Назад».
///
/// На компьютере моста нет, и вызов молча никуда не уходит: там «Назад»
/// ходит по истории, как прежде.
let armed = false

function sync(): void {
  const now = stops.length > 0 || opened() !== null
  if (now === armed) return
  armed = now

  const bridge = (
    window as unknown as { AnimoriBack?: { setBackStop?: (on: boolean) => void } }
  ).AnimoriBack
  bridge?.setBackStop?.(now)
}

/**
 * Ставит окно в очередь «Назад». Возвращает сниматель.
 *
 * Порядок: последнее поставленное окно закрывается первым — оно же лежит
 * поверх прочих.
 */
export function pushBackStop(step: Stop): () => void {
  stops.push(step)
  sync()

  return function () {
    const at = stops.indexOf(step)
    if (at >= 0) stops.splice(at, 1)
    sync()
  }
}

/**
 * Пытается закрыть верхнее окно.
 *
 * Возвращает false, если окон нет: тогда «Назад» идёт по истории, как прежде.
 *
 * У окна без записи есть страховка: если оно Escape не послушалось, история
 * листается сама. Без неё человек остался бы в окне, из которого «Назад»
 * не выводит, а это хуже любого лишнего шага.
 */
export function runBackStop(): boolean {
  const step = stops[stops.length - 1]
  if (step !== undefined) return step()

  if (opened() === null) return false

  // Событие уходит владельцу фокуса, а не на `window`.
  //
  // Разница не косметическая. Отправленное на `window`, оно до слушателей
  // `document` не доходит вовсе: путь события при отправке на окно — само
  // окно. Окно, слушающее `document` (справка копии списка — её стрелки
  // должны обгонять пульт), шага не получало, и «Назад» уходил по истории
  // вместе с экраном под окном. Замер с приставки: «Назад» в справке
  // копии списка выбрасывал с настроек на главную, а окно уезжало вместе
  // с экраном — человек его и не закрывал.
  //
  // Отправка на владельца фокуса повторяет настоящее нажатие: событие
  // всплывает через `document` к `window`, и видят его оба вида слушателей.
  const holder =
    document.activeElement instanceof HTMLElement ? document.activeElement : document.body
  holder.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  window.setTimeout(sync, 60)
  window.setTimeout(function () {
    if (opened() !== null) window.history.back()
  }, 60)

  return true
}

// Окно открывается и закрывается само, помимо нашей записи: галерея кадров
// и окно тем живут на своём состоянии. Сторож дешёвый: пока ничего не
// изменилось, наружу не уходит ничего.
const watch =
  typeof MutationObserver === 'function'
    ? new MutationObserver(function () {
        sync()
      })
    : null

watch?.observe(document.documentElement, { childList: true, subtree: true })

// Вызов оболочки по имени: она выполняет строку сама и своего контекста
// странице не даёт. Имя в окне — цена этого моста.
;(window as unknown as { __amBackStop?: () => void }).__amBackStop = function () {
  runBackStop()
}
