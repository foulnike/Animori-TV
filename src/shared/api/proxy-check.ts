// Живой запрос через прокси: TCP-щуп в proxy.rs видит лишь приём соединения, а наружу прокси мог не пустить.
// Идёт тем же каналом (Bridge.http), поэтому исход говорит о канале, а не о щупе.
// В net-health исход не идёт: там отказы источников, здесь настройка; одна неудача попала бы в сводку дважды.

import { Bridge } from '@/bridge'

import { Logger } from '../utils/logger'
import { githubLimiter } from './rate-limit'

/**
 * Что читаем. Файл выпуска на GitHub: адрес уже разрешён в capabilities,
 * отдаётся без входа, лежит в репозитории и потому заведомо не пуст.
 */
const CHECK_URL =
  'https://raw.githubusercontent.com/foulnike/AniMori-AniList-Toolkit/main/README.md'

/** Потолок ожидания: проверка идёт по кнопке, и ждать дольше нечего. */
const CHECK_TIMEOUT_MS = 8000

/**
 * Прошёл ли запрос. Вид сбоя не возвращается: о том, что прокси молчит,
 * скажет щуп, а здесь нужен ровно один ответ — ушёл запрос или нет.
 */
export async function proxyLiveCheck(): Promise<boolean> {
  await githubLimiter.acquireSlot()

  try {
    const res = await Bridge.http.request({
      method: 'GET',
      url: CHECK_URL,
      credentials: 'omit',
      timeoutMs: CHECK_TIMEOUT_MS,
    })

    return res.ok
  } catch (e) {
    // Отказ — это исход проверки, а не поломка: о нём и говорит false.
    // В журнал всё же пишем: молчаливый catch запрещён инвариантом 2.
    Logger('WARN', 'Прокси: проверочный запрос не прошёл', e)
    return false
  }
}
