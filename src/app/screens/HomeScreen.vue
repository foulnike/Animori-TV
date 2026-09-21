<script setup lang="ts">
// Главная — витрина рекомендаций (пункт 3.11). Своя полка из памяти коллекции, витрина
// каталога через core/recs: сети экран не знает. Три полки каталога едут одним запросом
// (packShelf). Пока отбор пуст — витрина из пяти полок; выбран жанр, тэг, год или формат —
// каруселей нет, вместо них вертикальная лента с «Показать ещё». Порция ленты — целое число рядов сетки.

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { emptyPick, pickIsSet, pickKey, type CatalogPick } from '@/api/anilist-catalog'
import type { MediaBrief } from '@/api/anilist-media'
import { setupVideoSources } from '@/api/video-sources'
import { genreAllowed, keepAllowed } from '@/core/adult'
import { initCollection } from '@/core/collection'
import { selectEntries } from '@/core/collection-view'
import {
  notOutYet,
  partsCeiling,
  peekLook,
  rememberBrief,
  SOON_STATUS,
  warmLooks,
  type MediaLook,
} from '@/core/media-looks'
import { peekRussianName, prefetchRussianNames } from '@/core/media-title'
import {
  onPlayableChange,
  peekPlayable,
  primePlayable,
  requestPlayable,
  type PlayAsk,
  type PlayState,
} from '@/core/playable'
import { feedMore, hideRec, motifShelf, newFeed, packShelf, tasteShelf } from '@/core/recs'
import type { SnapshotEntry } from '@/core/snapshot'
import { Logger } from '@/utils/logger'

import EmptyMark from '../components/EmptyMark.vue'
import FilterSheet from '../components/FilterSheet.vue'
import MediaTile from '../components/MediaTile.vue'
import { formatWord, GENRE_CHOICES, genreWord, partsShort } from '../labels'
import { navigate } from '../router'
import SakuraMark from '../components/SakuraMark.vue'
import { tagWord } from '../tag-words'
import { toPlayAsk, toTileRow, type TileRow } from '../tile-row'
import { OWN_STATUSES, useHomeCalendar, type CalendarScope } from './home-calendar'
import { dropFeed, feedKeep, homePick } from './home-keep'

/** Сколько постеров класть на свою полку. */
const SHELF_SIZE = 14

/** Области показа календаря: подписи, подсказки и порядок. Второй пункт назван
 * «Популярное», а не «Глобально», нарочно: глобального показа у AniList нет вовсе,
 * и подпись, обещающая это, врала бы при каждом открытии экрана. */
const CALENDAR_SCOPES: ReadonlyArray<{ key: CalendarScope; title: string; hint: string }> = [
  { key: 'mine', title: 'Моё', hint: 'Всё из списка, кроме брошенного' },
  { key: 'popular', title: 'Популярное', hint: 'Выходы верхушки идущих за эту неделю' },
]

/** Скольким плиткам добирать русские названия и по скольку за заход. */
const TITLE_DEPTH = 12
const TITLE_CHUNK = 6

/** Сколько заглушек держать на время подъёма снимка. */
const HOLD_COUNT = 7

/** Ниже этого числа плиток полка не показывается: огрызок из одной-двух картинок после чистки повторов выглядит ошибкой загрузки. */
const SHELF_MIN = 3

/** Сколько плиток добирать в ленту за одно «Показать ещё»: четыре ряда по девять плиток, иначе нижний ряд обрывался на середине. */
const FEED_WANT = 36

/** Сколько ждать после первого показа, прежде чем спросить: без паузы каждая плитка уходила бы своим вопросом, а очередь ядра любит оптовые пачки. */
const SEEN_PAUSE_MS = 200

/** Плитка своей полки. Тот же вид, что в списках: вид аниме везде один. */
interface Row {
  mediaId: number
  title: string
  facts: string
  mark: string | null
  own: string | null
  done: number
  soon: boolean
  play: PlayState | null
  cover: string | null
  color: string | null
  adult: boolean
}

/** Полка витрины в показе: заголовок и готовые плитки. */
interface Shelf {
  key: string
  title: string
  rows: TileRow[]
}

/** Описание полки витрины: что грузить и как назвать. */
interface ShelfDef {
  key: string
  title: string
  load: () => Promise<MediaBrief[]>
}

/** Условие отбора в строке под шапкой: нажатие снимает именно его. */
interface PickChip {
  key: string
  title: string
  kind: 'genre' | 'tag' | 'format' | 'years'
  value: string
}

const busy = ref(true)
const trouble = ref('')
const ownRows = ref<Row[]>([])
const recs = ref<Shelf[]>([])
const recsPending = ref(false)
const sheetOpen = ref(false)
const feedRows = ref<TileRow[]>([])
const feedBusy = ref(false)
const feedDone = ref(false)

/** Календарь выхода. Всё считает home-calendar, здесь только разметка. */
const {
  busy: calendarBusy,
  failed: calendarFailed,
  days: calendarDays,
  shown: calendarDay,
  span: calendarSpan,
  scope: calendarScope,
  hidden: calendarHidden,
  hiddenDays: calendarHiddenDays,
  pick: pickDay,
  setScope: setCalendarScope,
  load: loadCalendar,
} = useHomeCalendar()

/** Выходы показанного дня. Отдельным computed, а не выражением в разметке: решать,
 * рисовать ли полку, должен скрипт. Потолка у списка нет: полка едет вбок и в высоту не растёт. */
const dayRows = computed(() => calendarDay.value?.rows ?? [])

/** Записи своей полки вне реактивности: плитки пересобираются после добора. */
let ownEntries: SnapshotEntry[] = []

/** Номера своих тайтлов для календаря: нужны ещё раз при смене области показа. */
let calendarIds: number[] = []

/** Приехавшие полки витрины и их порядок: плитки собираются на показ. */
const staged = new Map<string, MediaBrief[]>()
let activeDefs: ShelfDef[] = []

/** Номера идущих доборов: смена отбора гасит старую работу. */
let lookRun = 0
let titleRun = 0
let playRun = 0
let recsRun = 0
let feedRun = 0
let askRun = 0

/** Показанные плитки, о которых ещё не спрашивали, и номера уже отправленных вопросов.
 * Второе множество нужно потому, что одно аниме стоит и на своей полке, и в витрине, и в ленте. */
const seenTiles = new Set<number>()
const askedTiles = new Set<number>()
let seenTimer: ReturnType<typeof setTimeout> | null = null

/** Общий заход подъёма склада. Вопрос по показу ждёт его: иначе первый экран уедет к чужой службе за тем, что лежит на диске. */
let priming: Promise<void> = Promise.resolve()

/** Стоит ли сейчас хоть одно условие отбора. */
const picked = computed(() => pickIsSet(homePick.value))

/** Сколько условий в отборе: число на кнопке «Фильтры». */
const pickCount = computed(
  () =>
    homePick.value.genres.length +
    homePick.value.tags.length +
    homePick.value.formats.length +
    (homePick.value.yearFrom !== null || homePick.value.yearTo !== null ? 1 : 0),
)

/** Быстрые жанры под политикой показа взрослого: при выключенном 18+ «Хентая» нет и в быстрой ленте. */
const genreList = computed<string[]>(() => GENRE_CHOICES.filter((genre) => genreAllowed(genre)))

/** Заголовок ленты: под отбором это результат подбора, без него — добавка к каруселям. */
const feedTitle = computed(() => (picked.value ? 'Подбор' : 'Ещё рекомендации'))

/** Показывать ли раздел ленты вообще. */
const feedShown = computed(
  () => feedBusy.value || feedRows.value.length > 0 || (picked.value && feedDone.value),
)

function describe(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/** Годы отбора одной подписью. */
function yearsWord(pick: CatalogPick): string {
  if (pick.yearFrom !== null && pick.yearTo !== null) {
    return pick.yearFrom === pick.yearTo
      ? String(pick.yearFrom)
      : `${pick.yearFrom}\u2013${pick.yearTo}`
  }
  if (pick.yearFrom !== null) return `с ${pick.yearFrom}`
  return `по ${pick.yearTo}`
}

/** Условия отбора строкой чипов: видно, чем сужен подбор, и снимается по одному, не открывая меню. */
const pickChips = computed<PickChip[]>(() => {
  const pick = homePick.value
  const out: PickChip[] = []

  for (const genre of pick.genres) {
    out.push({ key: `g:${genre}`, title: genreWord(genre) ?? genre, kind: 'genre', value: genre })
  }
  for (const tag of pick.tags) {
    out.push({ key: `t:${tag}`, title: tagWord(tag), kind: 'tag', value: tag })
  }
  for (const format of pick.formats) {
    out.push({
      key: `f:${format}`,
      title: formatWord(format) ?? format,
      kind: 'format',
      value: format,
    })
  }
  if (pick.yearFrom !== null || pick.yearTo !== null) {
    out.push({ key: 'y', title: yearsWord(pick), kind: 'years', value: '' })
  }

  return out
})

/** Короткая подпись под названием: вид и год. */
function factsText(look: MediaLook | null): string {
  if (look === null) return ''

  const parts: string[] = []
  const kindWord = formatWord(look.format)
  if (kindWord !== null) parts.push(kindWord)
  if (look.seasonYear !== null) parts.push(String(look.seasonYear))
  return parts.join(' · ')
}

/** Свой счёт частей на постере. */
function ownText(entry: SnapshotEntry, parts: number | null): string | null {
  const short = partsShort()
  if (parts === null) return entry.progress > 0 ? `${entry.progress} ${short}` : null
  return `${entry.progress} / ${parts} ${short}`
}

/** Вопрос об источниках по записи своей полки. Имён берётся столько, сколько есть: снимок
 * хранит латиницу, облик — романдзи, датасет — русское имя. Номер MAL у записи бывает пустым. */
function playAskOf(entry: SnapshotEntry): PlayAsk {
  const look = peekLook(entry.mediaId)
  const names = [
    ...new Set([
      entry.romaji ?? '',
      entry.english ?? '',
      look?.romaji ?? '',
      peekRussianName(entry.mediaId) ?? '',
    ]),
  ]

  return {
    mediaId: entry.mediaId,
    malId: entry.malId ?? null,
    titles: names.filter((name) => name !== ''),
    year: look?.seasonYear ?? undefined,
  }
}

/** Строчка ряда с полки своего списка. */
function toRow(entry: SnapshotEntry): Row {
  const look = peekLook(entry.mediaId)

  // У идущего сезона итога может не быть вовсе: считаем по вышедшему.
  const parts = partsCeiling(look)
  const done =
    parts !== null && parts > 0 && entry.progress > 0 ? Math.min(1, entry.progress / parts) : 0

  return {
    mediaId: entry.mediaId,
    title:
      peekRussianName(entry.mediaId) ??
      entry.romaji ??
      entry.english ??
      look?.romaji ??
      `Аниме #${entry.mediaId}`,
    facts: factsText(look),
    mark: entry.score10 > 0 ? `★ ${entry.score10.toFixed(1)}` : null,
    own: ownText(entry, parts),
    done,
    soon: notOutYet(look),
    play: peekPlayable(entry.mediaId),
    cover: look?.cover ?? null,
    color: look?.color ?? null,
    adult: entry.isAdult,
  }
}

function redrawOwn(): void {
  ownRows.value = ownEntries.map(toRow)
}

/** Пересобирает плитки ленты подбора из набранного. Взрослое отсеивается при отрисовке:
 * набранное лента держит дольше, чем живёт настройка показа. */
function drawFeed(): void {
  feedRows.value = keepAllowed(feedKeep.items, (item) => item.isAdult).map(toTileRow)
}

/** Добирает обложки своей полки: снимок картинок не хранит. */
async function fillLooks(): Promise<void> {
  const mine = ++lookRun
  const wanted = ownEntries
    .filter((entry) => peekLook(entry.mediaId) === null)
    .map((entry) => entry.mediaId)

  if (wanted.length === 0) return

  try {
    await warmLooks(wanted)
    if (mine !== lookRun) return

    redrawOwn()
  } catch (e) {
    // Без обложки плитка останется с буквой названия — это не повод ругаться.
    Logger('WARN', 'Главная: обложки добрать не вышло', e)
  }
}

/** Добирает русские названия верхним плиткам своей полки. */
async function fillTitles(): Promise<void> {
  const mine = ++titleRun
  const wanted = ownEntries
    .slice(0, TITLE_DEPTH)
    .filter((entry) => peekRussianName(entry.mediaId) === null)
    .map((entry) => entry.mediaId)

  if (wanted.length === 0) return

  try {
    for (let from = 0; from < wanted.length; from += TITLE_CHUNK) {
      if (mine !== titleRun) return

      // Полке нужно только имя: описание и оценки спросит открытая карточка.
      await prefetchRussianNames(wanted.slice(from, from + TITLE_CHUNK))
      if (mine !== titleRun) return

      redrawOwn()
    }
  } catch (e) {
    Logger('WARN', 'Главная: названия добрать не вышло', e)
  }
}

/** Держит подъём склада в общем заходе: askSeen ждёт его целиком, а не ту полку, что приехала последней. */
function keepPriming(job: Promise<void>): void {
  priming = Promise.all([priming, job]).then(() => undefined)
}

/** Поднимает склад доступности по своей полке. Склад лежит в своей базе, отвечает даром и
 * разом по всем номерам, поэтому спрашивается целиком. В сеть за остальным идёт askSeen. */
function loadOwnMarks(): void {
  if (ownEntries.length === 0) return

  const mine = ++playRun
  const job = primePlayable(ownEntries.map((entry) => entry.mediaId))
    .then((primed) => {
      if (mine === playRun && primed > 0) redrawOwn()
    })
    .catch((e) => {
      Logger('WARN', 'Главная: склад доступности своей полки не поднялся', e)
    })

  keepPriming(job)
}

/** Своя полка: продолжение просмотра и пересмотра. */
function buildOwn(): void {
// Взрослое отсеивается здесь, на входе: полка — те же свои записи, что и в списках. Фильтр
// по месту, а не на выдаче: скрытая запись не тянет ни обложку, ни имя, ни вопрос о доступности.
  const watching = selectEntries(
    { status: ['CURRENT', 'REPEATING'], hideAdult: true },
    { key: 'updated' },
  )

  ownEntries = watching.slice(0, SHELF_SIZE)
  redrawOwn()
  void fillLooks()
  void fillTitles()
  loadOwnMarks()

// Календарю нужны все свои тайтлы, а не четырнадцать на полке: полка обрезана по длине, а
// неделя — нет. Закладки шире, чем у полки: в него идут и планы, и отложенное, а брошенное
// не идёт. Разницу держит OWN_STATUSES в home-calendar. Номера запоминаются для смены области.
  calendarIds = selectEntries({ status: [...OWN_STATUSES] }).map((entry) => entry.mediaId)
  void loadCalendar(calendarIds)
}

/** Состав витрины. Порядок важен дважды: по нему полки стоят на экране и решается, кому
 * достанется аниме при повторе. Под отбором каруселей нет — там всё говорит лента подбора. */
function shelfDefs(): ShelfDef[] {
  if (picked.value) return []

  return [
    { key: 'taste', title: 'Под ваш вкус', load: () => tasteShelf() },
    { key: 'motif', title: 'По мотивам вашего списка', load: () => motifShelf() },
    { key: 'airing', title: 'Сейчас выходит', load: () => packShelf('airing') },
    { key: 'trending', title: 'В тренде', load: () => packShelf('trending') },
    { key: 'top', title: 'Лучшее за всё время', load: () => packShelf('top') },
  ]
}

/** Собирает полки в показ: приехавшее встаёт на своё место в порядке состава. Аниме
 * показывается ровно на одной полке: «тренд», «лучшее» и жанровые подборки у каталога
 * пересекаются почти наполовину. Взрослое отсеивается здесь, а не только при загрузке полки:
 * состав полок запоминается на сеанс, и отсев иначе остался бы на экране после выключения тумблера. */
function publish(): void {
  const out: Shelf[] = []
  const seen = new Set<number>()

  for (const def of activeDefs) {
    const items = staged.get(def.key)
    if (items === undefined || items.length === 0) continue

    const fresh = keepAllowed(items, (brief) => brief.isAdult).filter(
      (brief) => !seen.has(brief.mediaId),
    )
    if (fresh.length < SHELF_MIN) continue

    for (const brief of fresh) seen.add(brief.mediaId)
    out.push({ key: def.key, title: def.title, rows: fresh.map(toTileRow) })
  }

  recs.value = out
}

// Очередь доступности отвечает вразброд и по одному аниме, причём один ответ часто касается
// разом и своей полки, и витрины, и ленты: рисуем всё три.
const stopPlayWatch = onPlayableChange(() => {
  redrawOwn()
  publish()
  drawFeed()
})

/** Вопрос об источниках по номеру показанной плитки. Плитка приходит с трёх сторон, и вопрос
 * у каждой собирается по-своему: у своей полки есть номер MAL из снимка, у каталога — заголовки брифа.
 * Анонс не спрашивается вовсе: у него не вышло ни одной части, и ответ известен заранее. */
function askFor(mediaId: number): PlayAsk | null {
  const own = ownEntries.find((entry) => entry.mediaId === mediaId)
  if (own !== undefined) return playAskOf(own)

  for (const items of staged.values()) {
    const brief = items.find((item) => item.mediaId === mediaId)
    if (brief === undefined) continue

    return brief.status === SOON_STATUS ? null : toPlayAsk(brief)
  }

  const inFeed = feedKeep.items.find((item) => item.mediaId === mediaId)
  if (inFeed === undefined) return null

  return inFeed.status === SOON_STATUS ? null : toPlayAsk(inFeed)
}

/** Забывает показанное: смена отбора и уход с экрана снимают накопленное вместе с недоспрошенной пачкой. */
function dropSeen(): void {
  askRun++

  if (seenTimer !== null) {
    clearTimeout(seenTimer)
    seenTimer = null
  }

  seenTiles.clear()
  askedTiles.clear()
}

/** Спрашивает чужие службы про показанные плитки одной пачкой. Ждёт подъёма склада: иначе
 * первый экран уедет в сеть за тем, что лежит на диске. Темп дальше держит очередь ядра. */
async function askSeen(): Promise<void> {
  const mine = askRun

  await priming
  if (mine !== askRun) return

  const wanted: PlayAsk[] = []
  for (const mediaId of seenTiles) {
    if (askedTiles.has(mediaId) || peekPlayable(mediaId) !== null) continue

    const ask = askFor(mediaId)
    if (ask === null) continue

    askedTiles.add(mediaId)
    wanted.push(ask)
  }
  seenTiles.clear()

  if (wanted.length === 0) return

  try {
// Реестр источников собирает не ядро, а слой api. Повторный зов ничего не стоит: сборка идёт один раз.
    setupVideoSources()

    await requestPlayable(wanted)
    if (mine !== askRun) return

    redrawOwn()
    publish()
    drawFeed()
  } catch (e) {
    // Без ответа плитка останется без метки, а не с ложной: так и задумано.
    Logger('WARN', 'Главная: метки доступности не доехали', e)
  }
}

/** Плитка попала в окно: копим номер и спрашиваем пачкой после паузы. */
function onTileSeen(mediaId: number): void {
  if (askedTiles.has(mediaId) || peekPlayable(mediaId) !== null) return

  seenTiles.add(mediaId)
  if (seenTimer !== null) return

  seenTimer = setTimeout(() => {
    seenTimer = null
    void askSeen()
  }, SEEN_PAUSE_MS)
}

/** Добирает русские названия плиткам полки витрины. */
async function warmRecTitles(mine: number, key: string): Promise<void> {
  const items = staged.get(key)
  if (items === undefined) return

  const wanted = items
    .filter((brief) => peekRussianName(brief.mediaId) === null)
    .map((brief) => brief.mediaId)

  try {
    for (let from = 0; from < wanted.length; from += TITLE_CHUNK) {
      if (mine !== recsRun) return

      await prefetchRussianNames(wanted.slice(from, from + TITLE_CHUNK))
      if (mine !== recsRun) return

      publish()
    }
  } catch (e) {
    Logger('WARN', 'Главная: названия витрины добрать не вышло', e)
  }
}

/** Поднимает склад доступности по приехавшей полке витрины: даром и разом. Вопрос чужим
 * службам ставит показ плитки, а не приезд полки: пять полок по четырнадцать постеров — это
 * семь десятков вопросов сразу после запуска, из которых видно от силы полтора ряда. */
function primeShelfMarks(mine: number, key: string): void {
  const items = staged.get(key)
  if (items === undefined || items.length === 0) return

  const job = primePlayable(items.map((brief) => brief.mediaId))
    .then((primed) => {
      if (mine === recsRun && primed > 0) publish()
    })
    .catch((e) => {
      Logger('WARN', 'Главная: склад доступности витрины не поднялся', e)
    })

  keepPriming(job)
}

/** Добор одной полки: склад ставится сразу и не ждёт никого, а имена идут заходами. Имя важнее метки. */
async function warmRecShelf(mine: number, key: string): Promise<void> {
  primeShelfMarks(mine, key)
  await warmRecTitles(mine, key)
}

/** Тот же добор для новой порции ленты: склад разом, имена заходами, а вопросы в сеть — по показу. */
async function warmFeed(mine: number, items: MediaBrief[]): Promise<void> {
  const job = primePlayable(items.map((brief) => brief.mediaId))
    .then((primed) => {
      if (mine === feedRun && primed > 0) drawFeed()
    })
    .catch((e) => {
      Logger('WARN', 'Главная: склад доступности ленты не поднялся', e)
    })

  keepPriming(job)

  const wanted = items
    .filter((brief) => peekRussianName(brief.mediaId) === null)
    .map((brief) => brief.mediaId)

  try {
    for (let from = 0; from < wanted.length; from += TITLE_CHUNK) {
      if (mine !== feedRun) return

      await prefetchRussianNames(wanted.slice(from, from + TITLE_CHUNK))
      if (mine !== feedRun) return

      drawFeed()
    }
  } catch (e) {
    Logger('WARN', 'Главная: названия ленты добрать не вышло', e)
  }
}

/** Полки витрины: каждая встаёт сама по готовности. Три полки каталога делят один запрос и приезжают вместе. */
function loadRecs(): void {
  const mine = ++recsRun
  staged.clear()
  recs.value = []
  activeDefs = shelfDefs()
  recsPending.value = activeDefs.length > 0

  const tasks = activeDefs.map((def) =>
    def
      .load()
      .then((items) => {
        if (mine !== recsRun || items.length === 0) return
        staged.set(def.key, items)
        publish()
        void warmRecShelf(mine, def.key)
      })
      .catch((e) => {
        Logger('WARN', `Главная: полка «${def.key}» не доехала`, e)
      }),
  )

  void Promise.allSettled(tasks).then(() => {
    if (mine === recsRun) recsPending.value = false
  })
}

/** Добирает очередную порцию ленты. Обход помнит страницу и показанные номера, поэтому «Показать ещё» не даёт повторов. */
async function growFeed(mine: number): Promise<void> {
  const run = feedKeep.run
  if (run === null || feedBusy.value) return

  feedBusy.value = true

  try {
    const got = await feedMore(run, FEED_WANT)
    if (mine !== feedRun) return

// Обложки приехали вместе с ответом: кладём их в общую память даром, иначе списки и карточки полезут за тем же второй раз.
    for (const brief of got) rememberBrief(brief)

    feedKeep.items = [...feedKeep.items, ...got]
    feedDone.value = run.done
    drawFeed()

    void warmFeed(mine, got)
  } catch (e) {
    Logger('WARN', 'Главная: лента подбора не доехала', e)
  } finally {
    if (mine === feedRun) feedBusy.value = false
  }
}

/** Заводит ленту под нынешний отбор. Набранное переживает уход на карточку: возврат не должен начинаться с первой страницы. */
function startFeed(): void {
  const mine = ++feedRun
  const key = pickKey(homePick.value)

  if (feedKeep.key === key && feedKeep.run !== null && feedKeep.items.length > 0) {
    feedDone.value = feedKeep.run.done
    drawFeed()
    return
  }

  dropFeed()
  feedKeep.key = key
  feedKeep.run = newFeed({ ...homePick.value })
  feedRows.value = []
  feedDone.value = false
  void growFeed(mine)
}

function onMore(): void {
  void growFeed(feedRun)
}

/** Прячет аниме из витрины и ленты: из памяти сразу, в хранилище — вдогонку. */
function hideOne(mediaId: number): void {
  void hideRec(mediaId)

  for (const items of staged.values()) {
    const at = items.findIndex((brief) => brief.mediaId === mediaId)
    if (at >= 0) items.splice(at, 1)
  }
  publish()

  const inFeed = feedKeep.items.findIndex((brief) => brief.mediaId === mediaId)
  if (inFeed >= 0) {
    feedKeep.items.splice(inFeed, 1)
    drawFeed()
  }
}

/** Чип жанра под шапкой: быстрый отбор без меню. */
function toggleGenre(genre: string): void {
  const pick = homePick.value
  homePick.value = {
    ...pick,
    genres: pick.genres.includes(genre)
      ? pick.genres.filter((item) => item !== genre)
      : [...pick.genres, genre],
  }
}

function dropChip(chip: PickChip): void {
  const pick = homePick.value

  if (chip.kind === 'genre') {
    homePick.value = { ...pick, genres: pick.genres.filter((item) => item !== chip.value) }
    return
  }
  if (chip.kind === 'tag') {
    homePick.value = { ...pick, tags: pick.tags.filter((item) => item !== chip.value) }
    return
  }
  if (chip.kind === 'format') {
    homePick.value = { ...pick, formats: pick.formats.filter((item) => item !== chip.value) }
    return
  }

  homePick.value = { ...pick, yearFrom: null, yearTo: null }
}

/** Сброс отбора: витрина возвращается к пяти полкам. */
function resetPick(): void {
  homePick.value = emptyPick()
}

/** Меню отдало готовый отбор целиком. */
function onApply(pick: CatalogPick): void {
  homePick.value = pick
  sheetOpen.value = false
}

function open(mediaId: number): void {
  navigate('media', { id: String(mediaId) })
}

function toLists(): void {
  navigate('lists')
}

function toSearch(): void {
  navigate('search')
}

function toSettings(): void {
  navigate('settings')
}

onMounted(() => {
  void (async () => {
    try {
      // Подъём снимка без сети: главная должна открываться и при лежащем API.
      await initCollection()
    } catch (e) {
      trouble.value = describe(e)
      busy.value = false
      return
    }

    busy.value = false
    buildOwn()
    loadRecs()
    startFeed()
  })()
})

onBeforeUnmount(() => {
  lookRun++
  titleRun++
  playRun++
  recsRun++
  feedRun++
  dropSeen()

// Очередь живёт дольше экрана: неснятая подписка держала бы всю витрину в памяти и пересобирала её на каждый ответ.
  stopPlayWatch()
})

// Страж busy не пускает пересборку до подъёма снимка: иначе витрина встанет на пустом списке.
// Ключ отбора, а не сам объект: копия с теми же условиями не должна гонять сеть заново.
watch(
  () => pickKey(homePick.value),
  () => {
    if (busy.value) return

// Прежняя витрина уходит целиком, и недоспрошенная пачка вместе с ней: новые полки поднимут плитки сами.
    dropSeen()
    loadRecs()
    startFeed()
  },
)
</script>

<template>
  <section class="am-page">
    <p v-if="trouble" class="am-error">{{ trouble }}</p>

<!-- Календарь выхода стоит под шапкой и выше отбора: он отвечает на вопрос, ради которого
     приложение открывают завтра. Полоса дней рисуется сразу — дни это календарь, а не данные. -->
    <section v-if="calendarDays.length > 0" class="am-cal">
      <div class="am-cal__bar">
        <h2 class="am-h2">Выход серий</h2>

        <div class="am-seg" role="group" aria-label="Чья неделя">
          <button
            v-for="item in CALENDAR_SCOPES"
            :key="item.key"
            v-tip="item.hint"
            class="am-seg__btn"
            :class="{ 'am-seg__btn--on': calendarScope === item.key }"
            type="button"
            :aria-pressed="calendarScope === item.key"
            @click="setCalendarScope(item.key, calendarIds)"
          >
            {{ item.title }}
          </button>
        </div>

        <span class="am-bar__gap" />
        <span class="am-cal__span">{{ calendarSpan }}</span>
      </div>

      <div class="am-cal__strip" role="group" aria-label="Дни недели">
        <button
          v-for="day in calendarDays"
          :key="day.key"
          v-tip="day.title"
          class="am-cal__day"
          :class="{
            'am-cal__day--on': day.key === calendarDay?.key,
            'am-cal__day--today': day.today,
            'am-cal__day--past': day.past,
          }"
          type="button"
          :aria-label="day.title"
          :aria-pressed="day.key === calendarDay?.key"
          @click="pickDay(day.key)"
        >
          <span class="am-cal__word">{{ day.word }}</span>
          <span class="am-cal__num">{{ day.num }}</span>
          <span
            class="am-cal__dot"
            :class="{ 'am-cal__dot--on': day.rows.length > 0 }"
            aria-hidden="true"
          />
        </button>
      </div>

      <p v-if="calendarBusy && (calendarDay?.rows.length ?? 0) === 0" class="am-cal__note">
        Спрашиваю расписание…
      </p>

      <p v-else-if="calendarFailed" class="am-cal__note">Расписание не пришло — проверьте связь.</p>

<!-- День — полка постеров в один ряд с боковой прокруткой, а не список строк. Число выходов
     теперь не влияет на высоту: в чужом показе суббота даёт под два десятка серий. Час и номер
     серии ушли в подпись под названием. Метку доступности календарь добывает сам, всем днём разом. -->
      <ul v-else-if="dayRows.length > 0" class="am-rail am-cal__rail">
        <MediaTile
          v-for="row in dayRows"
          :key="row.key"
          :title="row.title"
          :facts="row.facts"
          :cover="row.cover"
          :color="row.color"
          :play="row.play"
          @open="open(row.mediaId)"
        />
      </ul>

<!-- Пустой день — тоже пустое состояние, и знак у него тот же, что у крупных: лист календаря.
     День, где всё спрятал отбор, пустым не объявляется: «выходов нет» было бы неправдой.
     Скрытое считается за неделю, а помнится по дням — иначе отличить тишину от отбора нечем. -->
      <p v-else-if="calendarHiddenDays.has(calendarDay?.key ?? 0)" class="am-cal__note">
        В этот день выходы скрыты меткой 18+.
      </p>

      <p v-else class="am-cal__note am-cal__note--none">
        <span class="am-cal__mark"><EmptyMark name="calendar" /></span>
        <span>В этот день выходов нет.</span>
      </p>

      <p v-if="calendarHidden > 0" class="am-cal__note">
        Скрыто с меткой 18+: {{ calendarHidden }} · показ взрослого включается в настройках
      </p>
    </section>

<!-- Ряд отбора: кнопка меню, быстрые жанры одной лентой и сброс. Внутренний ряд нужен для центровки. -->
    <div class="am-sift">
      <button class="am-btn am-sift__open" type="button" @click="sheetOpen = true">
        Фильтры
        <span v-if="pickCount > 0" class="am-sift__num">{{ pickCount }}</span>
      </button>

      <div class="am-choose">
        <div class="am-choose__row">
          <button
            v-for="genre in genreList"
            :key="genre"
            class="am-chip"
            :class="{ 'am-chip--on': homePick.genres.includes(genre) }"
            type="button"
            @click="toggleGenre(genre)"
          >
            {{ genreWord(genre) ?? genre }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="picked" class="am-now">
      <button
        v-for="chip in pickChips"
        :key="chip.key"
        class="am-chip am-chip--on"
        type="button"
        @click="dropChip(chip)"
      >
        {{ chip.title }}
        <span class="am-now__off" aria-hidden="true">×</span>
      </button>

      <button class="am-btn am-btn--ghost" type="button" @click="resetPick">Сбросить</button>
    </div>

    <div v-if="busy" class="am-shelf">
      <ul class="am-rail">
        <li v-for="n in HOLD_COUNT" :key="n" class="am-hold">
          <span class="am-skeleton am-hold__art" />
          <span class="am-skeleton am-hold__line" />
        </li>
      </ul>
    </div>

    <template v-else>
<!-- v-seen на плитке: метку доступности спрашиваем только про то, что попало в окно.
     Карусель едет вбок, и её хвост не виден вовсе, пока туда не прокрутят. -->
      <section v-if="ownRows.length > 0" class="am-shelf am-shelf--mine">
        <div class="am-bar">
          <h2 class="am-h2 am-shelf__head">
            <SakuraMark class="am-shelf__mine" />
            Продолжаю смотреть
          </h2>
          <span class="am-bar__gap" />
          <button class="am-btn am-btn--ghost" type="button" @click="toLists">К спискам</button>
        </div>

        <ul class="am-rail">
          <MediaTile
            v-for="row in ownRows"
            :key="row.mediaId"
            v-seen="() => onTileSeen(row.mediaId)"
            :title="row.title"
            :facts="row.facts"
            :cover="row.cover"
            :color="row.color"
            :mark="row.mark"
            :own="row.own"
            :done="row.done"
            :soon="row.soon"
            :play="row.play"
            :adult="row.adult"
            @open="open(row.mediaId)"
          />
        </ul>
      </section>

      <section v-for="shelf in recs" :key="shelf.key" class="am-shelf">
        <div class="am-bar">
          <h2 class="am-h2">{{ shelf.title }}</h2>
        </div>

        <ul class="am-rail">
          <MediaTile
            v-for="row in shelf.rows"
            :key="row.mediaId"
            v-seen="() => onTileSeen(row.mediaId)"
            :title="row.title"
            :facts="row.facts"
            :cover="row.cover"
            :color="row.color"
            :score="row.score"
            :mark="row.mark"
            :repeat="row.repeat"
            :note="row.note"
            :own="row.own"
            :done="row.done"
            :soon="row.soon"
            :play="row.play"
            :adult="row.adult"
            hidable
            @open="open(row.mediaId)"
            @hide="hideOne(row.mediaId)"
          />
        </ul>
      </section>

      <!-- Лента подбора: тот же вид плиток, но сеткой и без конца. -->
      <section v-if="feedShown" class="am-shelf">
        <div class="am-bar">
          <h2 class="am-h2">{{ feedTitle }}</h2>
        </div>

        <ul v-if="feedRows.length > 0" class="am-grid">
          <MediaTile
            v-for="row in feedRows"
            :key="row.mediaId"
            v-seen="() => onTileSeen(row.mediaId)"
            :title="row.title"
            :facts="row.facts"
            :cover="row.cover"
            :color="row.color"
            :score="row.score"
            :mark="row.mark"
            :repeat="row.repeat"
            :note="row.note"
            :own="row.own"
            :done="row.done"
            :soon="row.soon"
            :play="row.play"
            :adult="row.adult"
            hidable
            @open="open(row.mediaId)"
            @hide="hideOne(row.mediaId)"
          />
        </ul>

        <ul v-else-if="feedBusy" class="am-grid">
          <li v-for="n in HOLD_COUNT" :key="n" class="am-hold">
            <span class="am-skeleton am-hold__art" />
            <span class="am-skeleton am-hold__line" />
          </li>
        </ul>

        <div v-else class="am-empty">
          <span class="am-empty__mark"><EmptyMark name="sieve" /></span>
          <span>По такому отбору ничего не нашлось.</span>
          <span>Снимите пару условий — подбор станет шире.</span>

          <div class="am-empty__acts">
            <button class="am-btn" type="button" @click="resetPick">Сбросить отбор</button>
          </div>
        </div>

        <div v-if="!feedDone && feedRows.length > 0" class="am-more">
          <button class="am-btn am-btn--soft" type="button" :disabled="feedBusy" @click="onMore">
            {{ feedBusy ? 'Грузим…' : 'Показать ещё' }}
          </button>
        </div>
      </section>

      <div
        v-if="!recsPending && !feedShown && ownRows.length === 0 && recs.length === 0"
        class="am-empty"
      >
        <span class="am-empty__mark"><EmptyMark name="tray" /></span>
        <span>Свой список пуст, а каталог не ответил.</span>
        <span>Когда сеть вернётся, здесь появятся рекомендации.</span>

        <div class="am-empty__acts">
          <button class="am-btn" type="button" @click="toSearch">Найти аниме</button>
          <button class="am-btn am-btn--ghost" type="button" @click="toSettings">
            Перенести список с AniList
          </button>
        </div>
      </div>
    </template>

    <FilterSheet
      :open="sheetOpen"
      :pick="homePick"
      @close="sheetOpen = false"
      @apply="onApply"
    />
  </section>
</template>

<style scoped>
/* Календарь выхода. Стекло то же, что у полосы отбора: обе — служебные полосы, а не содержимое витрины. */
.am-cal {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px 14px;
  background: var(--am-glass);
  border: 1px solid var(--am-line-soft);
  border-radius: var(--am-r-xl);
  box-shadow: inset 0 1px 0 var(--am-edge);
  backdrop-filter: blur(var(--am-blur)) saturate(1.4);
}

/* Строки по центру, а не по базовой линии: в полосе стоит переключатель области показа, и по
   базовой линии он вставал бы на одну линию с подписью недели, а не с заголовком. */
.am-cal__bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.am-cal__span {
  font-size: 12.5px;
  color: var(--am-faint);
  font-variant-numeric: tabular-nums;
}

/* Полоса дней — сеткой, а не флексом: семь клеток разной ширины читались бы рядом кнопок, а не календарём. */
.am-cal__strip {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}

.am-cal__day {
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: center;
  padding: 7px 4px 6px;
  font: inherit;
  color: var(--am-dim);
  cursor: pointer;
  background: var(--am-fill-1);
  border: 1px solid transparent;
  border-radius: var(--am-r-m);
  transition:
    color var(--am-fast) var(--am-ease),
    background-color var(--am-fast) var(--am-ease),
    border-color var(--am-fast) var(--am-ease),
    opacity var(--am-fast) var(--am-ease);
}

.am-cal__day:hover {
  color: var(--am-text);
  background: var(--am-hover);
}

/* Прошедший день тише будущего: вышедшее ждёт, а не случится. */
.am-cal__day--past {
  opacity: 0.62;
}

.am-cal__day--past:hover {
  opacity: 1;
}

/* Сегодня отмечено всегда, даже когда выбран другой день: отойдя на пятницу, человек потерял бы, где он сам. */
.am-cal__day--today .am-cal__num {
  color: var(--am-accent);
}

/* Выбранный день возвращает себе полную силу: приглушённость прошедшего иначе гасила бы и выбор,
   и выбранный понедельник выглядел бы бледнее невыбранной среды. Наведение на прошедший день — так же. */
.am-cal__day--on {
  color: var(--am-text);
  opacity: 1;
  background: var(--am-hover);
  border-color: rgb(var(--am-accent-rgb) / 0.45);
}

.am-cal__word {
  font-size: 11px;
  color: var(--am-faint);
}

.am-cal__num {
  font-size: 17px;
  font-weight: 650;
  line-height: 1.05;
  font-variant-numeric: tabular-nums;
}

/* Точка под числом: есть ли в этот день выходы. Именно точка, а не число — число пришлось бы
   читать, а по полосе водят глазом. Подробности даёт подсказка, точное число — список под полосой. */
.am-cal__dot {
  width: 5px;
  height: 5px;
  border-radius: var(--am-r-cap);
  background: transparent;
}

.am-cal__dot--on {
  background: var(--am-accent);
}

/* Полка под полосой: отступы теснее общих. Внешние поля полки рассчитаны на то, что она стоит
   сама по себе, а здесь её обнимает стекло календаря. Сверху десять, а не ноль: плитка под
   курсором приподнимается, и полоса прокрутки обрезала бы ей макушку. */
.am-cal__rail {
  gap: 12px;
  padding: 10px 4px 8px;
}

.am-cal__note {
  margin: 0;
  padding: 4px 2px;
  font-size: 12.5px;
  color: var(--am-faint);
}

/* Пустой день: знак и слова в одну строку. Остальные два примечания календаря остаются простым
   текстом: это ожидание и отказ, а не пустота, и знак у них был бы ложью. */
.am-cal__note--none {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Кегль знака. Сам знак берёт размер от кегля места (width: 1em), и здесь это 16 вместо общих 34:
   в строке примечания крупный знак раздул бы её втрое. Шестнадцать, а не двенадцать с половиной:
   при кегле примечания штрих выходил тоньше пикселя. Высота строки от этого не растёт. */
.am-cal__mark {
  flex: none;
  font-size: 16px;
}

/* Ряд отбора: кнопка меню слева, лента жанров занимает остальное. min-width: 0 на ленте обязателен — иначе прокрутчик распирает флекс. */
.am-sift {
  display: flex;
  gap: 10px;
  align-items: center;
}

.am-sift__open {
  flex: 0 0 auto;
}

.am-sift__num {
  padding: 0 7px;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--am-bg);
  background: linear-gradient(135deg, var(--am-accent), var(--am-accent-2));
  border-radius: var(--am-r-cap);
  font-variant-numeric: tabular-nums;
}

/* Жанры одной лентой: восемнадцать чипов переносом занимали три строки и уводили первую полку
   за сгиб. Края растворяются маской: обрезанный чип честно говорит, что ряд прокручивается. */
.am-choose {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  padding: 2px 0;
  overflow-x: auto;
  scrollbar-width: none;
  mask-image: linear-gradient(90deg, transparent, #000 18px, #000 calc(100% - 28px), transparent);
  overscroll-behavior-x: contain;
}

.am-choose::-webkit-scrollbar {
  height: 0;
}

/* Маска подсказывала, что лента прокручивается, и срезала первый чип по левому краю. Пульт ведёт
   ленту за фокусом, подсказка ему не нужна. */
.am-lite .am-choose {
  mask-image: none;
}

/* Центровка автоотступами, а не justify-content: когда лента шире экрана, автоотступ обращается
   в нуль и начало ряда остаётся доступным прокруткой, а центрованный флекс срезал бы первые жанры. */
.am-choose__row {
  display: flex;
  gap: 8px;
  width: max-content;
  margin-inline: auto;
}

.am-choose .am-chip {
  flex: 0 0 auto;
}

/* Что сейчас в отборе: снимается по одному нажатием на сам чип. */
.am-now {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.am-now__off {
  margin-left: 2px;
  font-size: 13px;
  opacity: 0.7;
}

/* Кнопки в пустом состоянии: выход есть сразу, а не в совете текстом. */
.am-empty__acts {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-top: 6px;
}

/* «Показать ещё» по центру под сеткой: у края страницы кнопку приходилось бы искать глазами после каждой порции. */
.am-more {
  display: flex;
  justify-content: center;
  padding: 6px 0 10px;
}

.am-shelf {
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: am-shelf-in var(--am-slow) var(--am-ease) both;
}

@keyframes am-shelf-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* Своя полка важнее советов каталога, поэтому лежит на стекле: раньше все полки были одного веса. */
.am-shelf--mine {
  padding: 16px 18px 8px;
  background: var(--am-glass);
  border: 1px solid var(--am-line-soft);
  border-radius: var(--am-r-drop);
  box-shadow: inset 0 1px 0 var(--am-edge);
  backdrop-filter: blur(var(--am-blur)) saturate(1.4);
}

/* Заголовок полки с акцентной засечкой: шесть одинаковых заголовков подряд читались сплошным текстом. */
.am-shelf .am-h2 {
  display: flex;
  gap: 10px;
  align-items: center;
}

.am-shelf .am-h2 {
/* Засечка перед заголовком убрана: смысла она не несла, а сакура у своей полки делает то же для одного случая. */
}

.am-shelf--mine .am-h2 {
  /* Сакура остаётся знаком «своё»: подробнее у самой сакуры ниже. */
}

.am-shelf__mine {
/* 1em рядом с кеглем 19 пикселей — сакура чуть ниже строки: вровень она смотрелась бы крупной. */
  width: 14px;
  height: 14px;
  color: var(--am-sakura);
}

.am-rail {
  justify-content: start;
}

.am-hold {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.am-hold__art {
  display: block;
  aspect-ratio: 2 / 3;
}

.am-hold__line {
  display: block;
  width: 72%;
  height: 12px;
  border-radius: var(--am-r-s);
}

/* На узком экране кнопка отбора уходит над лентой жанров: рядом им тесно, и лента сжималась до двух чипов. */
@media (max-width: 560px) {
  .am-sift {
    flex-wrap: wrap;
  }

  .am-choose {
    flex-basis: 100%;
  }
}
</style>
