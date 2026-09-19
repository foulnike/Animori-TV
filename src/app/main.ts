// Точка входа своего клиента (режим сборки app): разметка своя и готова сразу.

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
 * Настройки поднимаются до первой отрисовки: от них зависит отбор 18+ и источник названий.
 * loadSettings своих ошибок не бросает: без хранилища остаются дефолты.
 * Коллекция — после монтирования (чтение снимка задержало бы первую отрисовку);
 * датасет стартует фоном и окно не блокирует.
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
