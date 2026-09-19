<script setup lang="ts">
// Копия списка по ссылке. Один путь вместо шести кнопок.
//
// ПОЧЕМУ ТАК
//
// Прежняя панель умела всё: выбрать облако, ввести пропуск, записать
// копию, забрать её, опубликовать ссылку, закрыть доступ. На телевизоре
// из этого работало ровно одно — забрать копию по ссылке, — а остальное
// упиралось в то, чего у телевизора нет.
//
//  · *Выбор облака и пропуск.* Пропуск — строка под шесть десятков знаков,
//    которую выдают в браузере на компьютере. Набрать её пультом нельзя,
//    а открыть браузер — нечем.
//  · *Запись копии.* Требует того же пропуска. Список на телевизоре
//    правится редко: серии отмечают, а списки заводят на компьютере.
//  · *Создание ссылки.* Тоже требует пропуска: публикует файл на Диске.
//    Ссылку создаёт компьютер — там, где пропуск уже есть.
//
// Осталось «забрать по ссылке»: ссылку делает компьютер, а на телевизоре
// набирают только её хвост — десяток знаков после последней косой черты.
// Ядро принимает и хвост, и ссылку целиком.
//
// ПОРЯДОК: СПЕРВА СПРОСИТЬ, ПОТОМ ПОЛОЖИТЬ
//
// По ссылке сначала спрашивается размер и время копии, и только потом
// предлагается положить её поверх списка. Замена списка вслепую по
// строке из пульта — способ потерять список из-за одной опечатки:
// человек видит, что нашёл, и лишь затем решает.
//
// Своим узлом, а не частью экрана настроек: экран настроек и без него
// самый большой файл в приложении. Наружу нужно одно число — сколько
// записей в списке, оно стоит в вопросе перед заменой, — и одна весть
// обратно: список сменился, числа наверху пора переспросить.
//
// Инструкция — components/CloudHelp.vue: откуда взять ссылку и что
// набирать. На телевизоре она нужнее, чем на компьютере: компьютер
// делает ссылку сам и читать ему незачем.
//
// Оформление берётся из settings-screen.css: классы панели живут там же,
// где остальные настройки, и разводить их по двум файлам пока незачем.
import { ref } from 'vue'

import { linkInfo, pullByLink, type CloudLink } from '@/core/cloud'
import type { PullMode } from '@/core/collection'

import BrandMark from './BrandMark.vue'
import CloudHelp from './CloudHelp.vue'

defineProps<{
  /** Записей в списке сейчас: это число стоит в вопросе перед заменой. */
  list: number
}>()

/** Список сменился: копия легла поверх, и числа снаружи пора переспросить. */
const emit = defineEmits<{ changed: [] }>()

/** Ссылка, введённая для чтения копии, или только её хвост. */
const linkDraft = ref('')

/** Что нашлось по введённой ссылке. null — ещё не искали или не нашли. */
const linkFound = ref<CloudLink | null>(null)

/** Открыта ли справка. Состояние здесь, а не внутри неё: нажимают отсюда. */
const helpOpen = ref(false)

// Своя заметка и своя ошибка: отказ облака не должен красить соседние панели
// настроек и затирать их ответы.
const cloudNote = ref('')
const cloudError = ref('')
const cloudBusy = ref(false)

function describe(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/// Ошибки показываются рядом с кнопкой, а не глотаются: молчаливый catch
/// здесь означал бы кнопку, которая не делает ничего и не говорит почему.
async function cloudGuard(action: () => Promise<void>): Promise<void> {
  cloudBusy.value = true
  cloudError.value = ''
  try {
    await action()
  } catch (e) {
    cloudError.value = describe(e)
  } finally {
    cloudBusy.value = false
  }
}

/// Время человеку — местное и словами. Ноль и нечитаемая дата дают прочерк:
/// «1 января 1970» на месте «копии не было» хуже пустоты.
function whenText(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '—'
  return new Date(ms).toLocaleString('ru-RU')
}

/// Размер копии в килобайтах: байты человеку ничего не говорят, а мегабайта
/// список не набирает даже в тысячу записей.
function sizeText(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024))} КБ`
}

/**
 * Поиск копии по ссылке. Пропуска не требует вовсе — на этом и держится
 * первый запуск на устройстве без клавиатуры. Показываются размер и время,
 * и только после этого предлагается положить копию поверх списка.
 */
function onLinkFind(): void {
  void cloudGuard(async () => {
    cloudNote.value = ''
    linkFound.value = null

    const done = await linkInfo(linkDraft.value.trim())
    if (!done.ok) {
      cloudError.value = done.problem
      return
    }

    linkFound.value = done.value
  })
}

function onLinkCancel(): void {
  linkFound.value = null
}

/** Чтение по ссылке. Отметок о своей копии не двигает: их у читателя нет. */
function onLinkPull(mode: PullMode): void {
  const found = linkFound.value
  if (found === null) return

  linkFound.value = null

  void cloudGuard(async () => {
    cloudNote.value = ''

    const done = await pullByLink(found.key, mode)
    if (!done.ok) {
      cloudError.value = done.problem
      return
    }

    emit('changed')
    linkDraft.value = ''
    cloudNote.value = pullText(done.value)
  })
}

/// Итог словами. Числа те же, что и у переноса с Шикимори, и по той же
/// причине: после слияния важно не общее число, а что стало с набранным здесь.
function pullText(got: {
  mode: PullMode
  total: number
  added: number
  updated: number
  kept: number
  onlyHere: number
  dropped: number
  from: { device: string }
}): string {
  const from = got.from.device === '' ? '' : ` Копия с устройства «${got.from.device}».`
  const lost = got.dropped > 0 ? ` Битых записей в копии: ${got.dropped} — их пропустили.` : ''

  return got.mode === 'replace'
    ? `Список замещён копией: записей ${got.total}.${from}${lost}`
    : `Копия приложена: всего ${got.total}, новых ${got.added}, ` +
        `обновлено ${got.updated}, своих правок сохранено ${got.kept}, ` +
        `только здесь ${got.onlyHere}.${from}${lost}`
}
</script>

<template>
  <div class="am-panel am-box">
    <div class="am-bar">
      <h3 class="am-h3">Копия списка</h3>
      <span class="am-bar__gap" />
      <button
        v-tip="'Откуда взять ссылку и что набирать'"
        class="am-icon"
        type="button"
        aria-label="Как получить ссылку"
        @click="helpOpen = true"
      >
        i
      </button>
    </div>

    <!-- Строкой сервиса, как половина импорта выше: знак, название, короткая
         заметка, под ними поле и кнопка. Знак рисует components/BrandMark.vue
         из src/app/brand/yandex-disk.svg — красная плита Яндекса с глифом
         диска, тот же, что стоит в панели облака на компьютере.

         Заметка вместо прежнего абзаца в две строки: то же самое, но без
         пересказа того, что и так написано в поле и в справке под «i». -->
    <div class="am-serv">
      <div class="am-serv__head">
        <BrandMark class="am-serv__logo" name="yandex-disk" />

        <span class="am-serv__text">
          <span class="am-serv__name">Яндекс Диск</span>
          <span class="am-serv__note">Ссылку создаёт компьютер, здесь набирают её хвост.</span>
        </span>
      </div>

      <div class="am-row">
        <label class="am-field">
          <input
            v-model="linkDraft"
            class="am-input"
            type="text"
            placeholder="Ссылка на копию или её хвост"
            :disabled="cloudBusy"
            @keyup.enter="onLinkFind"
          />
        </label>
        <button
          v-tip="'Спросить, что лежит по ссылке. Список пока не меняется'"
          class="am-btn"
          type="button"
          :disabled="cloudBusy || !linkDraft.trim()"
          @click="onLinkFind"
        >
          {{ cloudBusy ? 'Смотрим…' : 'Найти копию' }}
        </button>
      </div>

      <!-- Сперва показываем, что нашлось: размер и время говорят, свежее
           там или старее, и решение остаётся за человеком. -->
      <div v-if="linkFound" class="am-ask">
        <p class="am-ask__text">
          По ссылке лежит копия: {{ sizeText(linkFound.bytes) }}<template v-if="linkFound.modified">
            · {{ whenText(Date.parse(linkFound.modified)) }}</template>. Здесь записей: {{ list }}.
        </p>

        <div class="am-row">
          <button class="am-btn" type="button" :disabled="cloudBusy" @click="onLinkPull('merge')">
            Добавить недостающее
          </button>
          <button
            v-tip="'Заменить свой список копией по ссылке целиком'"
            class="am-btn am-btn--ghost"
            type="button"
            :disabled="cloudBusy"
            @click="onLinkPull('replace')"
          >
            Заменить целиком
          </button>
          <button class="am-btn am-btn--ghost" type="button" @click="onLinkCancel">Отмена</button>
        </div>
      </div>

      <p v-if="cloudError" class="am-error">{{ cloudError }}</p>
      <p v-if="cloudNote" class="am-note">{{ cloudNote }}</p>
    </div>

    <!-- Справка отдельным узлом и модалкой: читать её будут один раз,
         когда впервые переносят список. -->
    <CloudHelp :open="helpOpen" @close="helpOpen = false" />
  </div>
</template>

<style scoped src="../screens/settings-screen.css"></style>
