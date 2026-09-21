// Управление пультом: фокус ходит по стрелкам сам — в WebView пространственная навигация отключена.
// Цель ищется по геометрии, а не по порядку в разметке.

type Dir = 'left' | 'right' | 'up' | 'down'

const DIRS: Record<string, Dir> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
}

/// Порядок в разметке не важен, поэтому значение `tabindex` не читаем вовсе.
const FOCUSABLE = ['a[href]', 'button', 'input', 'select', 'textarea', '[tabindex]'].join(',')

/// `visibility: hidden` место занимает, а фокус не берёт: не отсечь его — `focus()` молча не сработает и пульт застрянет.
/// `opacity` не проверяем намеренно: полупрозрачный элемент фокус принимает.
function seen(el: HTMLElement): boolean {
  if (typeof el.checkVisibility === 'function') {
    return el.checkVisibility({ checkVisibilityCSS: true })
  }
  return getComputedStyle(el).visibility !== 'hidden'
}

function candidates(scope: ParentNode): HTMLElement[] {
  const out: HTMLElement[] = []
  const w = window.innerWidth || 960
  const h = window.innerHeight || 540

  scope.querySelectorAll<HTMLElement>(FOCUSABLE).forEach(function (el) {
    if (el.hasAttribute('disabled')) return
    if (el.getAttribute('aria-hidden') === 'true') return
    if (el.tabIndex < 0) return
    const box = el.getBoundingClientRect()
    if (box.width <= 0 || box.height <= 0) return

    // Дальше двух экранов не смотрим: на главной фокусируемых под сотню, и мерить геометрию каждого на каждое
    // нажатие для телевизора дорого — это заметно в кадре. Двух экранов запаса хватает до хвоста карусели.
    if (box.bottom < -h || box.top > h * 2) return
    if (box.right < -w || box.left > w * 2) return

    if (!seen(el)) return
    out.push(el)
  })

  return out
}

/// Ближайший элемент в сторону `dir`. Два прохода: сперва с перекрытием по поперечной оси, затем любой в нужную
/// сторону — без первого «вправо» с пункта меню уезжает на шапку, без второго фокус застревает у края полки.
function nearest(from: HTMLElement, dir: Dir, items: HTMLElement[]): HTMLElement | null {
  const f = from.getBoundingClientRect()
  const horiz = dir === 'left' || dir === 'right'
  const sign = dir === 'right' || dir === 'down' ? 1 : -1
  const fx = f.left + f.width / 2
  const fy = f.top + f.height / 2
  const fromSide = from.closest('.am-side') !== null

  function walk(strict: boolean): HTMLElement | null {
    let best: HTMLElement | null = null
    let score = Infinity

    for (const el of items) {
      if (el === from) continue
      const r = el.getBoundingClientRect()
      const along = sign * (horiz ? r.left + r.width / 2 - fx : r.top + r.height / 2 - fy)
      if (along <= 1) continue

      // Поперечное смещение — зазор между отрезками, а не разница центров: разница центров штрафует ширину,
      // и узкий элемент в стороне выигрывает у широкого соседа.
      const across = horiz
        ? Math.max(0, Math.max(r.top, f.top) - Math.min(r.bottom, f.bottom))
        : Math.max(0, Math.max(r.left, f.left) - Math.min(r.right, f.right))
      const overlap = horiz
        ? Math.min(r.bottom, f.bottom) - Math.max(r.top, f.top)
        : Math.min(r.right, f.right) - Math.max(r.left, f.left)

      if (strict) {
        if (overlap <= 0) continue
      } else if (across > along) {
        // Кандидат должен лежать скорее в нужную сторону, чем вбок, иначе с края полки фокус улетает в шапку.
        continue
      }

      // Рельс — отдельная полоса: вход в неё только влево, выход — только вправо, иначе фокус утекает в меню.
      // Вверх и вниз внутри рельса работают как обычно: там свои пункты.
      const inSide = el.closest('.am-side') !== null
      if (fromSide !== inSide && dir !== (fromSide ? 'right' : 'left')) continue

      // Кнопка подле цели (метка `data-am-beside`) — спутник крупной соседки: вверх-вниз водят по самим целям.
      if (!horiz && el.hasAttribute(BESIDE)) continue

      // Поперечное смещение штрафуем вдвое: «чуть дальше, но ровно в ряд» лучше, чем «ближе, но в стороне».
      const value = along + across * 2
      if (value < score) {
        score = value
        best = el
      }
    }

    return best
  }

  return walk(true) ?? walk(false)
}

/// Верхнее из открытых окон; `null` — открытых окон нет. `offsetParent` не годится
/// (у `position: fixed` он всегда null), а верхнее — последнее в разметке.
function topDialog(): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>('[role="dialog"]')
  for (let i = all.length - 1; i >= 0; i--) {
    const node = all[i]
    if (node !== undefined && seen(node)) return node
  }
  return null
}

/// Область поиска — верхнее из открытых окон: из окна фокус не должен уходить на то, что за ним.
function scope(): ParentNode {
  return topDialog() ?? document
}

/// Метка «плита со своей прокруткой»: за длинный текст пульту надо зацепиться, а не фокусируемый
/// `div` до фокуса не доходит вовсе. Общего правила «у кого есть overflow, тот и крутится» мало:
/// у текстового поля `scrollWidth` больше `clientWidth`, и стрелка вправо крутила бы его вместо перехода.
const SCROLLER = 'data-am-scroll'

/// Запас прокрутки самой плиты в сторону `dir`: ноль — крутить нечего, и стрелка уводит фокус.
function plateRoom(el: HTMLElement, dir: Dir): number {
  const horiz = dir === 'left' || dir === 'right'
  const way = getComputedStyle(el)
  const overflow = horiz ? way.overflowX : way.overflowY
  if (overflow !== 'auto' && overflow !== 'scroll') return 0

  const span = horiz ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight
  if (span <= 1) return 0

  const gone = horiz ? el.scrollLeft : el.scrollTop
  return dir === 'up' || dir === 'left' ? gone : span - gone
}

/// Толкает ближайшего прокручиваемого родителя в сторону `dir`: у конца ряда фокусу некуда идти, а за краем ещё есть
/// плитки. `root` — граница окна: за ней прокрутка экрана, на котором окно открыто, и трогать её нельзя.
/// Предка с `overflow` у страницы нет — её крутит окно, поэтому вторая ветка про окно.
function nudge(from: HTMLElement, dir: Dir, root: HTMLElement | null): boolean {
  const horiz = dir === 'left' || dir === 'right'
  const sign = dir === 'right' || dir === 'down' ? 1 : -1

  for (let node = from.parentElement; node; node = node.parentElement) {
    const overflow = horiz
      ? getComputedStyle(node).overflowX
      : getComputedStyle(node).overflowY
    if (overflow !== 'auto' && overflow !== 'scroll') {
      if (node === root) break
      continue
    }

    const was = horiz ? node.scrollLeft : node.scrollTop
    const step = (horiz ? node.clientWidth : node.clientHeight) * 0.8
    node.scrollTo({
      left: horiz ? was + sign * step : node.scrollLeft,
      top: horiz ? node.scrollTop : was + sign * step,
      behavior: 'smooth',
    })
    return (horiz ? node.scrollLeft : node.scrollTop) !== was
  }

  // Открытое окно: прокрутка кончилась на его границе, и крутить экран за ним не надо.
  if (root !== null) return false

  const was = horiz ? window.scrollX : window.scrollY
  const step = (horiz ? window.innerWidth : window.innerHeight) * 0.8
  window.scrollTo({
    left: horiz ? was + sign * step : window.scrollX,
    top: horiz ? window.scrollY : was + sign * step,
    behavior: 'smooth',
  })
  return (horiz ? window.scrollX : window.scrollY) !== was
}

/// Пододвигает прокрутку контейнера так, чтобы элемент попал в середину (`center`) или стал виден (`nearest`).
/// Контейнер, которому крутить нечего, не трогаем: у мозаики франшизы прокрутка только вертикальная.
function slide(box: HTMLElement, target: HTMLElement, horiz: boolean, center: boolean): void {
  const overflow = horiz ? getComputedStyle(box).overflowX : getComputedStyle(box).overflowY
  // `hidden` обрезает, но не прокручивается: двигать `scrollLeft` у такого контейнера — портить раскладку.
  if (overflow !== 'auto' && overflow !== 'scroll') return

  const more = horiz ? box.scrollWidth - box.clientWidth : box.scrollHeight - box.clientHeight
  if (more <= 1) return

  const from = target.getBoundingClientRect()
  const frame = box.getBoundingClientRect()
  const view = horiz ? box.clientWidth : box.clientHeight
  const size = horiz ? from.width : from.height
  const at = horiz ? from.left - frame.left : from.top - frame.top
  const was = horiz ? box.scrollLeft : box.scrollTop

  let want = was
  // Цель и так вся в кадре — крутить нечего. Без этой проверки центрирование срабатывало на каждом
  // шаге и двигало всю полку целиком: работы в карточке человека поднимались и опускались скопом.
  if (at >= 0 && at + size <= view) return
  if (center) want = was + at - (view - size) / 2
  else if (at < 0) want = was + at
  else if (at + size > view) want = was + at + size - view

  if (Math.abs(want - was) < 1) return

  box.scrollTo({
    left: horiz ? want : box.scrollLeft,
    top: horiz ? box.scrollTop : want,
    behavior: 'smooth',
  })
}

/// Доводит фокус до середины кадра, а у вложенного списка — до середины самой плитки.
/// `root` — граница окна. `scrollIntoView` обходит всех прокручиваемых предков: внутри окна он
/// доходит и до экрана за ним, и тот уезжает под собственным окном. Поэтому окно доводим сами,
/// по предкам до самой его границы, а `scrollIntoView` оставляем странице без окон.
function bringToFocus(target: HTMLElement, alongY: boolean, root: HTMLElement | null): void {
  const hold = target.closest<HTMLElement>('[data-hold]')

  if (hold !== null) slide(hold, target, !alongY, true)

  const aim = hold ?? target

  if (root !== null) {
    for (let node = aim.parentElement; node; node = node.parentElement) {
      if (node instanceof HTMLElement) {
        slide(node, aim, false, alongY)
        slide(node, aim, true, !alongY)
      }
      if (node === root) break
    }
    return
  }

  aim.scrollIntoView({
    block: alongY ? 'center' : 'nearest',
    inline: alongY ? 'nearest' : 'center',
    behavior: 'smooth',
  })
}

/// Отмечает плитку, выбранную пультом. `:focus-visible` на телевизоре снимается с опозданием, и без метки
/// полка остаётся взъерошенной; снятие метки возвращает плитки в исходное состояние правилом в theme.css.
function markTile(el: HTMLElement): void {
  document.querySelectorAll('.am-tile--key').forEach(function (node) {
    node.classList.remove('am-tile--key')
  })
  el.closest('.am-tile')?.classList.add('am-tile--key')
}

/// Открыт ли экран просмотра. У плеера свой обход фокуса по зонам (player-input.ts), и два обхода
/// на одно нажатие дают два шага: здесь уступаем плееру.
function inPlayer(): boolean {
  return document.querySelector('.am-play') !== null
}

/// Метка «поле держим закрытым до Enter»: отличает нашу блокировку от настоящего `readonly`.
const HELD = 'data-am-held'

/// Метка «кнопка подле цели»: маленькая кнопка при крупной соседке — правка в строке списка.
const BESIDE = 'data-am-beside'

function isText(el: unknown): el is HTMLInputElement | HTMLTextAreaElement {
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
}

/// Снимает нашу блокировку с поля: метку ставит подведение стрелкой, и без снятия поле осталось бы закрытым.
function releaseHeld(el: HTMLElement): void {
  if (!el.hasAttribute(HELD)) return
  el.removeAttribute(HELD)
  if (isText(el)) el.readOnly = false
}

/// Держит рельс раскрытым, только когда фокус внутри него: `:focus-within` на телевизоре снимается с опозданием.
/// Читаем не последнюю клавишу, а текущий фокус: он уходит и кликом, и сменой экрана, где события о потере нет.
function syncRail(): void {
  railQueued = false
  const side = document.querySelector('.am-side')
  if (!side) return

  const now = document.activeElement
  const inside = now instanceof HTMLElement && now.closest('.am-side') !== null
  side.classList.toggle('am-side--open', inside)
}

/// Отложенный пересчёт: на `focusout` новый владелец фокуса ещё не известен, а при удалении разметки
/// событие не приходит вовсе — тогда выручает следующий такт.
let railQueued = false

type Seed = 'ok' | 'wait' | 'fail'

/// Сколько ждать постер, прежде чем сеять на первый элемент содержимого: плитки приезжают отдельным запросом.
const SEED_TILE_WAIT = 2500

let seedSince = 0

/// Ставит фокус на первый элемент содержимого: пока фокус ни на ком, стрелки ведёт оболочка и наше нажатие до обработчика не доходит.
/// `wait` (сеять некуда) и `fail` (цель была, но фокус не приняла) различать нужно: пульт подключается до createApp().
function seedDpad(): Seed {
  const area = scope()
  const items = candidates(area)
  if (items.length === 0) return 'wait'

  // На странице годится только содержимое: рельс идёт в разметке первым, и сев на него, посев вернул бы ровно
  // то, от чего мы лечим. Внутри окна наоборот — его содержимое лежит вне `.am-view`.
  const page = items.filter(function (el) {
    return el.closest('.am-view') !== null
  })
  // Постер предпочтительнее: с трёх метров нужен крупный видимый выбор, а не мелкий переключатель над полкой.
  const tile = page.find(function (el) {
    return el.closest('.am-tile') !== null
  }) ?? null

  // Постеры приезжают позже самого экрана: ждём их, но не бесконечно — на экране без плиток ждать нечего.
  if (tile === null && page.length > 0 && area === document) {
    if (seedSince === 0) seedSince = Date.now()
    if (Date.now() - seedSince < SEED_TILE_WAIT) return 'wait'
  }

  const inPage = tile ?? (page.length > 0 ? page[0] ?? null : null)
  const target = inPage ?? (area === document ? null : (items[0] ?? null))
  if (!target) return 'wait'

  if (isText(target) && !target.readOnly) {
    target.setAttribute(HELD, '')
    target.readOnly = true
  }
  target.focus({ preventScroll: true })
  // Проверяем, а не верим: `focus()` элемент вправе не принять (спрятанный родитель, `inert`), и попытку
  // надо повторить на следующем такте.
  const took = document.activeElement === target
  if (!took) return 'fail'
  seedSince = 0
  markTile(target)
  syncRail()
  return 'ok'
}

/// Кто держал фокус до открытия окна. Закрытое окно уносит фокус с собой (`activeElement` становится `body`),
/// и сторож пустого фокуса сеял бы заново, уводя человека к началу экрана. Помним последнего, кто был вне окна.
let beforeDialog: HTMLElement | null = null

function rememberOutside(e: FocusEvent): void {
  const el = e.target
  if (!(el instanceof HTMLElement)) return
  if (el === document.body) return
  if (el.closest('[role="dialog"]') !== null) return
  beforeDialog = el
}

/// Возврат фокуса туда, откуда открыли окно.
function backToBeforeDialog(): boolean {
  const back = beforeDialog
  if (back === null) return false

  if (!back.isConnected || !seen(back)) {
    beforeDialog = null
    return false
  }

  beforeDialog = null
  back.focus({ preventScroll: true })
  if (document.activeElement !== back) return false

  markTile(back)
  syncRail()
  seedDone = true
  return true
}

/// Ставим фокус один раз на «без фокуса» состояние: следующая попытка случится на новом экране.
let seedDone = false

/// Сколько раз фокус не приняли: пустой документ в счёт не идёт, предел — на случай упорно не берущего фокус.
let seedTries = 0

function watchFocus(): void {
  if (inPlayer()) return

  const now = document.activeElement
  if (now instanceof HTMLElement && now !== document.body) {
    seedDone = false
    seedTries = 0
    return
  }

  if (backToBeforeDialog()) return

  if (seedDone || seedTries >= 5) return
  const seed = seedDpad()
  if (seed === 'ok') {
    seedDone = true
    seedTries = 0
    return
  }
  if (seed === 'fail') seedTries++
}

function planRail(): void {
  if (railQueued) return
  railQueued = true
  window.setTimeout(syncRail, 0)
}

/// Подключает вождение фокуса стрелками. Возвращает отключатель.
/// Не вмешивается, когда стрелки нужны элементу: раскрытый список (`.am-pick`) листает свои пункты сам.
export function startDpad(): () => void {
  function onKey(e: KeyboardEvent): void {
    if (inPlayer()) return
    // Enter снимает блокировку поля — только тогда WebView поднимает экранную клавиатуру; на кнопке
    // браузер кликает сам.
    if (e.key === 'Enter') {
      const held = document.activeElement
      if (isText(held) && held.hasAttribute(HELD)) {
        releaseHeld(held)
        // Снимаем фокус и ставим заново: одного `focus()` мало — WebView не пересматривает уже
        // установленное соединение ввода и клавиатуру не показывает. Делаем это внутри нажатия, по жесту.
        held.blur()
        held.focus()
      }
      return
    }

    const dir = DIRS[e.key]
    if (!dir) return
    if (e.metaKey || e.ctrlKey || e.altKey) return

    const now = document.activeElement
    if (now instanceof HTMLElement && now.closest('.am-pick')) return

    // Раскрытый список листает пункты сам (PickBox, onArrow): увести фокус — значит разойтись с подсветкой.
    const roll = now instanceof HTMLElement ? now.closest('.am-roll') : null
    if (roll !== null && roll.querySelector('[aria-expanded="true"]') !== null) return

    // Фокус стоит на плите со своей прокруткой: пока есть запас, стрелка вдоль оси крутит её, а не
    // уводит фокус. Иначе за описание не зацепиться — оно кончается за краем, а листать его нечем.
    if (now instanceof HTMLElement && now.hasAttribute(SCROLLER)) {
      const horiz = dir === 'left' || dir === 'right'
      const back = dir === 'up' || dir === 'left'
      const room = plateRoom(now, dir)
      if (room > 1) {
        e.preventDefault()
        const piece = Math.max(48, Math.round((horiz ? now.clientWidth : now.clientHeight) * 0.75))
        const shift = back ? -Math.min(piece, room) : Math.min(piece, room)
        now.scrollBy({ left: horiz ? shift : 0, top: horiz ? 0 : shift, behavior: 'smooth' })
        return
      }
    }

    const root = topDialog()
    const area: ParentNode = root ?? document
    const items = candidates(area)
    if (items.length === 0) return

    // Фокус ни на ком — экран только что открыли: берём первый элемент содержимого, а не разметки
    // (рельс идёт первым).
    let target: HTMLElement | null
    if (now instanceof HTMLElement && now !== document.body && items.indexOf(now) >= 0) {
      target = nearest(now, dir, items)
    } else {
      const inPage = items.find(function (el) {
        return el.closest('.am-view') !== null
      })
      target = inPage ?? (items.length > 0 ? items[0] ?? null : null)
    }
    // Некуда — толкаем прокрутку сами. `preventDefault` обязателен даже когда прокручивать нечего:
    // отпущенное нажатие достаётся оболочке, а та водит фокус своим порядком и уводит его в рельс.
    if (!target) {
      e.preventDefault()
      if (now instanceof HTMLElement) nudge(now, dir, root)
      return
    }

    // Прокрутка минимальная (`nearest`), а не к центру: центрирование за шаг сдвигает карусель на полэкрана,
    // а ленивые постеры приходят разом. Поле вводим с блокировкой, иначе WebView поднимает клавиатуру сразу.
    if (isText(target) && !target.readOnly) {
      target.setAttribute(HELD, '')
      target.readOnly = true
    }

    e.preventDefault()
    target.focus({ preventScroll: true })

    // Фокус доводится до середины кадра по оси перехода, по другой оси остаётся `nearest`: центрировать обе
    // сразу значит сдвигать кадр каждый шаг.
    const alongY = dir === 'up' || dir === 'down'
    bringToFocus(target, alongY, root)

    markTile(target)
    planRail()
  }

  function onFocusOut(e: FocusEvent): void {
    if (e.target instanceof HTMLElement) releaseHeld(e.target)
    planRail()
  }

  // Касание — тот же смысл, что Enter: снимаем блокировку до того, как браузер поставит фокус.
  function onPointerDown(e: PointerEvent): void {
    if (e.target instanceof HTMLElement) releaseHeld(e.target)
  }

  window.addEventListener('keydown', onKey)

  // Сторож пустого фокуса. По событиям его не дёрнуть: при смене экрана прежний владелец фокуса удаляется
  // молча, и ни `focusout`, ни `focusin` не приходят. Проверка дешёвая — одно чтение `activeElement`.
  const watch = window.setInterval(watchFocus, 400)

  // `click` слушается отдельно: нажатие ОК уводит на другой экран, разметка перерисовывается, и `focusout` не приходит.
  document.addEventListener('focusin', planRail)
  document.addEventListener('focusin', rememberOutside)
  document.addEventListener('focusout', onFocusOut)
  document.addEventListener('click', planRail)
  document.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('hashchange', function () {
    seedDone = false
    seedTries = 0
    seedSince = 0
    beforeDialog = null
    planRail()
  })

  return function () {
    window.clearInterval(watch)
    window.removeEventListener('keydown', onKey)
    document.removeEventListener('focusin', planRail)
    document.removeEventListener('focusin', rememberOutside)
    document.removeEventListener('focusout', onFocusOut)
    document.removeEventListener('click', planRail)
    document.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('hashchange', planRail)
  }
}
