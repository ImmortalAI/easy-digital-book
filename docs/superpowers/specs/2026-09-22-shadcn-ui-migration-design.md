# Перевод UI на shadcn-vue и Tabler Icons — спецификация

- **Дата:** 2026-09-22
- **Статус:** дизайн утверждён, implementation plan ещё не написан
- **Источник решений:** брейнсторминг 2026-09-22
- **Базовая спецификация:** `docs/superpowers/specs/2026-09-15-easy-digital-book-design.md`

## 1. Задача и границы

Приложение собрано на Tailwind CSS 4 и shadcn-vue, но из реестра установлен
ровно один компонент — `ui/button/Button.vue`, и он не импортируется нигде.
Вместо библиотеки работают 31 самописный компонент (~2770 строк) и 491 строка
глобального CSS. Диалоги — голые `div` с `fixed inset-0`, без порталов и
фокус-трапа. Иконки — текстовые глифы `📄 ⌕ ⚙ ▸ ▾ + × ↑ ↓ ⚠ ★ ↔ ⌄`.

**Входит в задачу**

- Замена самописных примитивов на компоненты shadcn-vue (стиль `reka-nova`).
- Четыре обёртки над Reka UI там, где в реестре shadcn-vue компонента нет.
- Замена всех текстовых глифов на Tabler Icons + доступные имена кнопок.
- Перенос прикладного CSS из `style.css` в компоненты утилитами Tailwind.
- Оживление тёмной темы: `settings.theme` + переключатель в Настройках.
- Перевод тестов на запросы по ролям и доступным именам.

**Не входит**

- Изменение раскладки главного окна. Вариант «B v2» из базовой спецификации
  (панель активности → сайдбар → исходник/превью) остаётся как есть.
- Новый визуальный язык. Решение пользователя — «свап + причёсывание»:
  приложение остаётся узнаваемым, меняется исполнение, не образ.
- Логика домена: `services/*`, stores и composables — кроме трёх точечных
  изменений: `settings.theme` и новый `use-theme` (§4.3), удаление
  `use-resizable` (§6.2), похудение `stores/notifications` (§7). Полный
  список нетронутого — в §12.
- Веб-шрифты. Приложение офлайновое и десктопное, стек остаётся системным.

## 2. Решения брейнсторминга

| Тема               | Решение                                                                 |
| ------------------ | ----------------------------------------------------------------------- |
| Глубина изменений  | Свап начинки + причёсывание, раскладка B v2 без изменений               |
| Тёмная тема        | Оживить: `system` по умолчанию + переключатель в Настройках             |
| Глобальный CSS     | `style.css` сжимается до токенов и `@layer base`, остальное — в утилиты |
| Тесты              | Перевод на роли и доступные имена (`@testing-library/vue`, Playwright)  |
| `UndoToast`        | На примитив `Toast` из Reka UI, визуал прогресс-бара остаётся свой      |
| `ResizableSplit`   | На `Splitter` из Reka UI (компонент `resizable` из shadcn-vue)          |
| `ExplorerView`     | На примитив `Tree` из Reka UI                                           |
| `AppToolbar`, язык | На примитивы `Toolbar` и `Autocomplete` из Reka UI                      |
| Порядок работ      | Вертикальными срезами, каждый — коммит с зелёным `pnpm check`           |

## 3. Три слоя и откуда что берётся

Слои вложены друг в друга, это не альтернативы:

- **shadcn-vue** — CLI (`node_modules/.bin/shadcn-vue`) и реестр рецептов на
  `shadcn-vue.com`. Копирует исходники в `src/components/ui/`, проект ими
  владеет. Стиль берётся из `components.json`, где стоит `"style":
"reka-nova"`; URL компонента — `/r/styles/reka-nova/<name>.json`.
- **Reka UI** — безголовые примитивы, на которых построен каждый компонент
  shadcn-vue. Уже стоит прямой зависимостью, версия 2.10.4.
- **Tabler Icons** — `@tabler/icons-vue`, в `components.json` объявлено
  `"iconLibrary": "tabler"`.

**32 из 36 примитивов приходят из shadcn-vue:** 31 ставится командой
`shadcn-vue add` (список в §5.1), `button` уже установлен. Четыре пишутся
вручную поверх Reka UI, потому что в индексе реестра (66 позиций) таких
компонентов нет: `toast`, `tree`, `toolbar`, `autocomplete`. Ближайший
родственник для уведомлений в реестре — `sonner`, он не поддерживает паузу
таймера и собственный прогресс-бар, поэтому не подходит (см. §7).

## 4. Токены, шрифты, тема

### 4.1. `style.css`

Файл сжимается до трёх блоков: `@theme inline` с маппингом токенов, `:root`
и `.dark` со значениями, `@layer base`. Прикладные правила (~370 строк,
классы `.editor-shell__*`, `.explorer-chapter`, `.app-toolbar__mode`,
`.warnings-popover__*`, `.status-badge`, `.breadcrumbs`, `.editor-activity`,
`.resizable-split__*`) удаляются по мере того, как их компоненты переезжают
на утилиты. Пустых правил и правил для удалённых классов к концу не остаётся.

Комментарии, объясняющие нетривиальную flex-геометрию панелей, не теряются:
каждый переезжает в шаблон того компонента, чью геометрию объясняет.

### 4.2. Шрифты

`components.json` объявляет `"font": "geist-sans"` и `"fontHeading":
"inter"`, а `style.css` задаёт системный стек. Из-за расхождения CLI будет
подставлять Geist в каждый новый компонент. Системный стек остаётся,
`components.json` приводится к нему.

### 4.3. Тема

- `settings.theme: "light" | "dark" | "system"`, по умолчанию `"system"`.
  Ключ `theme` добавляется в `load()` и `persist()` стора настроек.
- `composables/use-theme.ts` вешает класс `dark` на `document.documentElement`;
  при `"system"` следит за `prefers-color-scheme` через `useMediaQuery`
  из `@vueuse/core` (уже зависимость).
- В `SettingsView` — `select` с иконками `IconSun`, `IconMoon`,
  `IconDeviceDesktop`. Ключи локализации `settings.theme`,
  `settings.themeLight`, `settings.themeDark`, `settings.themeSystem`
  добавляются в `ru.json`, `en.json`, `zh-CN.json`.

Каждый компонент после миграции проверяется в обеих темах.

## 5. Слой примитивов

### 5.1. Из shadcn-vue (`shadcn-vue add`)

`alert`, `alert-dialog`, `aspect-ratio`, `badge`, `breadcrumb`, `card`,
`checkbox`, `collapsible`, `combobox`, `context-menu`, `dialog`, `empty`,
`field`, `input`, `input-group`, `item`, `kbd`, `label`, `number-field`,
`popover`, `progress`, `radio-group`, `resizable`, `scroll-area`, `select`,
`separator`, `spinner`, `switch`, `textarea`, `toggle-group`, `tooltip`.

`button` уже установлен. `combobox` ставится не ради поля языка, а ради его
классов, которые переиспользует `ui/autocomplete` (§5.2).

### 5.2. Написанные вручную поверх Reka UI

| Обёртка           | Примитивы Reka                                                                                          | Классы взяты у |
| ----------------- | ------------------------------------------------------------------------------------------------------- | -------------- |
| `ui/toast`        | `ToastProvider`, `ToastPortal`, `ToastViewport`, `ToastRoot`, `ToastTitle`, `ToastAction`, `ToastClose` | `alert`        |
| `ui/tree`         | `TreeRoot`, `TreeItem`                                                                                  | `item`         |
| `ui/toolbar`      | `ToolbarRoot`, `ToolbarToggleGroup`, `ToolbarToggleItem`, `ToolbarSeparator`                            | `toggle-group` |
| `ui/autocomplete` | `AutocompleteRoot`, `AutocompleteInput`, `AutocompleteContent`, `AutocompleteItem`, `AutocompleteEmpty` | `combobox`     |

`combobox` из реестра построен на примитиве `Combobox` — модель «значение из
списка». Для языка книги это неверно: BCP 47 допускает любой валидный тег, и
поле сегодня не зря сделано нативным `datalist`. У `AutocompleteRootProps`
`modelValue` — свободная строка, список только подсказывает.

Обёртки лежат в `src/components/ui/` ради единого пути импорта, и весь
каталог форматируется наравне с остальным кодом: `ignorePatterns` из
`.oxfmtrc.json` удалён. Прежнее правило («Oxfmt не форматирует
`src/components/ui/**`, чтобы сохранять минимальный diff с реестром» —
секция 1 базовой спецификации) **отменено**: в проекте не остаётся кода,
который не проходит `pnpm format:check`.

Цена решения: скопированные CLI компоненты приводятся к стилю проекта
(двойные кавычки, точки с запятой, перенос длинных строк), поэтому при
обновлении компонента из реестра diff будет включать переформатирование.
Дифф против реестра всё равно перестаёт быть чистым в тот момент, когда
файл правят руками, а правят их в этой задаче часто.

Каждая ручная обёртка получает комментарий-шапку «написано вручную, не
перезаписывать CLI shadcn-vue». Oxlint проверяет каталог как и раньше.

## 6. Геометрия

`ResizableSplit` переезжает на `SplitterGroup` / `SplitterPanel` /
`SplitterResizeHandle` (компонент `resizable` из shadcn-vue — обёртка именно
над ними: в его зависимостях `reka-ui` и `@vueuse/core`).

### 6.1. Структура

- Панель активности (48 px) остаётся **вне** группы: её размер не меняется.
- Внешняя группа `direction="horizontal"`: сайдбар (`order 1`) и контент
  (`order 2`). Условно отрисованные панели обязаны иметь `order`.
- Внутри контента — вложенная группа: исходник и превью.

### 6.2. Единицы и констрейнты

Внутри Splitter всегда работает в процентах и конвертирует px-констрейнты
сам (`convertPanelConstraintsToPercent`); событие `layout` отдаёт значения
**в единицах каждой панели** (`convertLayoutToNativeUnits`). Отсюда:

- **Сайдбар:** `sizeUnit="px"`, `minSize=160`, `maxSize=400`,
  `defaultSize=layout.sidebarWidth`. Хранимый формат уже пиксельный,
  конвертация не нужна.
- **Исходник и превью:** `sizeUnit="%"`, `defaultSize=splitRatio × 100`,
  `minSize` вычисляется реактивно из ширины вложенной группы — то есть
  контентной области без панели активности и сайдбара, измеренной через
  `useElementSize`, — как `min(50, PANE_MIN / width × 100)`. Потолок в 50 %
  нужен на случай, когда окно уже двух минимумов: иначе обе панели
  потребовали бы больше половины. Событие `layout` возвращает проценты,
  `splitRatio = val[0] / 100`.

Доля хранится именно долей, а не пикселями: она переживает изменение размера
окна, пиксели — нет.

Константы `SIDEBAR_MIN = 160`, `SIDEBAR_MAX = 400`, `PANE_MIN = 240`
сохраняют значения и переезжают в пропсы панелей. `clampSidebarWidth`,
`clampSplitRatio`, `resizePane` и `useResizable` удаляются вместе с
`composables/__tests__/use-resizable.test.ts`: констрейнты теперь
обеспечивает библиотека.

### 6.3. Режимы и персист

- Режимы Текст и Превью **сворачивают** вторую панель через `collapse()`
  (`collapsible`, `collapsedSize=0`), а не размонтируют её. Это обязательно:
  секция 4a базовой спецификации требует, чтобы iframe превью создавался
  один раз, — `v-if` уничтожил бы его вместе с blob-кэшем изображений.
  `SplitterPanel` отдаёт `collapse()`, `expand()`, `resize()`, `isCollapsed`,
  `isExpanded` и события `@resize` / `@collapse` / `@expand`.
- Ручка между исходником и превью скрывается вне режима Сплит.
- Двойной клик по ручке вызывает `resize(50)` — поведение «вернуть 50/50».
- `autoSaveId` не используется: он пишет в `localStorage`, а настройки живут
  в сторе Tauri. Персист идёт через `@layout` → `layout` store →
  `layout.persist()`, как сейчас.

### 6.4. Что это чинит

Сегодня ручки — это `<button aria-label="Resize sidebar">` с единственным
`pointerdown`: с клавиатуры панели не двигаются вообще, а роль `button` врёт
скринридеру про то, что это разделитель. Splitter даёт `role="separator"` с
`aria-valuenow` и изменение размера стрелками (`keyboardResizeBy`).

## 7. Уведомления

`ToastStack` и `UndoToast` переезжают на Reka `Toast`.

Причина: `ToastViewport` уже слушает `blur`, `focus`, `focusin`, `focusout`,
`pointermove`, `pointerleave`, а `ToastRootImpl` эмитит `pause` и `resume`.
Связка `useDocumentVisibility` + `useWindowFocus` + `computed(paused)` в
нашем компоненте — ручная реализация того, что в примитиве есть.

Приезжают: регион `aria-live` с корректным порядком объявления, F8 для
перехода к уведомлениям, свайп для закрытия, управление фокусом.

Остаётся своим: прогресс-бар оставшегося времени со светящейся точкой на
конце, bounce на входе и выходе, `prefers-reduced-motion` → простое
затухание, стопка до трёх — всё, что описано в секции 4b базовой
спецификации. Анимация вешается на `data-state` от `ToastRoot`, пауза — на
события `pause` / `resume`.

`stores/notifications.ts` теряет то, чем теперь ведает примитив: срок жизни
уведомления (`duration`) переезжает в проп `ToastRoot`, а очередь и предел в
три штуки — в `ToastProvider` и `ToastViewport`. Стор остаётся источником
списка уведомлений и действий отмены.

Побочный эффект: в CSS есть `.undo-toast--exit` с анимацией выхода, но
шаблон её никогда не выставляет — анимация мертва. `data-state="closed"`
её оживляет.

## 8. Карта замен

| Сейчас                                   | Станет                                                            |
| ---------------------------------------- | ----------------------------------------------------------------- |
| `ConfirmDialog`, `UnsavedChangesDialog`  | `alert-dialog`                                                    |
| `ErrorDetailsDialog`                     | `dialog` + `scroll-area`                                          |
| `ExportDialog` (170 строк со своим CSS)  | `dialog` + `field` + `select` + `checkbox` + `progress` + `alert` |
| `ContextMenu` (свой HTML, координаты)    | `context-menu`                                                    |
| `ExplorerSection` (`▸`/`▾`)              | `ui/tree` + `collapsible`                                         |
| `ChapterItem`, `ImageItem`               | `ui/tree` + `item` + `badge` + иконочные `button`                 |
| `SearchResultItem`                       | `item` + иконочные `button`                                       |
| `ActivityBar` (`📄 ⌕ ⚙`)                 | `toggle-group` + `tooltip`                                        |
| `AppToolbar` (Текст/Сплит/Превью)        | `ui/toolbar` + `kbd`                                              |
| `ResizableSplit`                         | `resizable` (см. §6)                                              |
| `Breadcrumbs` (строка с `›`)             | `breadcrumb`                                                      |
| `StatusBadge`, счётчики глав             | `badge`                                                           |
| `WarningsPopover`                        | `popover` + `badge` + `scroll-area`                               |
| `LanguageCombobox` (нативный `datalist`) | `ui/autocomplete`                                                 |
| `MetadataForm`                           | `field` + `input` + `textarea` + `number-field` + `separator`     |
| `ContributorsList` (`↑ ↓ ×`)             | строки `field` + иконочные кнопки                                 |
| `CoverPicker`                            | `card` + `aspect-ratio` + `empty` (зона drop)                     |
| `SettingsView`                           | `card` + `radio-group` + `switch` + `select` + тема (§4.3)        |
| `SearchView` (`⌄`, `Aa`, `.*`)           | `input-group` + `toggle-group` + `collapsible`                    |
| `WelcomeView`                            | `card` + `item`                                                   |
| `ToastStack`, `UndoToast`                | `ui/toast` (см. §7)                                               |
| Баннер «проблемы при открытии»           | `alert`                                                           |
| Плашка обновления в `App.vue`            | `alert`                                                           |
| `.editor-shell__dialog-backdrop`         | удаляется: оверлей и портал внутри `dialog` / `alert-dialog`      |

## 9. Иконки и доступные имена

Все текстовые глифы заменяются на Tabler Icons: `+` → `IconPlus`, `×` →
`IconX`, `↑`/`↓` → `IconArrowUp`/`IconArrowDown`, `▸`/`▾` →
`IconChevronRight` (поворот по `data-state`), `⚠` → `IconAlertTriangle`,
`★` → `IconStar`, `↔` → `IconReplace`, `⌄` → `IconChevronDown`, `⚙` →
`IconSettings`, `📄` → `IconFiles`, `⌕` → `IconSearch`.

Каждая иконочная кнопка получает `tooltip` и доступное имя. Сегодня у
кнопок `+` и `×` в `ChapterItem`, `ExplorerView` и `ContributorsList`
доступного имени нет вовсе — скринридер читает их как «плюс» и «крестик».
Имена добавляются в файлы локализации всех трёх языков.

Декоративные иконки внутри кнопок с текстом получают `aria-hidden="true"`.

## 10. Тесты

### 10.1. Новая зависимость

`@vue/test-utils` не вычисляет доступные имена, поэтому в devDependencies
добавляется `@testing-library/vue`. Это не удобство, а требование выбранной
стратегии: запрос по роли не найдёт кнопку без доступного имени, то есть
тест сам заставит эти имена появиться.

Второй довод: после миграции диалоги рендерятся через `Teleport` в `body`,
и `wrapper.find()` их не видит. Запросы `screen.*` смотрят в `document.body`
по умолчанию.

Playwright умеет `getByRole` сам, новых зависимостей для e2e не нужно.

### 10.2. Барьер

До первой миграции `e2e/layout.spec.ts` переписывается с классов на
структурные `data-*` якоря и дальше **не меняется** до конца работ. Он
измеряет реальную геометрию и остаётся неподвижной точкой отсчёта, пока
вокруг меняется всё остальное.

Якоря: существующие `data-pane`, `data-resizable-split`, `data-activity-bar`
плюс новые `data-shell`, `data-shell-body`, `data-sidebar`,
`data-single-pane`, `data-single-pane-content`, `data-settings-view`.

Правило на будущее: **роли — для интерактивных элементов, `data-*` — для
геометрии.** Ролью «панель превью» не выразить, у неё нет интерактивной
семантики.

### 10.3. Порядок внутри среза

В каждом срезе тесты переписываются тем же коммитом, что и компонент. Чтобы
переписывание не превратилось в подгонку под новую реализацию, порядок такой:
сначала прогоняется старый тест на старом компоненте, затем новый тест
формулируется в терминах того же наблюдаемого поведения, и только потом
меняется компонент. Проверяемое поведение до и после совпадает; меняется
только способ найти элемент.

Существующие ~48 `data-*` хуков удаляются вместе с тестами, которые их
используют, кроме структурных из §10.2.

## 11. Порядок работ

Каждый срез — отдельный коммит с зелёным `pnpm check` и проходящими e2e.

**Срез 0 — фундамент.** `shadcn-vue add` 31 компонента; четыре обёртки
(§5.2); токены, шрифты и тема (§4); `@testing-library/vue` в
devDependencies; барьер `layout.spec.ts` (§10.2).

**Срез 1 — геометрия.** `ResizableSplit` → Splitter (§6). Идёт рано:
барьер уже стоит, остальное ещё старое, откат дешёвый, а дальнейшие срезы
сразу работают внутри финальной раскладки.

**Срез 2 — диалоги.** `ConfirmDialog`, `UnsavedChangesDialog`,
`ErrorDetailsDialog`, `ExportDialog`; удаление
`.editor-shell__dialog-backdrop` из `App.vue` и `EditorView.vue`.

**Срез 3 — сайдбар.** `ActivityBar`, `ExplorerView` → `ui/tree`,
`ContextMenu` → `context-menu`, `SearchView`, `SearchResultItem`.

**Срез 4 — формы.** `MetadataForm`, `ContributorsList`, `CoverPicker`,
`LanguageCombobox` → `ui/autocomplete`, `SettingsView` с переключателем
темы, `WelcomeView`.

**Срез 5 — хром редактора.** `AppToolbar` → `ui/toolbar`, `Breadcrumbs`,
`WarningsPopover`, `StatusBadge`, два баннера → `alert`.

**Срез 6 — уведомления.** `ToastStack`, `UndoToast` → `ui/toast` (§7).

**Срез 7 — зачистка.** Остатки `style.css` до токенов и `@layer base`;
аудит иконок и доступных имён по всем трём локалям; проверка каждого экрана
в светлой и тёмной теме; финальный `pnpm check` + `pnpm test:e2e`.

## 12. Что остаётся самописным

Здесь примитивов нет и быть не может — это доменная логика, а не UI-паттерны:

- `SourceEditor`, `CssEditor` — CodeMirror 6 со своим `StreamLanguage` и
  `Map<chapterId, EditorState>`.
- `PreviewPane` — iframe с CSP в `srcdoc`, blob-кэш изображений,
  пропорциональная синхронизация прокрутки.
- Перестановка глав drag&drop и Alt+↑/↓ — поверх roving focus от `Tree`.
- Зона drop в `CoverPicker` и blob-кэш превью обложки в `MetadataForm`.
- Визуал прогресс-бара уведомления (§7).
- `services/*`, `stores/*` кроме `settings.theme`, `utils/*`.

## 13. Риски

| Риск                                                        | Как снимаем                                                                         |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Перенос всего CSS в утилиты ломает высоты панелей незаметно | Барьер §10.2 стоит до первой миграции и не меняется; срез 1 идёт вторым             |
| Переписывание тестов маскирует регрессию                    | Порядок §10.3: поведение фиксируется до замены компонента                           |
| `Tree` конфликтует с drag&drop и Alt+↑/↓                    | Перестановка остаётся нашим обработчиком поверх roving focus; проверяется в срезе 3 |
| Splitter уничтожает iframe превью при смене режима          | Режимы через `collapse()`, а не `v-if` (§6.3); проверяется e2e на blob-кэш          |
| Порталы ломают юнит-тесты диалогов                          | `@testing-library/vue` и запросы в `document.body` (§10.1)                          |
| CLI перезаписывает четыре ручные обёртки                    | Комментарий-шапка в каждой (§5.2) и примечание §14                                  |
| Потеря комментариев, объясняющих flex-геометрию             | Каждый переезжает в шаблон своего компонента (§4.1)                                 |

## 14. Примечания на будущее

`ui/toast`, `ui/tree`, `ui/toolbar` и `ui/autocomplete` написаны вручную
только потому, что на 2026-09-22 в реестре shadcn-vue нет соответствующих
компонентов. Когда они там появятся, эти четыре файла становятся кандидатами
на замену через `shadcn-vue add`. Проверять при обновлении shadcn-vue.

`sonner` из реестра не подходит для `UndoToast` не по стилю, а по поведению:
он не даёт ни паузы таймера, ни точки подключения для собственного
прогресс-бара. Это решение не пересматривать без изменения секции 4b базовой
спецификации.
