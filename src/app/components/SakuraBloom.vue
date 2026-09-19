<script setup lang="ts">
// Подложка круглой кнопки: в покое круг, при наведении и фокусе — сакура. Не border-radius
// (не умеет вогнутые впадины) и не clip-path (Chromium режет по нему попадание курсора и обводку
// фокуса) — поэтому цветок отдельный слой с pointer-events: none. Лепесток сжат в 0.7038, иначе
// соседние захлёстываются на 9°; прозрачность на корневом svg, иначе швы дают пятилучевую звезду.

import { SAKURA_PETAL as PETAL, SAKURA_TURNS as TURNS, sakuraTurn as petalTurn } from '../sakura'
</script>

<template>
  <svg class="am-bloom" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <!-- Кромка фокуса — тот же лепесток, развёрнутый на 7 % больше и подложенный под цветок; почему — в стилях ниже. -->
    <g class="am-bloom__rim">
      <path v-for="turn in TURNS" :key="turn" :d="PETAL" :transform="petalTurn(turn)" />
    </g>
    <circle class="am-bloom__bud" cx="16" cy="16" r="14" />
    <g class="am-bloom__petals">
      <path v-for="turn in TURNS" :key="turn" :d="PETAL" :transform="petalTurn(turn)" />
    </g>
  </svg>
</template>

<!-- Стили нарочно без scoped: цветок должен видеть :hover своего хозяина, а из scoped блока
     до родителя не дотянуться — пришлось бы держать правила в каждой кнопке через :deep(). -->
<style>
.am-bloom {
/* Нависание за край кнопки: лепестки раскрываются шире круга. Считается от размера хозяина:
   2px на круг 28px — цветок 36px в распуске, сами лепестки выходят за viewBox. */
  position: absolute;
  inset: calc(-1 * var(--am-bloom-out, 2px));

/* Клики и наведение остаются у кнопки: иначе курсор попадал бы на выступающий лепесток и терял его вместе с распуском. */
  pointer-events: none;

/* Лепестки доходят до радиуса 18 в квадрате 32 — две единицы наружу. Без этого концы срезало внешним svg. */
  overflow: visible;

/* Разбавление всего слоя разом, а не каждой заливки: почему — в заметке о прозрачности выше. */
  opacity: var(--am-bloom-veil, 0.82);

  filter: drop-shadow(var(--am-bloom-shade, 0 2px 5px var(--am-veil)));
  transition: filter var(--am-mid) var(--am-ease);
}

/* Круг в покое. Под курсором съёживается до сердцевины: в полный рост он заполнит впадины и цветок станет кругом. */
.am-bloom__bud {
  fill: var(--am-bloom-deep, #0b1017);
  transform-box: view-box;
  transform-origin: 16px 16px;
  transition:
    fill var(--am-mid) var(--am-ease),
    transform var(--am-mid) var(--am-ease);
}

/* Закручены и стянуты внутрь круга. Поворот обязателен: без него цветок наезжает на зрителя.
   Своя opacity здесь занята распуском и с корневой перемножается — группа сплющивается в слой до разбавления. */
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

/* Кромка фокуса: кнопка под цветком прямоугольная, и кольцо по её коробке резало лепестки.
   Кромка — тот же путь лепестка, развёрнутый на 7 % и подложенный под цветок. 7 %: радиус лепестка
   18 единиц в квадрате 32, на кнопке 44 px единица 1.375 px, отсюда 1.26 единицы ≈ 1.7 px.
   Заливка, а не обводка (обводка сошлась бы в центре). В покое стянута: 0.62 * 1.07 = 0.6634. */
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

/* Хозяину цветка кромка по коробке не нужна — её рисует цветок. Правило без `.am-lite`:
   беда не телевизорная, на компьютере кнопка под цветком прямоугольная так же. */
:where(button, a, [role='button']):has(> .am-bloom):focus-visible {
  outline: none;
}

/* Хозяин описан через :where, чтобы правило не перевешивало собственные стили кнопки: вес селектора остаётся как у одного класса. */
:where(button, a, [role='button']):hover > .am-bloom .am-bloom__petals,
:where(button, a, [role='button']):focus-visible > .am-bloom .am-bloom__petals {
  opacity: 1;
  transform: none;
}

:where(button, a, [role='button']):hover > .am-bloom .am-bloom__bud,
:where(button, a, [role='button']):focus-visible > .am-bloom .am-bloom__bud {
  transform: scale(0.93);
}

/* Свечение розовым, а не заливка во всю силу: на чистом #f5b3c8 белый крестик даёт контраст 1.7:1 и исчезает. */
:where(button, a, [role='button']):hover > .am-bloom,
:where(button, a, [role='button']):focus-visible > .am-bloom {
  filter: drop-shadow(var(--am-bloom-shade, 0 2px 5px var(--am-veil)))
    drop-shadow(0 0 9px rgb(var(--am-sakura-rgb) / 0.45));
}

/* В покое лепестки не крутятся и не растут: остаётся появление, а общее правило темы гасит его длительность. */
@media (prefers-reduced-motion: reduce) {
  .am-bloom__petals {
    transform: none;
  }
}
</style>
