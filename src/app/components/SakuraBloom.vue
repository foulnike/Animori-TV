<script setup lang="ts">
// Подложка круглой кнопки: в покое круг, при наведении и фокусе — сакура
// со знака приложения. Реагирует на :hover и :focus-visible хозяина сама.
//
// Не border-radius (он не умеет вогнутые впадины) и не clip-path (Chromium
// режет по нему и попадание курсора, и обводку фокуса) — поэтому цветок
// отдельный слой с pointer-events: none, а кнопка остаётся прямоугольной.
// Лепесток сжат поперёк оси в 0.7038: иначе соседние захлёстываются на 9°
// и на кнопке 28 px выходит неровный круг. Прозрачность висит на корневом
// svg, а не на заливках: пять путей налегают у центра, и разбавленная
// заливка дала бы пятилучевую звезду из швов.

import { SAKURA_PETAL as PETAL, SAKURA_TURNS as TURNS, sakuraTurn as petalTurn } from '../sakura'
</script>

<template>
  <svg class="am-bloom" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <!-- Кромка фокуса — тот же лепесток, развёрнутый на 7 % больше и
         подложенный под цветок. Почему так, а не обводкой коробки
         кнопки, — в заметке о кромке в стилях ниже. -->
    <g class="am-bloom__rim">
      <path v-for="turn in TURNS" :key="turn" :d="PETAL" :transform="petalTurn(turn)" />
    </g>
    <circle class="am-bloom__bud" cx="16" cy="16" r="14" />
    <g class="am-bloom__petals">
      <path v-for="turn in TURNS" :key="turn" :d="PETAL" :transform="petalTurn(turn)" />
    </g>
  </svg>
</template>

<!-- Стили нарочно без scoped: цветок должен сам видеть :hover своего
     хозяина, а из scoped блока до родителя не дотянуться: пришлось бы
     держать правила в каждой кнопке через :deep(), то есть размазать
     одну анимацию по всем местам внедрения. Имена под префиксом
     am-bloom заняты только здесь. -->
<style>
.am-bloom {
  /* Нависание за край кнопки: лепестки раскрываются шире круга,
     иначе цветок не распускается, а втягивается внутрь себя.
     Считается от размера хозяина: 2px на круг 28px — цветок 36px
     в распуске, потому что сами лепестки выходят за viewBox. */
  position: absolute;
  inset: calc(-1 * var(--am-bloom-out, 2px));

  /* Клики и наведение остаются у кнопки: иначе курсор попадал бы
     на выступающий лепесток и терял его вместе с распуском. */
  pointer-events: none;

  /* Лепестки доходят до радиуса 18 в квадрате 32 — две единицы
     наружу. Без этого концы срезало внешним svg. */
  overflow: visible;

  /* Разбавление всего слоя разом, а не каждой заливки по отдельности:
     почему именно так — в заметке о прозрачности выше. */
  opacity: var(--am-bloom-veil, 0.82);

  filter: drop-shadow(var(--am-bloom-shade, 0 2px 5px var(--am-veil)));
  transition: filter var(--am-mid) var(--am-ease);
}

/* Круг в покое. Под курсором съёживается до сердцевины: оставь его
   в полный рост — он заполнит впадины и цветок снова станет кругом. */
.am-bloom__bud {
  fill: var(--am-bloom-deep, #0b1017);
  transform-box: view-box;
  transform-origin: 16px 16px;
  transition:
    fill var(--am-mid) var(--am-ease),
    transform var(--am-mid) var(--am-ease);
}

/* Закручены и стянуты внутрь круга. Поворот обязателен: без него
   цветок не распускается, а наезжает на зрителя. Своя opacity здесь
   занята распуском и с корневой перемножается — это не мешает, потому
   что группа тоже сплющивается в слой до разбавления. */
.am-bloom__petals {
  fill: var(--am-bloom-petal, #0b1017);
  opacity: 0;
  transform: rotate(-26deg) scale(0.62);
  transform-box: view-box;
  transform-origin: 16px 16px;
  transition:
    fill var(--am-mid) var(--am-ease),
    opacity var(--am-mid) var(--am-ease),
    transform var(--am-mid) var(--am-ease);
}

/* Кромка фокуса.

   Кнопка под цветком прямоугольная, а форма у неё — цветок, поэтому
   кольцо по коробке кнопки резало лепестки: синяя окружность проходила
   по живому цветку. Кромка живёт там же, где форма: это тот же путь
   лепестка, развёрнутый на 7 % больше и подложенный под цветок. Наружу
   выходит полоска в пиксель по силуэту, и она совпадает с цветком в
   любой момент распуска — те же переходы, тот же разворот.

   Почему 7 %. Наибольший радиус лепестка — 18 единиц в квадрате 32,
   значит на кнопке 44 пикселя единица равна 1.375 пикселя, а 7 % дают
   1.26 единицы кромки, то есть 1.7 пикселя — столько же, сколько у
   обычной кнопки.

   Почему заливка, а не обводка пути. Обводка пошла бы по каждому
   лепестку отдельно и у основания сошлась бы в центре: пять штрихов
   поперёк сердцевины. Заливка же просто подложена под цветок, и видно
   её только там, где цветок её не закрыл.

   В покое кромка стянута вместе с лепестками (0.62 * 1.07 = 0.6634):
   иначе на первом же кадре распуска она оказалась бы шире цветка.
   Видно её всё равно не раньше, чем включится прозрачность. */
.am-bloom__rim {
  fill: var(--am-accent);
  opacity: 0;
  transform: rotate(-26deg) scale(0.6634);
  transform-box: view-box;
  transform-origin: 16px 16px;
  transition:
    opacity var(--am-mid) var(--am-ease),
    transform var(--am-mid) var(--am-ease);
}

:where(button, a, [role='button']):focus-visible > .am-bloom .am-bloom__rim {
  opacity: 1;
  transform: scale(1.07);
}

/* Хозяину цветка кромка по коробке не нужна: её рисует цветок. Правило
   без `.am-lite`, потому что беда не телевизорная — на компьютере кнопка
   под цветком прямоугольная ровно так же. */
:where(button, a, [role='button']):has(> .am-bloom):focus-visible {
  outline: none;
}

/* Хозяин описан через :where, чтобы правило не перевешивало собственные
   стили кнопки: вес селектора остаётся как у одного класса. */
:where(button, a, [role='button']):hover > .am-bloom .am-bloom__petals,
:where(button, a, [role='button']):focus-visible > .am-bloom .am-bloom__petals {
  opacity: 1;
  transform: none;
}

:where(button, a, [role='button']):hover > .am-bloom .am-bloom__bud,
:where(button, a, [role='button']):focus-visible > .am-bloom .am-bloom__bud {
  transform: scale(0.93);
}

/* Свечение розовым, а не заливка розовым во всю силу: на чистом
   #f5b3c8 белый крестик даёт контраст 1.7:1 и исчезает. */
:where(button, a, [role='button']):hover > .am-bloom,
:where(button, a, [role='button']):focus-visible > .am-bloom {
  filter: drop-shadow(var(--am-bloom-shade, 0 2px 5px var(--am-veil)))
    drop-shadow(0 0 9px rgb(var(--am-sakura-rgb) / 0.45));
}

/* В покое лепестки не крутятся и не растут: остаётся просто
   появление, а общее правило темы гасит его длительность. */
@media (prefers-reduced-motion: reduce) {
  .am-bloom__petals {
    transform: none;
  }
}
</style>
