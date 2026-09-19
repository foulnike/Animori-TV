// Точка входа своего клиента (режим сборки app).
// Отличие от скрипта: разметка своя и готова сразу, ждать нечего.

// Диагностика стартует первой: ES-модули выполняют импорты до кода модуля,
// и порядок импортов сверху вниз. Всё, что diagnostic.ts зарегистрирует,
// сработает раньше createApp() и прочих зависимостей. Убрать после отладки.
import './diagnostic'

import { createApp } from 'vue'
import App from './App.vue'
import { startAppearance } from './appearance'
import { seen } from './see-tile'
import { tip } from './tip'
import { startDpad } from './dpad'
import { isWeakPlatform, markPlatform } from './platform'
import { initCollection } from '@/core/collection'
import { initDatasetNames, updateDatasetNamesInBackground } from '@/core/dataset-names'
import { loadSettings } from '@/core/settings'
import { installGlobalErrorHandlers } from '@/utils/logger'

// Стиль всплывающих подписей: плашка живёт в body, и scoped-правила
// компонентов до неё не достают.
import './styles/tip.css'

// Корень обязан существовать: он лежит в нашем же index.html.
// Если его нет, разметка разошлась с кодом — молчать об этом вредно.
const root = document.getElementById('app')
if (!root) throw new Error('AniMori: корень #app не найден в index.html')

// До первой отрисовки: класс должен стоять на <html>, когда браузер
// начнёт считать стили, иначе дорогая раскладка покажется на кадр-другой.
markPlatform()

// Пульт: стрелки ведут фокус сами. На десктопе не нужно — там стрелками
// крутят страницу.
if (isWeakPlatform()) startDpad()

// ДИАГНОСТИКА (убрать после отладки): отметки шагов старта.
console.log('[am-start] main.ts loaded, root present')

/**
 * Снимает заставку из index.html.
 *
 * Она стоит отдельным узлом рядом с корнем, а не внутри него: Vue не стирает
 * содержимое корня при монтировании, он дописывает в него своё, и знак висел
 * бы под окном до конца сеанса.
 *
 * Снимается сразу после монтирования: между ними отрисовки не происходит,
 * и пустого окна человек не увидит. До монтирования снимать нельзя — ровно
 * на это время заставка и нужна.
 */
function hideBoot(): void {
  document.getElementById('boot')?.remove()
}

/**
 * Настройки поднимаются до первой отрисовки: от них зависит отбор 18+
 * и выбор источника названий, а полки главной спрашивают их сразу
 * в onMounted. Показать выдачу по дефолту и тут же перерисовать по
 * настоящему было бы хуже короткой паузы на чтение десятка ключей.
 *
 * Своих ошибок loadSettings не бросает: без хранилища он оставляет дефолты,
 * и окно всё равно открывается.
 *
 * Коллекция поднимается после монтирования, а не до него: чтение снимка
 * задержало бы первую отрисовку, а до первого обращения к списку она
 * всё равно никому не нужна. Звать её всё же надо здесь: без подъёма у снимка
 * нет хозяина, а без хозяина запись на диск молча не случается.
 *
 * Отправщика правок здесь больше нет и быть не должно: список
 * односторонний, правки живут в памяти и снимке, а AniList служит
 * источником переноса.
 *
 * Датасет названий стартует фоном и не блокирует окно: чтение слепка
 * с диска подождёт первый запрос имён (обещание одно на всех), а сверка
 * с последним выпуском живёт своей задачей и пишет только на диск.
 */
async function start(): Promise<void> {
  console.log('[am-start] start() begin')
  try {
    await loadSettings()
    console.log('[am-start] loadSettings done')
  } catch (e) {
    console.error('[am-start] loadSettings FAILED', e)
    throw e
  }

  // Тема ставится до первой отрисовки и сразу после настроек: светлое окно,
  // темнеющее на глазах, читается как поломка, а не как выбор оформления.
  startAppearance()
  console.log('[am-start] appearance done')

  // Перехватчики ставятся до первой отрисовки: сбой монтирования — тоже
  // событие для журнала. Раньше настроек нельзя: тумблер журнала не прочтён.
  installGlobalErrorHandlers()

  // Подпись v-tip регистрируется на всё приложение: её просят метки плиток,
  // кнопки шапок и полки карточек — импорт в каждый файл был бы шумом.
  //
  // Рядом с ней v-seen: отметка о показе плитки, по которой экраны решают,
  // о чём вообще спрашивать источники видео. У неё, как и у подписи, один
  // наблюдатель на всё окно, и место ему тоже здесь.
  try {
    createApp(App)
      .directive('tip', tip)
      .directive('seen', seen)
      .mount(root as HTMLElement)
    console.log('[am-start] mount done')
  } catch (e) {
    console.error('[am-start] mount FAILED', e)
    throw e
  }

  hideBoot()
  console.log('[am-start] boot hidden')

  // Ошибка подъёма окно не роняет — список просто останется пустым до
  // первого действия, а причина уйдёт в журнал.
  try {
    await initCollection()
    console.log('[am-start] initCollection done')
  } catch (e: unknown) {
    console.error('AniMori: список не поднялся из снимка', e)
  }

  void initDatasetNames()
  updateDatasetNamesInBackground()
  console.log('[am-start] start() end')
}

void start()
