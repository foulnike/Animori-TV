// Управление пультом: фокус ходит по стрелкам сам — в WebView пространственная навигация отключена.
// Ищем фокусируемый элемент в нужную сторону от нынешнего и ближе всех: по геометрии, а не по порядку в разметке.
// Включается только на слабой платформе: на десктопе стрелки крутят страницу, отбирать это незачем.

/// Стороны, куда пульт умеет ходить.
type Dir = 'left' | 'right' | 'up' | 'down'

const DIRS: Record<string, Dir> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
}

/// Всё, что умеет держать фокус. Порядок в разметке нам не важен — важна
/// геометрия, поэтому tabindex не читаем вовсе.
const FOCUSABLE = ['a[href]', 'button', 'input', 'select', 'textarea', '[tabindex]'].join(',')

/**
 * Виден ли элемент настолько, что фокус он примет.
 *
 * `visibility: hidden` фокус принять не даёт, а место на экране занимает:
 * крестик «скрыть» на плитке спрятан ровно так — до наведения или фокуса
 * на самом постере. Не отсечь его — он станет целью перехода, `focus()`
 * молча не сработает, и пульт застрянет: нажатие уходит в никуда, а снаружи
 * это выглядит как «дальше не идёт».
 *
 * Прозрачность (`opacity`) намеренно не проверяем: полупрозрачный элемент
 * фокус принимает, и это нормальный приём разметки.
 */
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

    // Дальше двух экранов не смотрим. На главной фокусируемых под сотню,
    // и мерить геометрию каждого на каждое нажатие для телевизора дорого:
    // это заметно в кадре. Два экрана запаса хватает, чтобы дойти и до
    // следующей полки, и до хвоста карусели.
    if (box.bottom < -h || box.top > h * 2) return
    if (box.right < -w || box.left > w * 2) return

    if (!seen(el)) return
    out.push(el)
  })

  return out
}

/**
 * Ближайший элемент в сторону `dir` от `from`.
 *
 * Два прохода. Сначала требуем перекрытия по поперечной оси: без этого
 * «вправо» с пункта меню уедет на шапку, которая выше и левее. Если таких
 * нет — у края полки, например, — второй проход берёт любой, что лежит
 * в нужную сторону: уехать куда-то лучше, чем стоять.
 */
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

      // Поперечное смещение — зазор между отрезками, а не разница их
      // центров.
      //
      // РАЗНИЦА ЦЕНТРОВ ШТРАФОВАЛА ШИРИНУ. В настройках кнопка «Очистить
      // память» (169 px) лежит слева в своём ряду, а тумблер 18+ под
      // нею — узкий, 54 px, тоже слева. Между ними стоит поле ссылки
      // во всю панель (820 px), и по вертикали оно ближе: 222 против
      // 427. Но центр поля далёк от центра кнопки на 326 (половина
      // ширины панели против половины кнопки), центр тумблера — всего
      // на 42. При штрафе вдвое узкий тумблер выигрывал, и пульт
      // перелетал через всю панель копии: замер с приставки — шаг
      // вниз с «Очистить память» уводил сразу на тумблер.
      //
      // Зазор между отрезками этого не делает: что поле, что тумблер
      // перекрывают кнопку по горизонтали, и зазор у обоих нулевой.
      // Дальше работает одно расстояние по ходу — то есть «кто ближе
      // снизу», ровно то, чего ждёт человек.
      const across = horiz
        ? Math.max(0, Math.max(r.top, f.top) - Math.min(r.bottom, f.bottom))
        : Math.max(0, Math.max(r.left, f.left) - Math.min(r.right, f.right))
      const overlap = horiz
        ? Math.min(r.bottom, f.bottom) - Math.max(r.top, f.top)
        : Math.min(r.right, f.right) - Math.max(r.left, f.left)

      if (strict) {
        if (overlap <= 0) continue
      } else if (across > along) {
        // Запасной проход: кандидат должен лежать скорее в нужную
        // сторону, чем вбок. Без этого с правого края полки фокус
        // улетал в шапку — она действительно правее и ближе по
        // горизонтали, но совершенно в другом ряду.
        continue
      }

      // Рельс — отдельная полоса, и ход в неё ровно один: влево. Обратно —
      // только вправо.
      //
      // Прежде запрет был односторонним: вверх и вниз в рельс не пускали,
      // а вбок — пускали в обе стороны, и выйти из него можно было любым
      // ходом. Оттуда и утечка. Замер с приставки: внизу длинного экрана,
      // где под фокусом уже ничего нет, шаг вниз уходил на «Историю»
      // в меню слева — с «Проверить сейчас» внизу настроек, откуда вниз
      // и правда ничего не стоит.
      //
      // Вверх и вниз внутри рельса при этом работают как обычно: там свои
      // пункты, и ходить по ним надо.
      const inSide = el.closest('.am-side') !== null
      if (fromSide !== inSide && dir !== (fromSide ? 'right' : 'left')) continue

      // Кнопка подле цели (метка `data-am-beside`) — спутник соседней
      // крупной кнопки: правка в строке списка. К ней и ходят вбок,
      // а вверх-вниз водят по самим целям.
      //
      // Без этого правила шаг вниз сходил на неё, а не на следующую строку.
      // У строки с полосой пройденного кнопка правки поднята на четыре
      // пикселя (`.am-row--bar .am-row__edit`), и по метрике она оказывалась
      // ближе следующей строки ровно на эти четыре. Замер с приставки:
      // со строки вниз фокус уходил на правку, и до соседней строки человек
      // добирался вторым нажатием.
      if (!horiz && el.hasAttribute(BESIDE)) continue

      // Поперечное смещение штрафуем вдвое: «чуть дальше, но ровно в ряд»
      // лучше, чем «ближе, но сильно в стороне».
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

/**
 * Область поиска: верхнее из открытых модальных окон, если оно есть.
 *
 * Из открытого окна фокус не должен уходить на то, что лежит за ним, —
 * иначе пульт уводит на страницу под окном, а окно остаётся висеть,
 * и закрыть его уже нечем.
 *
 * `offsetParent` для этой проверки не годится: все наши окна стоят на
 * `position: fixed`, а у такого элемента `offsetParent` всегда null —
 * то есть открытое окно выглядело закрытым, и областью оставался весь
 * документ. Именно поэтому внутри окна человека пультом ходить было
 * нельзя: каждое нажатие уводило фокус на карточку под ним.
 *
 * Видимость проверяем тем же `seen()`, что и годность кандидата. Окон
 * бывает несколько — окно кадра лежит поверх галереи, — поэтому идём
 * с конца: последнее в разметке и есть верхнее.
 */
function scope(): ParentNode {
  const all = document.querySelectorAll<HTMLElement>('[role="dialog"]')
  for (let i = all.length - 1; i >= 0; i--) {
    const node = all[i]
    if (node !== undefined && seen(node)) return node
  }
  return document
}

/**
 * Толкает ближайшего прокручиваемого родителя в сторону `dir`.
 *
 * Зачем: у конца ряда фокусу некуда идти, и нажатие пропадало бы впустую,
 * хотя карусель ещё не доехала — за краем лежат плитки, просто их не
 * видно. Доведя прокрутку, мы открываем их следующему нажатию. Для ленты
 * подбора это ещё и способ допроситься новых страниц: она подгружает
 * хвост по прокрутке.
 *
 * Своего прокручиваемого предка у страницы нет: её крутит окно, а не блок
 * с `overflow`. Поэтому вторая ветка — про окно. Без неё внизу длинного
 * экрана нажатие пропадало впустую: до «О программе» в конце настроек
 * не доехать ничем, потому что фокусу дальше идти некуда, а прокрутка
 * стоит.
 */
function nudge(from: HTMLElement, dir: Dir): boolean {
  const horiz = dir === 'left' || dir === 'right'
  const sign = dir === 'right' || dir === 'down' ? 1 : -1

  for (let node = from.parentElement; node; node = node.parentElement) {
    const overflow = horiz
      ? getComputedStyle(node).overflowX
      : getComputedStyle(node).overflowY
    if (overflow !== 'auto' && overflow !== 'scroll') continue

    const was = horiz ? node.scrollLeft : node.scrollTop
    const step = (horiz ? node.clientWidth : node.clientHeight) * 0.8
    node.scrollTo({
      left: horiz ? was + sign * step : node.scrollLeft,
      top: horiz ? node.scrollTop : was + sign * step,
      behavior: 'smooth',
    })
    return (horiz ? node.scrollLeft : node.scrollTop) !== was
  }

  const was = horiz ? window.scrollX : window.scrollY
  const step = (horiz ? window.innerWidth : window.innerHeight) * 0.8
  window.scrollTo({
    left: horiz ? was + sign * step : window.scrollX,
    top: horiz ? window.scrollY : was + sign * step,
    behavior: 'smooth',
  })
  return (horiz ? window.scrollX : window.scrollY) !== was
}

/**
 * Пододвигает прокрутку одного контейнера так, чтобы элемент попал
 * в его середину (`center`) или просто стал виден (`nearest`).
 *
 * Контейнер, которому крутить нечего, не трогаем вовсе: у мозаики
 * франшизы прокрутка только вертикальная, и ход вбок не должен
 * ничего сдвигать.
 */
function slide(box: HTMLElement, target: HTMLElement, horiz: boolean, center: boolean): void {
  const overflow = horiz ? getComputedStyle(box).overflowX : getComputedStyle(box).overflowY
  // `hidden` обрезает, но не прокручивается: двигать scrollLeft у такого
  // контейнера значит портить раскладку без всякого видимого толка.
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

/**
 * Доводит фокус до середины кадра, а у вложенного списка — до середины самой плитки.
 *
 * Плитка франшизы (`[data-hold]`) листается внутри: обычный scrollIntoView обходит всех
 * прокручиваемых предков и увозит страницу. Список крутим сами, страницу доводим до
 * середины плитки. Всё остальное прокручивает браузер.
 */
function bringToFocus(target: HTMLElement, alongY: boolean): void {
  const hold = target.closest<HTMLElement>('[data-hold]')

  if (hold !== null) slide(hold, target, !alongY, true)

  const aim = hold ?? target
  aim.scrollIntoView({
    block: alongY ? 'center' : 'nearest',
    inline: alongY ? 'nearest' : 'center',
    behavior: 'smooth',
  })
}

/**
 * Отмечает плитку, выбранную пультом, и снимает метку со всех прочих.
 *
 * Без этого поднятый постер не опускался: `:focus-visible` на телевизоре
 * снимается с опозданием, и к концу обхода полка стояла взъерошенной.
 * Метку видит правило в theme.css, которое возвращает все прочие плитки
 * в исходное состояние.
 */
function markTile(el: HTMLElement): void {
  document.querySelectorAll('.am-tile--key').forEach(function (node) {
    node.classList.remove('am-tile--key')
  })
  el.closest('.am-tile')?.classList.add('am-tile--key')
}

/**
 * Открыт ли экран просмотра.
 *
 * У плеера свой обход фокуса по зонам (player-input.ts), и он же разбирает
 * стрелки: вдоль зоны — по кнопкам, поперёк — между зонами. Общий пульт
 * считает цель по геометрии и пошёл бы своим путём; два обхода на одно
 * нажатие дают два шага и спорят друг с другом. Здесь уступаем плееру.
 */
function inPlayer(): boolean {
  return document.querySelector('.am-play') !== null
}

/// Метка «поле держим закрытым до Enter»: отличает нашу блокировку от
/// настоящего `readonly`, который мог поставить сам экран.
const HELD = 'data-am-held'

/// Метка «кнопка подле цели»: маленькая кнопка при крупной соседке —
/// правка в строке списка. Берётся ходом вбок от неё и не мешает ходу
/// вверх-вниз по самим строкам (см. `nearest`).
const BESIDE = 'data-am-beside'

function isText(el: unknown): el is HTMLInputElement | HTMLTextAreaElement {
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
}

/**
 * Снимает нашу блокировку с поля.
 *
 * Без этого поле остаётся只读 навсегда: метку ставит подведение стрелкой,
 * а снимал её только Enter. Ушёл стрелкой дальше — поле закрыто, и
 * набрать в нём уже ничего нельзя, хотя на вид оно как обычное.
 */
function releaseHeld(el: HTMLElement): void {
  if (!el.hasAttribute(HELD)) return
  el.removeAttribute(HELD)
  if (isText(el)) el.readOnly = false
}

/**
 * Держит рельс раскрытым, только когда фокус внутри него.
 *
 * Сам он раскрывался по `:focus-within`, но на телевизоре тот снимается
 * с опозданием, и рельс оставался разложенным поверх содержимого. Теперь
 * состояние ставим мы, а правило в theme.css возвращает его к сложенному
 * виду по отсутствию метки.
 *
 * Читаем не последнюю нажатую клавишу, а то, на ком фокус сейчас.
 * Фокус уходит с рельса множеством путей, помимо стрелок: кликом по
 * пункту меню, сменой экрана (разметка перерисована — прежний элемент
 * удалён, и событие о потере фокуса не приходит вовсе), закрытием
 * окна, щелчком мышью. Меченный по стрелкам рельс все эти пути
 * пропускал и оставался разложенным.
 */
function syncRail(): void {
  railQueued = false
  const side = document.querySelector('.am-side')
  if (!side) return

  const now = document.activeElement
  const inside = now instanceof HTMLElement && now.closest('.am-side') !== null
  side.classList.toggle('am-side--open', inside)
}

/// Отложенный пересчёт: на `focusout` новый владелец фокуса ещё не известен,
/// а при удалении разметки событие не приходит вовсе — тогда выручает
/// следующий за ним такт. Складываем несколько вызовов в один.
let railQueued = false

/// Исход посева фокуса.
type Seed = 'ok' | 'wait' | 'fail'

/// Сколько ждать постер, прежде чем сеять на первый элемент содержимого.
/// Запас на медленную сеть: плитки приезжают отдельным запросом.
const SEED_TILE_WAIT = 2500

/// Когда сторож впервые увидел содержимое: от него считается ожидание.
let seedSince = 0

/**
 * Ставит фокус на первый элемент содержимого: пока фокус ни на ком, стрелки ведёт оболочка своим порядком,
 * и наше нажатие до обработчика не доходит вовсе — первое нажатие надо не допустить, а не перехватить.
 * Исход: ok — фокус встал, wait — сеять некуда (экран не нарисован), fail — цель была, но фокус не приняла.
 * wait и fail различать необходимо: пульт подключается до createApp(), и первые такты приходятся на пустой документ.
 */
function seedDpad(): Seed {
  const area = scope()
  const items = candidates(area)
  if (items.length === 0) return 'wait'

  // На странице годится только содержимое. Рельс идёт в разметке первым,
  // и пока полки не нарисованы, единственные кандидаты — его пункты: сев
  // на них, посев вернул бы ровно то, от чего мы лечим. Ждём содержимое
  // следующим тактом, сколько бы тактов ни понадобилось.
  //
  // Внутри окна наоборот: всё его содержимое лежит вне `.am-view`, поэтому
  // там берём первый по разметке.
  const page = items.filter(function (el) {
    return el.closest('.am-view') !== null
  })
  // Постер предпочтительнее: с трёх метров нужен крупный видимый выбор,
  // а не мелкий переключатель над полкой. Плиток на экране может не быть
  // вовсе (настройки, журнал) — тогда берём первый элемент содержимого.
  const tile = page.find(function (el) {
    return el.closest('.am-tile') !== null
  }) ?? null

  // Постеры приезжают позже самого экрана: первые такты сторожа видят
  // содержимое ещё без них, и посев садился на переключатель над полкой.
  // Ждём постер, но не бесконечно: на экране без плиток ждать нечего.
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
  // Проверяем, а не верим: вызвать `focus()` мало — элемент вправе его
  // не принять (спрятанный родитель, `inert`), и тогда попытку надо
  // повторить на следующем такте, а не считать экран обслуженным.
  const took = document.activeElement === target
  if (!took) return 'fail'
  seedSince = 0
  markTile(target)
  syncRail()
  return 'ok'
}

/// Кто держал фокус до открытия окна поверх экрана.
///
/// Зачем помнить. Закрытое окно уносит фокус с собой: владелец фокуса
/// удаляется из разметки, и `document.activeElement` становится `body`.
/// Сторож пустого фокуса видит это как «экран только что открыли» и сеет
/// заново — на первый элемент содержимого. Человек же никуда не уходил:
/// он закрыл окно и ждёт себя там же, где открывал. Замер с приставки:
/// после закрытия справки копии списка фокус уезжал на плитку календаря
/// на главной, а страница прокручивалась к началу.
///
/// Помним именно последнего, кто держал фокус вне окна: пока окно открыто,
/// фокус ходит внутри него, и запись не портится.
let beforeDialog: HTMLElement | null = null

function rememberOutside(e: FocusEvent): void {
  const el = e.target
  if (!(el instanceof HTMLElement)) return
  if (el === document.body) return
  if (el.closest('[role="dialog"]') !== null) return
  beforeDialog = el
}

/// Возврат фокуса туда, откуда открыли окно. true — вернули и сеять не надо.
function backToBeforeDialog(): boolean {
  const back = beforeDialog
  if (back === null) return false

  // Экран сменился вместе с окном — возвращаться некуда, и помнить больше
  // нечего. Свежая запись появится на первом же фокусе нового экрана.
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

/// Пытались ли уже поставить фокус в нынешнем «без фокуса» состоянии.
/// Ставим один раз: если элемент фокус не принял, долбить его каждые
/// полсекунды незачем — следующая попытка случится на новом экране.
let seedDone = false

/// Сколько раз фокус не приняли. Пустой документ в счёт не идёт (это не
/// неудача, а ранний такт), поэтому предел — на случай элемента, который
/// упорно не берёт фокус: долбить его каждые полсекунды незачем.
let seedTries = 0

function watchFocus(): void {
  // Плеер ведёт фокус сам: сеять его в содержимое под кадром незачем.
  if (inPlayer()) return

  const now = document.activeElement
  if (now instanceof HTMLElement && now !== document.body) {
    seedDone = false
    seedTries = 0
    return
  }

  // Фокус ни на ком. Сперва пробуем вернуть его туда, откуда открыли окно:
  // сеять заново — значит увести человека к началу экрана.
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

/**
 * Подключает вождение фокуса стрелками. Возвращает отключатель.
 *
 * Не вмешивается, когда стрелки нужны самому элементу: раскрытый список
 * (`.am-pick`) листает свои пункты стрелками вверх-вниз, и отбирать у
 * него это нельзя. Модалки со своим перехватом клавиш (Esc) не мешают:
 * Esc мы не трогаем вовсе.
 */
export function startDpad(): () => void {
  function onKey(e: KeyboardEvent): void {
    // Экран просмотра ведёт фокус сам и разбирает стрелки по-своему:
    // два обхода на одно нажатие только мешают друг другу.
    if (inPlayer()) return
    // Enter полю ввода нужен отдельно: он снимает нашу блокировку, и
    // только тогда WebView поднимает экранную клавиатуру. На кнопке
    // браузер сам делает клик — туда не вмешиваемся вовсе.
    if (e.key === 'Enter') {
      const held = document.activeElement
      if (isText(held) && held.hasAttribute(HELD)) {
        releaseHeld(held)
        // Фокус снимаем и ставим заново: поле и так было в фокусе, и одного
        // `focus()` мало — WebView не пересматривает уже установленное
        // соединение ввода и клавиатуру не показывает. Второе подведение
        // происходит внутри нажатия, то есть по жесту пользователя.
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

    // Раскрытый список выбора листает свои пункты сам (PickBox, onArrow):
    // подсветку ведёт он, и фокус ему не нужен. Уведём — человек окажется
    // на пунктах вместо того, чтобы закрыть список Enter, а подсветка
    // останется на прежней строке и разойдётся с фокусом.
    const roll = now instanceof HTMLElement ? now.closest('.am-roll') : null
    if (roll !== null && roll.querySelector('[aria-expanded="true"]') !== null) return

    const area = scope()
    const items = candidates(area)
    if (items.length === 0) return

    // Фокус ни на ком — экран только что открыли. Берём первый элемент
    // не разметки, а самого содержимого: рельс идёт в разметке первым,
    // и иначе каждое открытие начиналось с меню слева, а не с того,
    // ради чего экран открывали.
    let target: HTMLElement | null
    if (now instanceof HTMLElement && now !== document.body && items.indexOf(now) >= 0) {
      target = nearest(now, dir, items)
    } else {
      const inPage = items.find(function (el) {
        return el.closest('.am-view') !== null
      })
      target = inPage ?? (items.length > 0 ? items[0] ?? null : null)
    }
    // Некуда — толкаем прокрутку сами, а не спорим с ней. Глухое нажатие
    // хуже любого другого исхода: человек не понимает, пульт сломался
    // или ряд кончился.
    //
    // `preventDefault` здесь обязателен даже тогда, когда прокручивать
    // нечего. Отпущенное нажатие достаётся оболочке, а та водит фокус
    // своим порядком — и он уходил в рельс. Замер с приставки: внизу
    // настроек шаг вниз с «Проверить сейчас» переносил фокус на «Историю»
    // в меню слева, хотя вниз от неё нет ничего.
    if (!target) {
      e.preventDefault()
      if (now instanceof HTMLElement) nudge(now, dir)
      return
    }

    // Браузер прокрутил бы сам и сделал бы это на свой вкус: сперва
    // фокус без прокрутки, потом своя.
    //
    // Прокрутка минимальная (`nearest`), а не к центру. Центрирование
    // выглядит наряднее, но за один шаг сдвигает карусель на полэкрана —
    // а постеры грузятся лениво, и все пять новых приходят разом: кадр
    // выходит за сотню миллисекунд. Минимальная доводит до видимости
    // ровно одну плитку.
    // Поле ввода фокусируем с блокировкой. Без неё WebView поднимает
    // экранную клавиатуру уже на подведении стрелкой: она занимает
    // пол-экрана и закрывает ровно то, к чему человек шёл. Клавиатуру
    // открывает Enter — см. выше.
    if (isText(target) && !target.readOnly) {
      target.setAttribute(HELD, '')
      target.readOnly = true
    }

    e.preventDefault()
    target.focus({ preventScroll: true })

    // Прокрутка доводит фокус до середины кадра по той оси, по которой
    // шёл переход: вверх-вниз — по вертикали, влево-вправо — по
    // горизонтали. Прежде было `nearest` в обе стороны, и фокус всё
    // время прилипал к краю: с трёх метров не видно, что лежит дальше
    // по ходу, и следующий шаг приходилось угадывать. По другой оси
    // остаётся `nearest`: центрировать обе сразу значит каждый шаг
    // сдвигать кадр и вбок, и вниз.
    const alongY = dir === 'up' || dir === 'down'
    bringToFocus(target, alongY)

    markTile(target)
    planRail()
  }

  // Фокус ушёл с поля — блокировку снимаем: иначе поле остаётся закрытым
  // навсегда, до перезапуска.
  function onFocusOut(e: FocusEvent): void {
    if (e.target instanceof HTMLElement) releaseHeld(e.target)
    planRail()
  }

  // Касание — тот же смысл, что Enter: человек дошёл до поля сам, клавиатура
  // здесь уместна. Снимаем блокировку до того, как браузер поставит фокус.
  function onPointerDown(e: PointerEvent): void {
    if (e.target instanceof HTMLElement) releaseHeld(e.target)
  }

  window.addEventListener('keydown', onKey)

  // Сторож пустого фокуса. Дёргать его по событиям нельзя: при смене
  // экрана разметка перерисовывается, прежний владелец фокуса удаляется,
  // и ни `focusout`, ни `focusin` не приходят — состояние «фокус ни на ком»
  // наступает молча. Проверка дешёвая: пока фокус есть, это одно чтение
  // `activeElement`; полный перебор кандидатов случается только на
  // открытии экрана, раз на экран.
  const watch = window.setInterval(watchFocus, 400)

  // Рельс слушает фокус целиком, а не только стрелки. `click` добавлен
  // отдельно: нажатие ОК на пункте меню уводит на другой экран, разметка
  // перерисовывается, прежний элемент удаляется, и `focusout` не приходит.
  document.addEventListener('focusin', planRail)
  document.addEventListener('focusin', rememberOutside)
  document.addEventListener('focusout', onFocusOut)
  document.addEventListener('click', planRail)
  document.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('hashchange', function () {
    seedDone = false
    seedTries = 0
    seedSince = 0
    // Экран сменился — прежний владелец фокуса к новому экрану отношения
    // не имеет, и возвращать к нему нечего.
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
