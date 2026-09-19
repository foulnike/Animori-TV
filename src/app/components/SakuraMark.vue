<script setup lang="ts">
// Малая сакура: тот же лепесток, что у подложки SakuraBloom, но знаком в строке, а не подложкой кнопки.
// Без сердцевины: круг прятал бы пустоту кнопки, а знаку прятать нечего — форму держат впадины между лепестками.
// viewBox с отступом (36.2): лепестки выходят за квадрат 32, а знаку в строке выступать за клетку нельзя.

import { SAKURA_PETAL, SAKURA_TURNS, sakuraTurnMark } from '../sakura'
</script>

<template>
  <svg class="am-sakura" viewBox="-2.1 -2.1 36.2 36.2" aria-hidden="true" focusable="false">
    <path
      v-for="turn in SAKURA_TURNS"
      :key="turn"
      :d="SAKURA_PETAL"
      :transform="sakuraTurnMark(turn)"
    />
  </svg>
</template>

<!-- Стили без scoped: имя am-sakura короткое, но префикс всё равно свой,
     и правил у знака немного. scoped добавил бы хеш без пользы. -->
<style>
/* Размер задаёт тот, кто ставит знак, через --am-sakura-size. Без
   размера знак растягивается во весь блок, и в строке текста это оборачи-
   вается заглавной буквой из 32 единиц — ровно противоположение метке.
   По умолчанию 1em: знак становится соразмерен кеглю текста рядом. */
.am-sakura {
  display: block;
  flex: none;
  width: var(--am-sakura-size, 1em);
  height: var(--am-sakura-size, 1em);
  fill: currentcolor;
}
</style>
