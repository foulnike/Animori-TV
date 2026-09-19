// Контракт платформы: ЧТО умеет среда, но не КАК. Реализация одна — TauriBridge.ts, подставляет её сборка.
// Подсистемы: storage, files, exportFile, http, anilist, clipboard, shell, proxyDiagnostics.

// ==== storage ====

/** Персистентное хранилище ключ-значение: асинхронное всегда, по худшему случаю. */
export interface IStorage {
  /** Ключа нет — defaultValue. */
  get<T>(key: string, defaultValue: T): Promise<T>
  /** Ключа нет — undefined. */
  get<T = unknown>(key: string): Promise<T | undefined>
  /** К моменту разрешения значение обязано быть на диске, а не в отложенной записи. */
  set(key: string, value: unknown): Promise<void>
  /** Дожидается записей, начатых до вызова. Не отклоняется. */
  flush(): Promise<void>
}

// ==== files ====

/**
 * Свои файлы приложения: запасная копия снимка на случай, когда хранилище окна почистили.
 * Имя, а не путь: каталог выбирает реализация.
 */
export interface IFiles {
  /** Есть ли файлы в среде: в браузере false. */
  readonly available: boolean
  /** Нет файла, нет файлов, не читается — везде null. */
  read(name: string): Promise<string | null>
  /** Пишет целиком; не отклоняется: запасная копия не вправе ронять снимок. */
  write(name: string, text: string): Promise<boolean>
}

// ==== выгрузка ====

/**
 * Выгрузка списка файлом и сохранение трека темы: чужая папка, выбранная руками, путь держим в настройках.
 * Отдельно от IFiles: там служебный каталог оболочки, куда человеку не добраться.
 * Умений четыре, а не два: у списка тело текстовое и расширение .xml, у трека — бинарное.
 */
export interface IExport {
  /** Умеет ли среда спрашивать папку: в браузере false. */
  readonly available: boolean
  /** null — человек закрыл окно выбора; отклоняется, только если окно не открылось. */
  pickDir(): Promise<string | null>
  /**
   * Пишет текст файлом и возвращает полный путь: его показывают человеку.
   * Имя — только .xml; отклоняется с внятным текстом, в отличие от IFiles.write.
   */
  write(dir: string, name: string, text: string): Promise<string>
  /**
   * Спрашивает папку для трека; ответ не запоминается — спрашивать каждый раз это требование.
   * Отдельно от pickDir ради заголовка окна. null — отмена.
   */
  pickTrackDir(): Promise<string | null>
  /**
   * Пишет звуковой файл и возвращает полный путь. Тело — base64: в канале до оболочки только строки.
   * Имя — из разрешённых расширений; отклоняется с внятным текстом.
   */
  writeTrack(dir: string, name: string, bytesBase64: string): Promise<string>
}

// ==== http ====

export type HttpMethod = 'GET' | 'POST' | 'HEAD' | 'PUT' | 'DELETE' | 'PATCH'

export interface HttpRequestOptions {
  /** По умолчанию 'GET'. */
  method?: HttpMethod
  /** Абсолютный адрес. Относительные пути не поддерживаются: в Tauri нет origin. */
  url: string
  headers?: Record<string, string>
  /** Тело запроса. Сериализацию выполняет вызывающий код. */
  body?: string
  timeoutMs?: number
  /** По умолчанию 'include', но куки WebView запросу в Rust не видны. */
  credentials?: 'omit' | 'include'
}

export interface HttpResponse {
  status: number
  statusText: string
  /** true для 200-299, как у fetch. */
  ok: boolean
  /** Заголовки: ключи в нижнем регистре. */
  headers: Record<string, string>
  /** Тело текстом; JSON разбирает вызывающий. */
  text: string
  /** Адрес после редиректов. */
  url: string
}

/** Ответ с бинарным телом: байты в base64 — единственный безпотерьный вид для строки IPC. */
export interface HttpBytesResponse {
  status: number
  statusText: string
  /** true для 200-299, как у fetch. */
  ok: boolean
  /** Заголовки: ключи в нижнем регистре. */
  headers: Record<string, string>
  /** Тело байтами в base64. */
  bytesBase64: string
  /** Адрес после редиректов. */
  url: string
}

/** Причина транспортного сбоя. Код ответа сюда не относится. */
export type HttpErrorKind = 'network' | 'timeout' | 'abort'

export class BridgeHttpError extends Error {
  readonly kind: HttpErrorKind
  readonly url: string

  constructor(kind: HttpErrorKind, url: string, message?: string) {
    super(message ?? `Bridge HTTP ${kind} error: ${url}`)
    this.name = 'BridgeHttpError'
    this.kind = kind
    this.url = url
  }
}

export interface IHttp {
  /** Код вне 2xx исключением не является; отклонение — только BridgeHttpError. */
  request(options: HttpRequestOptions): Promise<HttpResponse>
  /** То же, но тело байтами: сжатые файлы и звук текстом не принять. */
  requestBytes(options: HttpRequestOptions): Promise<HttpBytesResponse>
}

// ==== anilist ====

/** Запросы к AniList: адрес и пропуск живут внутри реализации. */
export interface IAniList {
  /**
   * Код вне 2xx исключением не является. `useAuth` — подписать запрос пропуском; сам пропуск наружу не идёт.
   */
  query(body: string, useAuth: boolean): Promise<HttpResponse>
}

// ==== clipboard ====

export interface IClipboard {
  writeText(text: string): Promise<void>
}

// ==== shell ====

/** Операции над окном: то, что WebView не умеет сам. */
export interface IShell {
  /** Промис разрешается после отправки: на код после await положиться нельзя. */
  reload(): Promise<void>
  /**
   * Перезапускает приложение: ключи запуска WebView2 читаются один раз, смена прокси доходит только новым процессом.
   * Ответа нет — процесс уходит целиком.
   */
  restart(): Promise<void>
  /** В WebView2 target="_blank" молча отбрасывается. Только http и https. */
  openExternal(url: string): Promise<void>
}

// ==== proxy diagnostics ====

/**
 * Чем кончилась попытка применить прокси к окну. `applied` не обещает, что трафик ходит.
 * `windowUnsupported` ≠ `unreachable`: адрес отвечает, но передать его окну нечем.
 */
export type ProxyOutcome = 'off' | 'invalid' | 'unreachable' | 'windowUnsupported' | 'applied'

/** `accepted` косвенный: кода ошибки нет, принятие видно по отсутствию повторного запроса. */
export type ProxyAuth = 'none' | 'pending' | 'accepted' | 'rejected'

/** Что случилось с прокси при запуске приложения плюс живой исход авторизации. */
export interface ProxyStatus {
  outcome: ProxyOutcome
  /** Адрес вида `http://127.0.0.1:8080`. Пустая строка, если выключен или негоден. */
  server: string
  /** Задан ли логин. Сам логин и пароль сюда НЕ попадают. */
  hasCredentials: boolean
  /** Собирается на момент вызова: авторизация случается позже снимка запуска. */
  auth: ProxyAuth
}

/** Результат ручной проверки адреса, сохранённого в настройках ПРЯМО СЕЙЧАС. */
export interface ProxyProbe {
  /** Здесь `applied` читается как «адрес годен и отвечает». */
  outcome: ProxyOutcome
  server: string
  reachable: boolean
  /** Сколько миллисекунд заняло соединение. При отказе — время до отказа. */
  latencyMs: number
}

/** Состояние прокси: invoke по инварианту 1 допустим только здесь; в браузере честно `off`. */
export interface IProxyDiagnostics {
  /** Неизменно всё, кроме auth: адрес движок читает один раз. */
  status(): Promise<ProxyStatus>
  /** Проверяет сохранённый адрес — то, что заработает после перезапуска. Недоступный — не ошибка. */
  probe(): Promise<ProxyProbe>
}

// ==== корневой контракт ====

export interface IBridge {
  /** Идентификатор среды для журнала и текстов; ветвиться по нему негде, пока значение одно. */
  readonly platform: 'tauri'
  readonly storage: IStorage
  /** Пункт 2.5.2: запасная копия снимка файлом. В браузере честная заглушка. */
  readonly files: IFiles
  /** Выгрузка списка в папку и сохранение трека; имя с хвостом File, чтобы не путалось с export. */
  readonly exportFile: IExport
  readonly http: IHttp
  /** Пункт 2.3: запросы к AniList. В десктопе идут из Rust вместе с пропуском. */
  readonly anilist: IAniList
  readonly clipboard: IClipboard
  readonly shell: IShell
  readonly proxyDiagnostics: IProxyDiagnostics
}
