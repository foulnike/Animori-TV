<script setup lang="ts">
// Настройки: перенос списка, свои данные, копия по ссылке, внешность и справка.
// На экране только то, что человеку решать: как всё устроено внутри —
// дело документации, а не карточки настроек.
//
// ЧЕГО ЗДЕСЬ НЕТ И ПОЧЕМУ
// Экран один на две сборки, но телевизор не умеет трёх вещей, без которых
// половина настроек превращается в мёртвые кнопки:
//
//  · *Вход в AniList* открывает окно браузера и ждёт, что человек разрешит
//    доступ и вернётся. Браузера на телевизоре нет — окно не откроется,
//    а ждать будет нечего. Половина AniList снята целиком: без входа
//    «Перенести список» — кнопка, которая молча не делает ничего.
//    Список на телевизор приходит копией по ссылке (см. CloudBox).
//  · *Выгрузка в XML* пишет файл в папку, которую выбирают проводником.
//    Проводника нет, и «Загрузки окна» на телевизоре тоже нет.
//  · *Плашка с просьбой о звезде* ведёт на GitHub. Ссылку наружу открывать
//    нечем — см. canOpenOutside в platform.ts.
//
// Шикимори осталась: вход ей не нужен, открытый профиль сайт отдаёт любому
// по нику, а ник — это полтора десятка знаков, которые пультом набрать
// всё-таки можно.
//
// РАСКЛАДКА
// Панели собраны в колонки-обёртки. Раньше они лежали прямо в сетке
// и разводились по местам через grid-template-areas — и сетка ставила их
// в общие строки: высокая панель облака держала строку, а под «Оформлением»
// и «Импортом» до самого низа зияла пустота. Колонка-обёртка такого не умеет:
// каждая набирает свои панели встык, и высота соседней ей безразлична.
//
// Порядок и ширина колонок под каждый размер окна живут в settings-screen.css,
// поэтому разметка здесь одна на все случаи: на фуллскрине колонок три,
// на половине экрана две, в узком окне одна. На телевизоре окно 960, и там
// колонка ровно одна — пульту ходить по одной вертикали понятнее, чем
// угадывать, где продолжается ряд.
//
// Справа налево на фуллскрине: копия списка, импорт со своими данными,
// оформление со справкой.
//
// Прокси — единственная панель, которой столбец выбирает ширина окна: под
// «Данными» на фуллскрине, под копией списка на половине экрана. В разметке
// она поэтому стоит последней, а не рядом с «Данными»: место ей назначает
// сетка. Узел свой — components/ProxyBox.vue.
//
// Копия списка живёт своим узлом — components/CloudBox.vue. На телевизоре
// от неё остался один путь: забрать копию по ссылке. Наружу узлу нужны
// только число записей и метка устройства, а обратно — весть, что
// список сменился.
//
// Знак сервиса рисует components/BrandMark.vue: вектор он берёт из файлов
// в src/app/brand, взятых у самих сервисов. Прежде он был нарисован
// вручную прямо здесь, и кривизна букв была видна невооружённым глазом.
//
// ВОПРОСЫ КОРОТКИЕ, ОТВЕТ ЖИВЁТ В КНОПКАХ
// Раньше подтверждения объясняли разницу способов абзацем на три строки.
// Абзац этот никто не читал: под ним стоят «Добавить недостающее»
// и «Заменить целиком», и подписи говорят то же самое точнее и короче.
// Осталось одно число — сколько записей под ударом, — и оно единственное,
// чего из подписей не узнать.
//
// Оформление живёт в settings-screen.css — так же, как у карточки и плеера.
import { onMounted, ref } from 'vue'

import { Bridge } from '@/bridge'
import {
  entryCount,
  forgetCollection,
  initCollection,
  pullFromShikimori,
  type PullMode,
  type ShikiPullResult,
} from '@/core/collection'
import { datasetStatus, initDatasetNames } from '@/core/dataset-names'
import { clearCache, getDbStats } from '@/core/db'
import { adultByBirth } from '@/core/adult'
import { forgetRecs } from '@/core/recs'
import { saveSetting, settings } from '@/core/settings'

import { APPEARANCES, appearance, setAppearance } from '../appearance'
import BrandMark from '../components/BrandMark.vue'
import CloudBox from '../components/CloudBox.vue'
import DatePick from '../components/DatePick.vue'
import ProxyBox from '../components/ProxyBox.vue'
import { canOpenOutside, isWeakPlatform } from '../platform'

const version = __ANIMORI_VERSION__

/**
 * Слабая ли площадка — то есть телевизор. По ней строка-тумблер берёт
 * фокус сама, а галочка внутри уходит из обхода: см. разметку тумблера.
 */
const lite = isWeakPlatform()

/// Человеку важна его система, а не имя нашей сборки: слово «app» ему
/// не говорит ничего, а «Windows» отвечает на вопрос сразу.
function systemName(): string {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
  if (/Android/i.test(ua)) return 'Android'
  if (/Windows/i.test(ua)) return 'Windows'
  if (/Mac OS X/i.test(ua)) return 'macOS'
  if (/Linux/i.test(ua)) return 'Linux'
  return 'неизвестна'
}

const system = systemName()

/**
 * Адрес датасета названий. Ссылка осталась и после ухода на CC0-1.0, но
 * обязанностью быть перестала: атрибуции эта лицензия не требует вовсе,
 * а назвать единственный источник кириллицы — вежливость. Разбор —
 * в docs/DATA-PIPELINE.md, раздел «Права: CC0».
 */
const DATASET_URL = 'https://github.com/foulnike/animori-data'

/// Внешние ссылки из окна открываются только оболочкой: target="_blank"
/// в WebView2 отбрасывается молча, без окна и без ошибки.
function onDatasetLink(): void {
  void Bridge.shell.openExternal(DATASET_URL)
}

/**
 * Есть ли куда вести ссылкам наружу.
 *
 * На телевизоре браузера нет, и обе кнопки — репозиторий и датасет —
 * уводили бы в никуда. Плашка репозитория снимается целиком, а имя
 * датасета остаётся простым текстом: в строке про лицензию оно нужно
 * как название, а не как переход.
 */
const outside = canOpenOutside()

// Ошибки показываются рядом с кнопкой, а не глотаются: молчаливый catch
// здесь означал бы кнопку, которая не делает ничего и не говорит почему.
const error = ref('')
const busy = ref(false)

// Сброс и удаление идут молча, и без явного ответа человек не поймёт,
// случилось ли что-нибудь вообще.
const note = ref('')
const cleared = ref(false)

/**
 * Спрошено ли подтверждение удаления списка. Спрашивается всегда:
 * местные записи вернуть потом неоткуда, их нет ни на каком сервере.
 */
const askingDrop = ref(false)

/**
 * Ник на Шикимори. Списывается с памяти настроек один раз: общий объект
 * настроек не реактивен, и v-model по его полю не показал бы набранное.
 */
const shikiNick = ref(settings.shikiNick)

/** Спрошено ли подтверждение переноса с Шикимори. Спрашивается по тем же причинам. */
const askingShiki = ref(false)

/**
 * Занятость и ответы Шикимори держатся отдельно от общих busy/error/note.
 * Перенос списка идёт минутами, и общая занятость гасила бы на это время
 * кнопки своих данных, к делу непричастные. Общая строка ответа
 * к тому же встала бы в панели данных — далеко от кнопки, которую нажали.
 */
const shikiBusy = ref(false)
const shikiNote = ref('')
const shikiError = ref('')

const listCount = ref(0)
const usedSize = ref('')

/** Состояние датасета названий строкой: журнала нет, видно хотя бы здесь. */
const datasetText = ref('')

/**
 * Датасет старше STALE_DAYS. Отдельный признак, а не слово внутри строки:
 * число дней человек прочитает и не заметит, а подсветку — заметит.
 */
const datasetStale = ref(false)

/**
 * Порог, после которого возраст датасета подсвечивается. Тридцать дней —
 * это три пропущенные недельные сборки: одна могла упасть случайно,
 * три подряд означают, что расписание уснуло и его надо будить руками.
 *
 * Сторож в репозитории программы кричит раньше, на десятом дне, но письмо
 * можно и пропустить, а этот экран человек открывает сам.
 */
const STALE_DAYS = 30

/**
 * Показ взрослого (пункт 3.8). Значение списывается с памяти настроек один раз:
 * общий объект настроек не реактивен, и v-model по его полю не дал бы ответа на клик.
 */
/**
 * Показ взрослого (пункт 3.8). Значение списывается с памяти настроек один раз:
 * общий объект настроек не реактивен, и v-model по его полю не дал бы ответа на клик.
 */
const adult = ref(settings.showAdult)

/**
 * Открыт ли вопрос о возрасте. Взрослое включается не нажатием, а ответом
 * на этот вопрос: до него тумблер стоит выключенным.
 */
const askingAge = ref(false)

/** Дата рождения из календарика. Живёт только до ответа и никуда не пишется. */
const birth = ref('')

/** Слова отказа. Пустая строка — отказа нет. */
const ageError = ref('')

function describe(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

async function guard(action: () => Promise<void>): Promise<void> {
  busy.value = true
  error.value = ''
  try {
    await action()
  } catch (e) {
    error.value = describe(e)
  } finally {
    busy.value = false
  }
}

/// Числа переспрашиваются после каждой кнопки: показанное должно совпадать
/// с тем, что лежит внутри.
///
/// Подъём обязателен: настройки открывают раньше списков, и без него
/// сводка показывала ноль при живом списке на диске. Сам подъём
/// идемпотентен и в сеть не ходит.
async function readState(): Promise<void> {
  await initCollection()
  listCount.value = entryCount()

  const got = await getDbStats()
  usedSize.value = 'error' in got ? '' : got.estimatedSize

  // Датасет поднимается тем же общим обещанием, что и на старте:
  // второй цены чтения здесь нет.
  await initDatasetNames()
  const ds = datasetStatus()
  if (ds.loaded && ds.builtAt !== null) {
    const date = new Date(ds.builtAt).toLocaleDateString('ru-RU')
    const count = ds.names.toLocaleString('ru-RU')
    const days = daysSince(ds.builtAt)

    // Возраст рядом с датой: дата отвечает «когда собран», а возраст —
    // «пора ли дёргать репозиторий», и здесь важнее второй вопрос.
    const age = days === null ? '' : ` · ${ageText(days)}`
    datasetText.value = `${date} · ${count} записей${age}`
    datasetStale.value = days !== null && days > STALE_DAYS
  } else {
    datasetText.value = 'не загружен'
    datasetStale.value = false
  }
}

/// Копия из облака легла поверх списка: числа в панели данных пора
/// переспросить. Своё состояние панель копии ведёт сама.
function onCloudChanged(): void {
  void readState()
}

/**
 * Ник запоминается сразу по уходу из поля, а не только после переноса:
 * набирать его заново на телевизоре пультом — то ещё удовольствие.
 */
function onShikiNick(): void {
  const clean = shikiNick.value.trim()
  shikiNick.value = clean
  void saveSetting('shikiNick', 'am_shiki_nick', clean)
}

/** Нажатие на перенос с Шикимори: сначала вопрос, действие потом. */
function onShikiAsk(): void {
  shikiNote.value = ''
  shikiError.value = ''
  askingShiki.value = true
}

function onShikiCancel(): void {
  askingShiki.value = false
}

/**
 * Потери словами. Тайтлы, которых нет у AniList, в список не попадают вовсе,
 * и молчать об этом нельзя: человек считает записи глазами и решит, что
 * программа половину списка съела.
 */
function lostText(done: ShikiPullResult): string {
  if (done.lost === 0) return ''
  if (done.lostTitles.length === 0) return ` Без пары на AniList: ${done.lost}.`

  const more = done.lost > done.lostTitles.length ? ' и другие' : ''
  return ` Без пары на AniList ${done.lost}: ${done.lostTitles.join(', ')}${more}.`
}

/**
 * Даты просмотра словами. Ноль здесь не поломка, а «просмотров не было»:
 * у запланированного тайтла дат и не бывает, и говорить об этом надо так,
 * чтобы человек не пошёл искать ошибку.
 */
function datesText(done: ShikiPullResult): string {
  if (done.dated === 0) return ' Дат просмотра в журнале Шикимори не нашлось.'
  return ` Даты просмотра перенесены в ${done.dated} записей.`
}

/**
 * Перенос списка с Шикимори по нику. Способы те же два, и вопрос тот же:
 * замена вычищает всё, включая перенесённое с AniList и добавленное руками.
 */
function onShikiPull(mode: PullMode): void {
  askingShiki.value = false

  void (async () => {
    shikiBusy.value = true
    shikiError.value = ''
    shikiNote.value = ''

    try {
      // Ник сохраняется до переноса, а не после: перенос долгий, и уйти
      // с экрана посреди него человек вправе.
      onShikiNick()

      const done = await pullFromShikimori(shikiNick.value, mode)
      await readState()

      shikiNote.value =
        done.mode === 'replace'
          ? `Список замещён списком ${done.nick} с Шикимори: записей ${done.total}.` +
            lostText(done) +
            datesText(done)
          : `Списки слиты: всего ${done.total}, новых ${done.added}, ` +
            `обновлено ${done.updated}, своих правок сохранено ${done.kept}, ` +
            `только здесь ${done.onlyHere}.` +
            lostText(done) +
            datesText(done)
    } catch (e) {
      shikiError.value = describe(e)
    } finally {
      shikiBusy.value = false
    }
  })()
}

/** Нажатие на удаление списка: тоже только вопрос, без действия. */
function onAskDrop(): void {
  note.value = ''
  error.value = ''
  askingDrop.value = true
}

function onCancelDrop(): void {
  askingDrop.value = false
}

/**
 * Удаление своего списка по прямой просьбе. Счёт при этом не трогается:
 * список можно стереть и перенести заново, не входя второй раз.
 *
 * На AniList это не отражается никак: удаляем только то, что лежит у нас.
 */
function onDropList(): void {
  askingDrop.value = false

  void guard(async () => {
    note.value = ''
    await forgetCollection()
    await readState()
    note.value = 'Список удалён. На AniList ваши записи остались нетронутыми.'
  })
}

/**
 * Переключение показа взрослого. Отбор живёт в core/adult.ts и читает ключ
 * в момент вопроса, поэтому перезапуска не нужно: следующий поиск уже другой.
 * Одно исключение — полки витрины: их состав собран заранее и живёт весь
 * сеанс, поэтому тумблер выбрасывает его вызовом `forgetRecs`. Без этого
 * переключатель работал бы в одну сторону: отсеянное при выключенном показе
 * не вернулось бы и после включения.
 *
 * Заметки об исходе нет: сам тумблер и есть ответ, а прежняя строка писалась
 * в панель другой колонки и читалась там как чужая.
 *
 * ВКЛЮЧЕНИЕ СПРАШИВАЕТ ДАТУ РОЖДЕНИЯ
 *
 * Проверка формальная: она никого не опознаёт и ничего не хранит. Дата
 * не уходит ни в настройки, ни на склад — спрашивается заново каждый раз.
 * Запоминать её ради одного нажатия было бы плохой сделкой, а «помнить,
 * что уже спрашивали» превратило бы проверку в украшение.
 *
 * Тумблер встаёт в «включено» только после ответа. Нажатие его не включает:
 * до ответа он выключен, и это не придирка — иначе тумблер показывал бы
 * включённое там, где ключ ещё не записан.
 */
function onAdult(): void {
  if (!adult.value) {
    void saveSetting('showAdult', 'set_adult', false)
    forgetRecs()
    closeAge()
    return
  }

  adult.value = false
  birth.value = ''
  ageError.value = ''
  askingAge.value = true
}

/**
 * Enter на строке-тумблере.
 *
 * Галочка внутри строки переключается с клавиатуры сама, а метка вокруг
 * неё — нет: `<label>` щелчок мышью превращает в нажатие по полю, но
 * Enter и пробел на себе не разбирает. На телевизоре фокус стоит именно
 * на строке (см. разметку), поэтому переключаем значение сами и зовём
 * тот же обработчик, что и по клику.
 */
function onAdultKey(): void {
  adult.value = !adult.value
  onAdult()
}

/** Ответ календарика. Пустая дата — «стёрли», и это не ответ. */
function onBirth(value: string): void {
  birth.value = value
  if (value === '') return

  if (!adultByBirth(value)) {
    ageError.value = 'В доступе отказано'
    return
  }

  closeAge()
  adult.value = true
  void saveSetting('showAdult', 'set_adult', true)
  forgetRecs()
}

/** Отказ от вопроса: тумблер остаётся выключенным, и это его настоящее состояние. */
function closeAge(): void {
  askingAge.value = false
  birth.value = ''
  ageError.value = ''
}

// Память сбрасывается только руками. Перезагрузка не делается сама:
// человек может быть в середине правок.
function onClear(): void {
  void guard(async () => {
    note.value = ''
    await clearCache()
    cleared.value = true
    await readState()
    note.value = 'Память очищена. Названия и описания загрузятся заново.'
  })
}

function onReload(): void {
  void Bridge.shell.reload()
}

/// Возраст сборки в днях. null — когда дата не читается: «NaN дней назад»
/// хуже, чем отсутствие возраста вовсе.
function daysSince(iso: string): number | null {
  const ms = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(ms)) return null
  return Math.floor(ms / 86400000)
}

/// Возраст словами: «собран сегодня», «1 день назад», «6 дней назад».
/// Развёрнуто, а не вложенными тернарниками: падежи русских числительных
/// в одну строку не читаются.
function ageText(days: number): string {
  if (days <= 0) return 'собран сегодня'

  const tail = days % 100
  const last = days % 10
  let word = 'дней'
  if (tail < 11 || tail > 19) {
    if (last === 1) word = 'день'
    else if (last >= 2 && last <= 4) word = 'дня'
  }

  return `${days} ${word} назад`
}

onMounted(() => {
  void readState()
})
</script>

<template>
  <section class="am-page">
    <!-- Три колонки-обёртки: каждая набирает свои панели встык, и высота
         соседней ей безразлична. Порядок и ширина колонок под каждый размер
         окна живут в settings-screen.css. -->
    <div class="am-set">
      <div class="am-set__col am-set__col--main">
        <!-- Импорт списка. Из двух источников осталась Шикимори: AniList
             требует входа через окно браузера, а браузера на телевизоре
             нет (подробно — в шапке файла).

             Знак берёт components/BrandMark.vue из файла
             src/app/brand/shikimori.svg: фирменный вектор, а не наш рисунок.
             Вход не нужен: открытый профиль сайт отдаёт любому по нику. -->
        <div class="am-panel am-box">
          <h3 class="am-h3">Импорт списка</h3>

          <div class="am-serv">
            <div class="am-serv__head">
              <BrandMark class="am-serv__logo" name="shikimori" />

              <span class="am-serv__text">
                <span class="am-serv__name">Шикимори</span>
                <span class="am-serv__note">Профиль на Шикимори должен быть открытым.</span>
              </span>

              <span class="am-flag">
                <span class="am-flag__dot" aria-hidden="true" />
                вход не нужен
              </span>
            </div>

            <div class="am-row">
              <label class="am-field">
                <input
                  v-model="shikiNick"
                  class="am-input"
                  type="text"
                  placeholder="Ник на Шикимори"
                  :disabled="shikiBusy"
                  @change="onShikiNick"
                />
              </label>
              <button
                v-tip="'Забрать список с Шикимори: слиянием или с заменой'"
                class="am-btn"
                type="button"
                :disabled="shikiBusy || !shikiNick.trim()"
                @click="onShikiAsk"
              >
                {{ shikiBusy ? 'Переносим…' : 'Перенести список' }}
              </button>
            </div>

            <!-- Вопрос перед переносом: замена вычищает список целиком,
                 включая набранное руками, — такое не делают одним
                 промахом пульта. -->
            <div v-if="askingShiki" class="am-ask">
              <p class="am-ask__text">Записей: {{ listCount }}.</p>

              <div class="am-row">
                <button
                  class="am-btn"
                  type="button"
                  :disabled="shikiBusy"
                  @click="onShikiPull('merge')"
                >
                  Добавить недостающее
                </button>
                <button
                  class="am-btn am-btn--ghost"
                  type="button"
                  :disabled="shikiBusy"
                  @click="onShikiPull('replace')"
                >
                  Заменить целиком
                </button>
                <button class="am-btn am-btn--ghost" type="button" @click="onShikiCancel">
                  Отмена
                </button>
              </div>
            </div>

            <p v-if="shikiNote" class="am-note">{{ shikiNote }}</p>
            <p v-if="shikiError" class="am-error">{{ shikiError }}</p>
          </div>
        </div>

        <!-- Данные: что лежит на этом диске и что с этим можно сделать. -->
        <div class="am-panel am-box">
          <h3 class="am-h3">Данные</h3>

          <ul class="am-facts">
            <li class="am-fact">
              <span class="am-fact__name">Записей в списке</span>
              <span class="am-fact__value">{{ listCount }}</span>
            </li>
            <li v-if="usedSize" class="am-fact">
              <span class="am-fact__name">Занято на диске</span>
              <span class="am-fact__value">{{ usedSize }}</span>
            </li>
          </ul>

          <!-- Необратимое одной строкой: сброс памяти и удаление списка стоят
               рядом, потому что оба про то, что лежит на этом диске. -->
          <div class="am-row">
            <button
              v-tip="'Убрать сохранённые названия, описания и обложки'"
              class="am-btn am-btn--ghost"
              type="button"
              :disabled="busy"
              @click="onClear"
            >
              Очистить память
            </button>

            <button
              v-if="listCount > 0"
              v-tip="'Удалить свой список с этого устройства'"
              class="am-btn am-btn--ghost"
              type="button"
              :disabled="busy"
              @click="onAskDrop"
            >
              Удалить мой список
            </button>

            <button v-if="cleared" class="am-btn am-btn--ghost" type="button" @click="onReload">
              Перезагрузить
            </button>
          </div>

          <!-- Удаление списка необратимо для местных записей: спрашиваем всегда.
               Вопрос коротким: подпись кнопки под ним и есть весь ответ. -->
          <div v-if="askingDrop" class="am-ask">
            <p class="am-ask__text">Удалить список с этого устройства?</p>

            <div class="am-row">
              <button class="am-btn" type="button" :disabled="busy" @click="onDropList">
                Удалить список
              </button>
              <button class="am-btn am-btn--ghost" type="button" @click="onCancelDrop">
                Отмена
              </button>
            </div>
          </div>

          <p v-if="note" class="am-note">{{ note }}</p>
          <p v-if="error" class="am-error">{{ error }}</p>
        </div>
      </div>

      <!-- Копия списка своим узлом: на телевизоре от неё остался один
           путь — забрать копию по ссылке (components/CloudBox.vue). Ему
           нужны только число записей для вопросов и метка устройства для
           файла копии, а обратно приходит весть, что список сменился.

           Своя колонка: панель самая высокая на экране, и в общей строке
           с соседями она держала бы под ними пустоту. О раскладке сам узел
           по-прежнему ничего не знает. -->
      <div class="am-set__col am-set__col--cloud">
        <CloudBox :list="listCount" @changed="onCloudChanged" />
      </div>

      <!-- Оформление: то, что смотрят, а не то, чем правят. -->
      <div class="am-set__col am-set__col--look">
        <div class="am-panel am-box">
          <h3 class="am-h3">Оформление</h3>

          <div class="am-skins">
            <button
              v-for="item in APPEARANCES"
              :key="item.name"
              v-tip="item.hint"
              class="am-skins__btn"
              :class="{ 'am-skins__btn--on': item.name === appearance }"
              type="button"
              @click="setAppearance(item.name)"
            >
              <span class="am-skins__mark" aria-hidden="true">{{ item.mark }}</span>
              <span class="am-skins__name">{{ item.title }}</span>
            </button>
          </div>

          <!-- Строка-тумблер на телевизоре сама берёт фокус, а галочка
               внутри из обхода убирается.

               ПОЧЕМУ ТАК. Обход пульта ищет соседа по геометрии, и в ряду
               трёх тем под карточкой нет ничего, что перекрывалось бы
               с ней по горизонтали: тумблер стоит левее и уже, а ниже
               лежат широкие поля прокси. Замер с приставки: шаг вниз
               с «Светлая» уходил сразу в панель прокси, минуя тумблер.
               Строка во всю панель перекрывается со всем, что под ней,
               и «вниз» идёт по порядку. -->
          <label
            class="am-switch"
            :tabindex="lite ? 0 : -1"
            role="switch"
            :aria-checked="adult"
            @keydown.enter.prevent="onAdultKey"
            @keydown.space.prevent="onAdultKey"
          >
            <input
              v-model="adult"
              type="checkbox"
              class="am-switch__box"
              :tabindex="lite ? -1 : 0"
              @change="onAdult"
            />
            <span class="am-switch__name">Показывать контент для взрослых (18+)</span>
          </label>

          <!-- Вопрос о возрасте стоит под тумблером, а не отдельным окном:
               он живёт ровно столько, сколько человек его видит, и уход
               с экрана его закрывает. Поле даты своё, из разметки правки:
               системное на тёмных темах выбивалось из стекла. -->
          <div v-if="askingAge" class="am-age">
            <p class="am-age__ask">Укажите ваш возраст</p>

            <DatePick :value="birth" title="Дата рождения" @pick="onBirth" />

            <p v-if="ageError" class="am-error">{{ ageError }}</p>

            <button class="am-btn am-btn--soft am-age__back" type="button" @click="closeAge">
              Отмена
            </button>
          </div>
        </div>
      </div>

      <!-- Прокси своим узлом: у панели своё состояние и свой разговор
           с оболочкой, и экрану настроек о нём знать нечего.

           Столбец ей выбирает ширина окна, и потому она лежит не рядом
           с «Данными», а после копии: на фуллскрине сетка ставит её во
           второй столбец, под «Данные», а на половине экрана она остаётся
           в своей половине ширины и оказывается под копией. Разбор —
           в settings-screen.css, у правил .am-set. -->
      <div class="am-set__col am-set__col--proxy">
        <ProxyBox />
      </div>

      <!-- О программе — последней в разметке, то есть в самом низу экрана.
           Здесь только то, что читают один раз: версия, система, датасет
           и лицензия. Наверх её не тянет ничто, а место, которое она
           занимала в колонке оформления, отдано самому оформлению.

           Отдельной колонкой, а не хвостом предыдущей: на широком окне
           колонки стоят в ряд, и внутри чужой колонки панель не может
           быть ниже соседей — она встала бы под оформлением, то есть
           в середине экрана, а не внизу. -->
      <div class="am-set__col am-set__col--about">
        <div class="am-panel am-box">
          <h3 class="am-h3">О программе</h3>

          <ul class="am-facts">
            <li class="am-fact">
              <span class="am-fact__name">Версия</span>
              <span class="am-fact__value">{{ version }}</span>
            </li>
            <li class="am-fact">
              <span class="am-fact__name">Система</span>
              <span class="am-fact__value">{{ system }}</span>
            </li>
            <li class="am-fact">
              <span class="am-fact__name">Датасет названий</span>
              <span class="am-fact__value" :class="{ 'am-fact__value--stale': datasetStale }">
                {{ datasetText }}
              </span>
            </li>
          </ul>

          <!-- Плашки с просьбой о звезде здесь больше нет: она вела на
               GitHub, а ссылку наружу на телевизоре открыть нечем. -->

          <!-- Имя источника, лицензия и ссылка. Обязанностью строка быть
               перестала: CC0-1.0 атрибуции не требует, и это вежливость
               к единственному источнику кириллицы. Манами из цепочки убрана
               3 сентября 2026 — номера теперь свои, перечислением каталога. -->
          <p class="am-meta am-fine">
            Русские названия поставляет датасет
            <button v-if="outside" class="am-link" type="button" @click="onDatasetLink">animori-data</button
            ><span v-else class="am-meta">animori-data</span>
            (лицензия CC0-1.0): номера и связки собраны перечислением каталога Шикимори,
            сами названия — из открытых API Шикимори и anime365.
          </p>

          <!-- Свежесть датасета — единственное, за чем человеку приходится следить
               руками, поэтому про просрочку говорим словами, а не одной цифрой выше. -->
          <p v-if="datasetStale" class="am-stale">
            Датасет не обновлялся больше {{ STALE_DAYS }} дней. Названия, которых в нём нет,
            программа добирает из сети по одному — это медленно. Загляните в
            <button v-if="outside" class="am-link" type="button" @click="onDatasetLink">animori-data</button
            ><span v-else class="am-meta">animori-data</span>
            и запустите сборку кнопкой.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped src="./settings-screen.css"></style>
