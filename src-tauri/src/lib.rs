// Главное окно приложения грузит СВОЮ сборку (dist/app), а не чужой сайт.
//
// Прежде рядом жил запасной вид: настоящий anilist.co со внедрённым бандлом скрипта
// во втором окне (hybrid.rs, пункт 3.7). От этой реализации мы отказались целиком.
// Скрипт уехал в ветку script и остался тем, чем был всегда — юзерскриптом для
// браузера; приложение рисует свои экраны и в чужую страницу больше не заходит.
//
// Вместе с гибридным окном ушли сетевой блокировщик и сторож страницы: потребитель
// у обоих был один, и без чужого сайта им нечего делать.
//
// Метка «main» остаётся у своего окна: на неё ссылается capabilities/default.json.
// Окно создаётся здесь, а не в tauri.conf.json, чтобы способ создания был один
// и виден в одном месте.

use tauri_plugin_log::{RotationStrategy, Target, TargetKind, TimezoneStrategy};
use tauri_plugin_opener::OpenerExt;

// Память геометрии окна: плагин десктопный, см. Cargo.toml.
#[cfg(desktop)]
use tauri_plugin_window_state::StateFlags;

use tauri::{AppHandle, WebviewWindow};
// Окно на телевизоре создаёт активность, а не мы: строитель окна и адрес
// содержимого нужны только там, где окно создаём сами.
#[cfg(desktop)]
use tauri::{WebviewUrl, WebviewWindowBuilder};

// Авторизация окна у прокси. Только Windows: целиком событие WebView2.
// Потребитель теперь один — окно входа в AniList (auth.rs): оно грузит чужую
// страницу, и учётные данные прокси спрашивает у самого движка.
#[cfg(windows)]
mod proxy_auth;

// Пункт 2.2: вход в аккаунт AniList отдельным окном.
mod auth;

// Пункт 2.3: запросы к API из процесса оболочки. Без cfg: запрос из Rust
// одинаков на всех платформах, в отличие от прокси для окна.
mod anilist;

// Пункт 2.5.2: дубль снимка в файл приватного каталога. Без cfg: работа
// с файлом одинакова везде, а на Android она нужнее всего.
mod files;

// Пункт 3.3: выгрузка списка в папку, выбранную человеком. Отдельно от files.rs:
// там служебный каталог и список из трёх имён, здесь чужая папка и родное окно
// выбора. Склад снимка и выгрузка для человека — разные права.
//
// Здесь же сохранение трека темы из карточки: окно выбора папки и запись
// в чужую папку те же, а имя, расширение и вид тела свои, оттого и команды свои.
mod export;

// Пункт П.2: автообновление. На телевизоре обновление ставит сам магазин
// приложений, а проверять latest.json с GitHub и запускать установщик здесь
// нечем вовсе — поэтому модуль существует только на десктопе.
#[cfg(desktop)]
mod updater;

// Прокси для трафика окна. Без cfg сознательно: чтение настроек одинаково везде,
// разница в применении спрятана внутри модуля — на Linux будет внятное
// предупреждение в журнале, а не пропавшая настройка.
mod proxy;

/// Что запоминается между запусками. Не StateFlags::all(): сохранённый VISIBLE даёт
/// запуск без единого окна, а из FULLSCREEN в окне без меню нечем выйти.
/// Флаги общие и на сохранение, и на восстановление: это один параметр плагина.
#[cfg(desktop)]
fn window_state_flags() -> StateFlags {
    StateFlags::SIZE | StateFlags::POSITION | StateFlags::MAXIMIZED
}

/// Перезагружает окно, из которого пришёл вызов. Окно приходит параметром, а не
/// ищется по метке: окон по-прежнему два — своё и окно входа, — и перезагружать
/// надо то, откуда просили.
#[tauri::command]
fn animori_reload(window: WebviewWindow) -> Result<(), String> {
    window.reload().map_err(|e| e.to_string())
}

/// Перезапускает приложение. Нужна там, где перезагрузки страницы мало.
///
/// Прокси окна — ровно такой случай: ключи запуска WebView2 читаются один раз,
/// при создании первого окна, поэтому новый адрес доходит до движка только
/// новым процессом. Перезагрузка страницы обновит разметку, а движок останется
/// с прежним адресом — и человек будет ждать перемен, которых не будет.
///
/// Параметров нет: команда ничего не настраивает, а лишь повторяет запуск
/// с тем, что уже лежит в настройках. Ответа окно не получит: процесс уходит
/// целиком, и обещание invoke в разметке не разрешится никогда.
#[tauri::command]
fn animori_restart(app: AppHandle) -> Result<(), String> {
    log::info!("Перезапуск приложения по просьбе окна");
    app.restart()
}

/// Открывает адрес в браузере по умолчанию. В WebView2 target="_blank" и window.open()
/// превращаются в запрос нового окна, и без обработчика он отбрасывается МОЛЧА:
/// ни окна, ни ошибки, ни события на стороне JS.
///
/// Схема проверяется здесь, а не только в мосте. Прежде причина была прямая: команду
/// мог позвать чужой скрипт из окна с настоящим сайтом. Окна больше нет, а проверка
/// остаётся: команда запускает системное приложение, и такое право проверяется
/// у себя, а не на доверии к вызывающему.
#[tauri::command]
fn animori_open_external(app: AppHandle, url: String) -> Result<(), String> {
    let trimmed = url.trim();

    let lowered = trimmed.to_ascii_lowercase();
    if !(lowered.starts_with("https://") || lowered.starts_with("http://")) {
        return Err(format!("Схема адреса не разрешена: {trimmed}"));
    }

    // None во втором аргументе — «браузер по умолчанию».
    app.opener()
        .open_url(trimmed, None::<&str>)
        .map_err(|e| e.to_string())
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Плагины, которых нет на мобильных платформах, поднимаются отдельной
    // переменной: память геометрии окна (пункт 4.5) и автообновление
    // (пункт П.2) под Android отсутствуют вовсе, см. Cargo.toml.
    //
    // Порядок здесь важен ровно по прежней причине: плагины цепочки Builder
    // поднимаются ДО setup, а окно создаётся внутри него, — память геометрии
    // должна успеть восстановить её к этому моменту.
    #[cfg(desktop)]
    let builder = tauri::Builder::default()
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(window_state_flags())
                .build(),
        )
        .plugin(tauri_plugin_updater::Builder::new().build());

    #[cfg(mobile)]
    let builder = tauri::Builder::default();

    builder
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(anilist::AniListClientState::default())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        // Плагин открывает адреса в системных приложениях и нужен только со стороны Rust:
        // opener:allow-open-url, выданный окну, открыл бы что угодно любому коду в нём.
        .plugin(tauri_plugin_opener::init())
        // Родные окна системы. Потребителей теперь два: автообновление (обоснования —
        // в updater.rs) и выбор папки для выгрузки списка и для трека темы (export.rs).
        // Оба дёргаются только из Rust, и разрешений разметке не выдано сознательно: updater:default
        // означал бы право чужого скрипта запустить загрузку и установку исполняемого
        // файла, а dialog:default — право открывать окна выбора файлов без нашего ведома.
        .plugin(tauri_plugin_dialog::init())
        // Список команд дублируется в build.rs и в файлах capabilities: разрешено
        // ровно то, что перечислено в capability нужного окна. Пропуск любого из трёх мест
        // даёт отказ вида "... not allowed. Plugin not found".
        //
        // Команды из модулей указываются с путём: generate_handler! обращается к функции
        // по имени, и без префикса сборка падает с E0425.
        .invoke_handler(tauri::generate_handler![
            animori_reload,
            animori_restart,
            animori_open_external,
            auth::animori_auth_start,
            auth::animori_auth_submit,
            auth::animori_auth_status,
            auth::animori_auth_logout,
            anilist::animori_anilist_query,
            files::animori_file_read,
            files::animori_file_write,
            export::animori_export_pick_dir,
            export::animori_export_write,
            export::animori_track_pick_dir,
            export::animori_track_write,
            proxy::animori_proxy_status,
            proxy::animori_proxy_probe
        ])
        .setup(|app| {
            let log_level = if cfg!(debug_assertions) {
                log::LevelFilter::Info
            } else {
                log::LevelFilter::Warn
            };

            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log_level)
                    .rotation_strategy(RotationStrategy::KeepOne)
                    .timezone_strategy(TimezoneStrategy::UseLocal)
                    .max_file_size(2_000_000)
                    // Stdout добавлен на время порта под Android TV: журнал
                    // в каталоге логов читается и с компьютера, но только
                    // после остановки приложения, а строки старта нужны сразу.
                    .targets([
                        Target::new(TargetKind::LogDir { file_name: None }),
                        Target::new(TargetKind::Stdout),
                    ])
                    .build(),
            )?;

            // Контрольная строка журнала: если её нет в logs/AniMori.log,
            // значит канал не работает и винить в молчании разметку нельзя.
            log::info!("оболочка: журнал поднят, diag готов");

            // Прокси — СТРОГО до создания первого окна: движок читает аргументы один раз,
            // на первом окне. Первым идёт свое окно, окно входа открывается позже и
            // пользуется тем же окружением. Здесь же заводится ProxyState, без которого
            // animori_proxy_status не ответит.
            proxy::apply_to_webview(app.handle());

            // Свое окно: WebviewUrl::default() — это index.html из frontendDist, то есть
            // наша сборка dist/app. Никаких скриптов инициализации здесь нет: разметка
            // своя, и стили со скриптом приходят из самого index.html.
            //
            // На телевизоре окно создаёт активность, и метка у него та же — «main»:
            // именно её ждут файлы capabilities. Строить второе окно здесь значило
            // бы получить отказ движка на первом же вызове.
            #[cfg(desktop)]
            {
                WebviewWindowBuilder::new(app.handle(), "main", WebviewUrl::default())
                    .title("AniMori")
                    .inner_size(1280.0, 800.0)
                    .min_inner_size(1024.0, 600.0)
                    .resizable(true)
                    .center()
                    .build()?;
            }

            // Проверка обновлений — последним шагом и только фоновой задачей: запрос
            // прямо здесь задержал бы окно на ответ GitHub, а при мёртвой сети — на весь таймаут.
            #[cfg(desktop)]
            updater::spawn_check(app.handle().clone());

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
