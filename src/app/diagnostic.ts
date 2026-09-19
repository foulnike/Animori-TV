// ДИАГНОСТИКА (убрать после отладки, вместе с командой animori_diag в оболочке).
//
// Зачем отдельный файл и почему он импортируется первым в main.ts:
//
// 1. Vite при сборке вырезает инлайн-<script> из index.html — даже с
//    type="module". Поэтому код живёт в модуле и попадает в бандл main.ts.
// 2. ES-модули выполняют импорты до кода модуля, и порядок фиксирован
//    сверху вниз — значит всё, что здесь зарегистрировано, сработает раньше
//    остального приложения.
//
// Канал вывода — своя команда animori_diag: она кладёт строку в журнал
// оболочки. Других каналов на Android TV нет: удалённой отладки WebView нет
// (сокет devtools не открывается), текста окна в accessibility нет
// (uiautomator отдаёт пустое дерево), console в logcat не попадает.
function say(message: string): void {
  try {
    var ti = (window as unknown as { __TAURI_INTERNALS__?: { invoke?: (c: string, a: unknown) => Promise<unknown> } })
      .__TAURI_INTERNALS__
    ti?.invoke?.('animori_diag', { message: message }).catch(() => {})
  } catch {
    /* мост ещё не поднят */
  }
}

;(function () {
  say('diag: модуль загружен, ua=' + (navigator.userAgent || '').slice(0, 90))
  say('diag: href=' + location.href + ' readyState=' + document.readyState)

  window.addEventListener('error', function (e) {
    var stack = e.error instanceof Error ? e.error.stack : ''
    say('diag ERR: ' + e.message + ' @ ' + e.filename + ':' + e.lineno + ':' + e.colno + ' | ' + stack)
  })

  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason
    say('diag REJ: ' + (r instanceof Error ? r.stack || r.message : String(r)))
  })

  var c = window.console
  ;(['log', 'warn', 'error', 'info'] as const).forEach(function (k) {
    var orig = c[k] ? c[k].bind(c) : function () {}
    c[k] = function () {
      var parts: string[] = []
      for (var i = 0; i < arguments.length; i++) {
        var a = arguments[i]
        parts.push(a instanceof Error ? a.stack || a.message : typeof a === 'string' ? a : String(a))
      }
      say('diag ' + k.toUpperCase() + ': ' + parts.join(' ').slice(0, 400))
      ;(orig as (...a: unknown[]) => void).apply(null, arguments as unknown as unknown[])
    }
  })

  document.addEventListener('DOMContentLoaded', function () {
    say('diag: DOMContentLoaded, body=' + (document.body ? document.body.children.length : '-'))
  })

  // Пульт: что пришло и куда фокус попал. Слушатель наш висит первым,
  // поэтому «до» показывает состояние перед переходом, а «после» —
  // через тик, уже после dpad.
  window.addEventListener('keydown', function (e) {
    var before = who()
    setTimeout(function () {
      say('diag KEY ' + e.key + ': ' + before + ' -> ' + who())
    }, 0)
  })

  // Считаем кадры: если разметка в покое ничего не перерисовывает,
  // браузер перестанет звать rAF — и ноль здесь означает «идеально».
  var frames = 0
  function frame() {
    frames++
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)

  setInterval(function () {
    say('diag FPS: ' + frames + ' кадров/с, dpr=' + window.devicePixelRatio)
    frames = 0
  }, 1000)

  // Кто держит фокус и где он на экране: по координатам видно, листается
  // ли полка, или фокус стоит на месте.
  function who(): string {
    var el = document.activeElement
    if (!el || el === document.body) return 'нет'
    var name = el.tagName.toLowerCase()
    var cls = typeof el.className === 'string' ? el.className : ''
    var box = el.getBoundingClientRect()
    // Подпись — чтобы понимать, на какой именно кнопке фокус: классов
    // на экране десятки, и «button.am-btn@295,427» не отвечает, что это.
    var word =
      (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24) ||
      el.getAttribute('placeholder') ||
      el.getAttribute('aria-label') ||
      ''
    return (
      name +
      '.' +
      cls.split(' ')[0] +
      '@' +
      Math.round(box.left) +
      ',' +
      Math.round(box.top) +
      (word === '' ? '' : ' "' + word + '"')
    )
  }

  // Куда уходит фокус: по журналу видно обход, которого не видно на экране.
  // Координаты — чтобы понимать, что именно перехватило нажатие.
  document.addEventListener(
    'focusin',
    function (e) {
      var el = e.target
      if (!(el instanceof HTMLElement)) return
      var box = el.getBoundingClientRect()
      var cls = typeof el.className === 'string' ? el.className.split(' ')[0] : ''
      var word =
        (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24) ||
        el.getAttribute('placeholder') ||
        el.getAttribute('aria-label') ||
        ''
      say(
        'diag MOVE ' +
          el.tagName.toLowerCase() +
          '.' +
          cls +
          '@' +
          Math.round(box.left) +
          ',' +
          Math.round(box.top) +
          ' ' +
          Math.round(box.width) +
          'x' +
          Math.round(box.height) +
          (word === '' ? '' : ' "' + word + '"'),
      )
    },
    true,
  )

  var counter = 0
  function tick() {
    counter++
    var side = document.querySelector<HTMLElement>('.am-side')
    var hey = document.querySelector<HTMLElement>('.am-hey')
    say(
      'diag TICK #' +
        counter +
        ' view=' +
        window.innerWidth +
        'x' +
        window.innerHeight +
        ' dpr=' +
        window.devicePixelRatio +
        ' focus=' +
        who() +
        // Прокрутка страницы: по ней видно, уезжает ли карточка с баннера.
        ' scroll=' +
        Math.round(document.scrollingElement ? document.scrollingElement.scrollTop : 0) +
        // Открытые окна: по ним видно, закрылось ли окно по «назад».
        ' dlg=' +
        document.querySelectorAll('[role="dialog"]').length +
        // Плеер и его панель: по ним видно, во весь ли экран кадр и жив ли
        // обход кнопок пультом.
        ' play=' +
        document.querySelectorAll('.am-play--wide').length +
        '/' +
        document.querySelectorAll('[data-zone] button:not([disabled])').length +
        ' rail="' +
        (side ? side.className : '-') +
        '" hey=' +
        (hey ? (hey.offsetParent === null ? 'скрыт' : 'ВИДЕН') : 'нет') +
        ' tiles=' +
        document.querySelectorAll('.am-tile__hit').length +
        ' held=' +
        document.querySelectorAll('[data-am-held]').length +
        ' out=' +
        // Уводящее наружу: тизер в плитке кадров, хвост ссылок описания,
        // знаки стримингов у музыки. На телевизоре браузера нет, и этих
        // узлов в разметке быть не должно вовсе.
        document.querySelectorAll('.am-shots__reel, .am-about__link, .am-tune__jump')
          .length +
        ' rich=' +
        // Ссылки внутри текста описания: наружу уходят только часть из них,
        // остальные ведут внутрь приложения и остаются ссылками.
        document.querySelectorAll('.am-rich__link').length,
    )
    if (counter < 600) setTimeout(tick, 1000)
  }
  setTimeout(tick, 1000)
})()
