# Сборка APK

## Порядок

```bash
npm run build:app                                   # интерфейс в dist/app
# переложить вывод в src-tauri/gen/android/app/src/main/assets/
npm run tauri -- android build -t armv7             # APK
```

Сборщик берёт `frontendDist` с диска целиком: залежалый вывод уезжает в APK
молча. После сборки APK стоит вскрыть и проверить метку в `assets/index.html`.

Без пересборки интерфейса: `-c '{"build":{"beforeBuildCommand":""}}'`.

## Разрядность

Приставка 32-разрядная: цель `armv7`, иначе `INSTALL_FAILED_NO_MATCHING_ABIS`.
Разрядность устройства проверяют до сборки:

```bash
adb shell getprop ro.product.cpu.abi
```

## Окружение

Нужны `ANDROID_HOME`, `NDK_HOME` (`…/ndk/30.0.15729638`), а также `ProgramData`,
`APPDATA`, `LOCALAPPDATA`: без них Gradle падает.

## Грабли

- Холодная сборка: `tauri-plugin-*` пишет `android/.tauri/` прямо в реестр
  cargo. Обрыв оставляет `.tauri.stale-*`, и следующий прогон падает с
  `os error 183`. Чистить `.tauri*` надо сразу во всех плагинах, а не по одному.
- После `rm -rf src-tauri/target` остаётся битая ссылка
  `jniLibs/…/libanimori_lib.so` → `os error 5`. Лечение: `rm -rf …/jniLibs`.

## Подпись

`apksigner.bat` из bash и PowerShell молча не работает. Рабочий путь — через
jar:

```bash
java -jar "$ANDROID_HOME/build-tools/35.0.0/lib/apksigner.jar" sign \
  --ks "$HOME/.android/debug.keystore" --ks-key-alias androiddebugkey \
  --ks-pass pass:android --key-pass pass:android app.apk
```

Ключ должен быть постоянным: Android не примет обновление, подписанное другим
ключом.

## Настройки сборки

`gen/android/app/build.gradle.kts`: `minSdk 24`, `targetSdk 36`, номер версии —
из `tauri.properties`. Манифест объявляет `leanback`, баннер и
`touchscreen required=false`. FileProvider (`${applicationId}.fileprovider`) уже
объявлен, его `file_paths` открывает внешний каталог и кэш.

Проект в `gen/android` отслеживается в git и правится руками.

## Выпуск

`.github/workflows/release-tv.yml` запускается по тегу `tv-<версия>` и собирает
два APK — `armv7` и `arm64` — каждый своим прогоном: Rust компилируется под
каждую цель заново. Номер версии берётся из тега и сверяется с `package.json`;
расхождение роняет прогон до сборки. Файлы подписываются ключом из секретов
(`ANIMORI_KEYSTORE_BASE64` и три пароля к нему), проверяются `apksigner verify`
и уходят в релиз под именами `AniMori_<версия>_<abi>.apk`. Имена окончательны:
по ним приложение ищет обновление.

Ключ выпуска постоянен: Android не примет обновление, подписанное другим ключом.
Он лежит в секретах репозитория, эталон — `~/.android/animori-release.keystore`;
копию беречь отдельно. Отладочный ключ остаётся своим.

Прогон можно поднять руками (Run workflow во вкладке Actions): поле `tag` задаёт
номер версии, признак «Пробный прогон» собирает и подписывает оба APK, но
публикацию пропускает — релиз не появляется и тег не создаётся.

Обновление внутри приложения — без `tauri-plugin-updater`. Разбор — в
`ARCHITECTURE.md`, раздел «Обновление».
