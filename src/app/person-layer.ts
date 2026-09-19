// Общий слой окошка человека: открывается из любого места, а не только из состава тайтла.
// Слой, а не состояние компонента: ссылку нажимают и описания, и полки работ; два окошка спорили бы за Escape.
// Своей истории нет: переходы «человек → человек» и кнопка назад живут внутри окошка.

import { shallowRef } from 'vue'

import type { PersonTarget } from '@/api/anilist-person'

/** Кто показан прямо сейчас. `null` — окошка нет. */
export const shownPerson = shallowRef<PersonTarget | null>(null)

/** Зовётся и при открытом окошке: ссылка из описания ведёт на другого человека. */
export function openPerson(target: PersonTarget): void {
  shownPerson.value = target
}

export function closePerson(): void {
  shownPerson.value = null
}
