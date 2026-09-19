<script setup lang="ts">
// Инструкция: как перенести список на телевизор.
//
// Отдельным узлом и модалкой, а не абзацами в панели: панель читают
// глазами по кнопкам, а инструкцию — один раз, когда переносят список
// впервые. В панели она оплачивалась бы каждым открытием настроек.
//
// ЧТО ЗДЕСЬ ОПИСАНО
//
// Ровно один путь: компьютер делает ссылку, телевизор забирает по ней
// копию. Прежде инструкция рассказывала и про пропуск Яндекса, и про
// запись копии, и про публикацию ссылки — всё это на телевизоре
// недоступно (см. шапку CloudBox.vue), и человек тратил время на шаги,
// которые к его устройству не относятся.
//
// Своего состояния узел не держит вовсе: открыт он или нет решает тот,
// кто нажал кнопку. Ломаться тут нечему.
//
// Уводится в body нарочно: панель настроек лежит внутри прокручиваемого
// экрана, а position: fixed внутри предка с transform считается от предка,
// и модалка уезжала бы вместе с прокруткой.
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
  /** Открыта ли модалка. */
  open: boolean
}>()

const emit = defineEmits<{ close: [] }>()

/** Тело справки: его листают стрелками. */
const body = ref<HTMLElement | null>(null)

function onClose(): void {
  emit('close')
}

/// Сколько прокручивать за нажатие. Шестьдесят пикселей — примерно
/// две строки текста: с трёх метров видно, что страница поехала,
/// и при этом до конца справки добираешься за десяток нажатий.
const STEP = 60

/**
 * Клавиши внутри справки: Esc закрывает, стрелки листают текст.
 *
 * ЛИСТАЕМ САМИ, А НЕ ОТДАЁМ ОБХОДУ. Пульт доводит прокрутку до элемента
 * под фокусом, а фокус в этом окне стоит на крестике в шапке — тело
 * справки ему не предок, и доводить до него нечего. Замер с приставки:
 * текст обрезался на третьем шаге, и стрелка вниз не двигала ничего.
 *
 * `stopPropagation` обязателен: обход пульта слушает то же нажатие на
 * window и, получив его, увёл бы фокус на единственную кнопку окна.
 */
function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    onClose()
    return
  }

  const box = body.value
  if (box === null) return

  let step = 0
  if (e.key === 'ArrowDown') step = STEP
  else if (e.key === 'ArrowUp') step = -STEP
  else if (e.key === 'PageDown') step = STEP * 4
  else if (e.key === 'PageUp') step = -STEP * 4
  else return

  e.preventDefault()
  e.stopPropagation()
  box.scrollBy({ top: step, behavior: 'smooth' })
}

// Слушатель живёт только пока модалка открыта: висящий на document
// обработчик закрытого окна перехватывал бы Esc у экранов под ним.
watch(
  () => props.open,
  (open) => {
    if (!open) {
      document.removeEventListener('keydown', onKey)
      return
    }

    document.addEventListener('keydown', onKey)

    // Фокус переезжает в текст справки. Без этого он остаётся на кнопке
    // «i» под окном: обход пульта ограничил бы себя окном, а фокус стоял
    // снаружи, и первое же нажатие стрелки ушло бы в никуда.
    void nextTick(() => body.value?.focus())
  },
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="am-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Перенос списка на телевизор"
    >
      <!-- Клик мимо закрывает: это справка, и держать её силой незачем. -->
      <div class="am-modal__veil" @click="onClose" />

      <div class="am-modal__box">
        <div class="am-modal__head">
          <h3 class="am-modal__title">Перенос списка на телевизор</h3>
          <button class="am-modal__x" type="button" aria-label="Закрыть" @click="onClose">✕</button>
        </div>

        <!-- tabindex у тела: с фокусом на нём пульт видит, что находится
             внутри окна, и не считает окно пустым. -->
        <div ref="body" class="am-modal__body" tabindex="0">
          <p>
            Пропуск облака выдают в браузере, а на телевизоре его не набрать. Поэтому ссылку делает
            компьютер, а телевизор забирает по ней копию.
          </p>

          <h4 class="am-modal__h">На компьютере</h4>
          <ol>
            <li>Откройте AniMori и зайдите в <b>Настройки → Копия списка</b>.</li>
            <li>Нажмите <b>Подключить</b> и один раз введите пропуск Яндекс Диска.</li>
            <li>
              Нажмите <b>Сохранить</b> — на Диске появится файл копии со списком, который вы
              видите на компьютере.
            </li>
            <li>
              В разделе <b>Ссылка для телевизора</b> нажмите <b>Создать ссылку</b> и запишите её
              хвост — знаки после последней косой черты.
            </li>
          </ol>

          <h4 class="am-modal__h">На телевизоре</h4>
          <ol>
            <li>Зайдите в <b>Настройки → Копия списка</b>.</li>
            <li>
              Нажмите <b>ОК</b> на поле рядом с кнопкой <b>Найти копию</b> — поднимется
              клавиатура — и введите хвост ссылки.
            </li>
            <li>
              Нажмите <b>Найти копию</b>, посмотрите размер и время копии и выберите способ:
              <b>Добавить недостающее</b> или <b>Заменить целиком</b>.
            </li>
          </ol>

          <h4 class="am-modal__h">После переноса</h4>
          <ul>
            <li>
              На компьютере нажмите <b>Закрыть доступ</b>: по ссылке копию прочитает любой, кто её
              знает. Файл копии на Диске при этом остаётся.
            </li>
            <li>
              Хвост действует, пока ссылка не закрыта: перенос на второе устройство можно повторить
              тем же хвостом.
            </li>
          </ul>

          <div class="am-modal__warn">
            Если копия не находится, проверьте хвост: пробелов в нём нет, а заглавные и строчные
            знаки различаются. Ссылку можно создать заново — прежняя перестанет действовать после
            перезаписи файла копии.
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Модалка на весь экран: сама справка узкая, но подложка обязана перекрыть
   всё, иначе клик мимо уходит в панель под ней. */
.am-modal {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 24px;
}

/* Подложка красится темой, а не чᄅрным литералом: на светлой теме чёрная
   вуаль читалась провалом в экране. */
.am-modal__veil {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--am-bg) 76%, transparent);
  backdrop-filter: blur(var(--am-blur-strong));
}

.am-modal__box {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(640px, 100%);
  max-height: min(760px, 88vh);
  background: var(--am-panel-2);
  border: 1px solid var(--am-line);
  border-radius: var(--am-r-m);
  box-shadow: var(--am-sh-2);
  animation: am-modal-in var(--am-mid) var(--am-ease) both;
}

@keyframes am-modal-in {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.am-modal__head {
  display: flex;
  flex: none;
  gap: 12px;
  align-items: center;
  padding: 15px 15px 13px 18px;
  border-bottom: 1px solid var(--am-line-soft);
}

.am-modal__title {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--am-text);
}

.am-modal__x {
  display: grid;
  flex: none;
  place-items: center;
  width: 30px;
  height: 30px;
  font: inherit;
  font-size: 13px;
  line-height: 1;
  color: var(--am-dim);
  cursor: pointer;
  background: var(--am-fill-1);
  border: 1px solid var(--am-line-soft);
  border-radius: var(--am-r-cap);
  transition:
    color var(--am-fast) var(--am-ease),
    background-color var(--am-fast) var(--am-ease),
    border-color var(--am-fast) var(--am-ease);
}

.am-modal__x:hover {
  color: var(--am-text);
  background: var(--am-hover);
  border-color: rgb(var(--am-accent-rgb) / 0.45);
}

/* Текст справки прокручивается внутри рамки: шаги все нужны, и резать
   их на страницы незачем.

   `min-height: 0` здесь не украшение, а то, без чего прокрутки нет
   вовсе. В гибкой колонке элемент по умолчанию не сжимается ниже своего
   содержимого: `overflow-y: auto` такому блоку ничего не даёт, он просто
   выталкивает рамку за экран, и до шагов ниже первого экрана не доехать
   ничем. Замер с приставки: окно справки обрезалось на третьем шаге,
   и пульт вниз не двигал ничего. */
.am-modal__body {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  gap: 11px;
  min-height: 0;
  padding: 16px 18px 20px;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.6;
  color: var(--am-dim);
}

/* Тело справки берёт фокус, но подсветки на нём быть не должно:
   правило `.am-lite :focus-visible` залило бы акцентом всю страницу
   текста — это читалось бы не «здесь ты», а «здесь сломано». */
.am-modal__body:focus-visible {
  outline: none;
  box-shadow: none;
}

.am-modal__body p {
  margin: 0;
}

.am-modal__body b {
  color: var(--am-text);
}

.am-modal__h {
  margin: 7px 0 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--am-text);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.am-modal__body ol,
.am-modal__body ul {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding-left: 20px;
}

/* Вложенный список — варианты внутри шага, а не новый шаг: отступ поменьше
   и своё поле сверху, иначе он сливается со строкой шага. */
.am-modal__body li > ul {
  gap: 4px;
  margin-top: 5px;
  padding-left: 16px;
}

/* Адреса и права в тексте — набранные, а не пересказанные: их копируют
   в браузер и в консоль Яндекса, и любая вольность пересказа стоит
   человеку получаса. Перенос по любому месту обязателен: ссылка
   с ClientID в одну строку панели не встаёт. */
.am-modal__body code {
  padding: 1px 6px;
  font-size: 12px;
  background: var(--am-fill-2);
  border-radius: var(--am-r-s);
  overflow-wrap: anywhere;
}

/* Предупреждение тем же тоном, что и вопросы в панели: это не поломка,
   и красным его показывать неправильно. */
.am-modal__warn {
  padding: 11px 13px;
  background: color-mix(in srgb, var(--am-warn) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--am-warn) 42%, transparent);
  border-radius: var(--am-r-m);
}

.am-modal__link {
  padding: 0;
  font: inherit;
  color: var(--am-accent);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
  background: none;
  border: 0;
}

@media (prefers-reduced-motion: reduce) {
  .am-modal__box {
    animation: none;
  }
}
</style>
