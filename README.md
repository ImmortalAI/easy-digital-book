# easy-digital-book

`easy-digital-book` is a desktop-only open-source editor that turns NovLang
novels into EPUB3 books for Kindle Paperwhite. It supports Windows, macOS 12+
and Ubuntu 22.04-level WebKitGTK. There is no web or mobile version in v1.

## Development

Requirements: Node.js 22+, pnpm 10+, and Rust stable for Tauri builds.

```sh
pnpm install
pnpm dev
pnpm check
pnpm build
```

The project file is a single `.edb` ZIP container. Exported books are `.epub`
files; the app does not send books to Kindle automatically.

## Validation

```sh
pnpm test:coverage
pnpm build:fixture-epubs
pnpm test:e2e
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

`pnpm build:fixture-epubs` requires the pinned epubcheck 5.2.1 JAR and Java
17+. It fails when either is unavailable; required EPUB validation is never
silently skipped. See [the release checklist](docs/release-checklist.md) for
manual checks on all supported desktop targets.

## First launch and releases

Unsigned development/release builds may trigger platform warnings. On macOS,
use **System Settings → Privacy & Security → Open Anyway**. On Windows, use
SmartScreen **More info → Run anyway** only for an artifact obtained from a
trusted release. Release bundles are built by the `v*` GitHub Actions workflow
for universal macOS DMG, Windows NSIS, and Ubuntu 22.04 AppImage/deb/rpm.
Release tags must exactly match the `package.json` version: for example,
version `0.1.0` is released as tag `v0.1.0`. The workflow checks this before
building and includes the matching `CHANGELOG.md` section in the draft notes.

The Tauri application identifier is `com.immortalai.edb`; changing it breaks
recovery data tied to the WebView origin.
