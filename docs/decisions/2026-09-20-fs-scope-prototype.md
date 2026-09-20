# Filesystem scope and atomic-write prototype

## Decision

The frontend never receives an unrestricted filesystem API. A Rust-side
`admit_file_path` command admits a path supplied by a native dialog or OS-open
event with the real Tauri `fs_scope().allow_file` API; persisted-scope observes
that admission. `write_file_atomic` then checks the path against the Tauri `fs`
scope, securely creates a unique sibling temporary file with `create_new`,
writes through its open handle, calls `sync_all`, and atomically renames it over
the target. Windows sharing violations are retried five times with a 20 ms
bound between attempts. Command failures serialize as
`{ "code": "…", "message": "…" }`.

`tauri-plugin-fs` is initialized before `tauri-plugin-persisted-scope` because
the persisted-scope plugin restores and listens to the fs scope. This ordering
is required by the plugin itself; persisted scope is ready before commands can
run. Only `fs:allow-read-file` and `fs:allow-write-file` are granted to the
main window.

## Versions and verification

- `tauri-plugin-fs` 2.5.2
- `tauri-plugin-persisted-scope` 2.3.8
- Tauri 2.11.5
- `thiserror` 2.0.20
- `tempfile` 3.27.0

RED: `cargo test --manifest-path src-tauri/Cargo.toml fs_scope` failed to
compile because `Scope` and `write_file_atomic` did not exist.

GREEN: the same command passed with 2 tests:
`atomically_replaces_an_allowed_file` and `rejects_a_path_not_in_scope`.

The development application compiled and was produced by:

```text
pnpm tauri build --debug
```

The macOS `.app` was built. The subsequent `.dmg` bundling step failed because
the host bundler could not run `bundle_dmg.sh`; this is a packaging-host issue,
not a Rust compilation failure.

## Release-blocking manual matrix

The current host is macOS only, so no cross-platform evidence is invented.
Run each exact sequence on a native host and attach the output/log to the
release validation record. Every row must prove both `scope validates custom
command` and persistence after restart, using a path selected by the native
dialog and a path supplied by an OS-open launch argument.

### macOS

```text
pnpm tauri dev
pnpm tauri build --debug
open src-tauri/target/debug/bundle/macos/easy-digital-book.app --args /tmp/dialog-selected.edb
# restart the app, then repeat with /tmp/os-open.edb as the launch argument
```

### Windows (PowerShell)

```text
pnpm tauri dev
pnpm tauri build --debug
& .\src-tauri\target\debug\easy-digital-book.exe C:\Users\Public\dialog-selected.edb
# restart the app, then repeat with C:\Users\Public\os-open.edb
```

### Ubuntu 22.04

```text
pnpm tauri dev
pnpm tauri build --debug
./src-tauri/target/debug/easy-digital-book /tmp/dialog-selected.edb
# restart the app, then repeat with /tmp/os-open.edb
```

For each platform, perform these as separate checks:

1. Start the app with the development command, use the native open/save dialog
   to select `dialog-selected.edb`, invoke the Rust `admit_file_path` command,
   then invoke `write_file_atomic`; expect the custom command to succeed.
2. Quit and restart the app. Invoke `write_file_atomic` for the same selected
   path without re-admitting it; expect success, proving persisted scope.
3. Launch a fresh process with the OS-open argument shown above (`os-open.edb`),
   then invoke `write_file_atomic`; expect success. Restart once more and
   repeat the write to prove the OS-open admission is persisted.

These native-dialog, OS-open, and restart sequences are release-blocking
checklist entries. Platform-specific scope behavior remains a release
validation concern until all rows have evidence.

## Self-review and concerns

- Scope admission is mandatory in the Rust command; an out-of-scope path is
  rejected before any file operation.
- Temporary files are siblings, synced before replacement, and never exposed
  through the frontend.
- The unit-test helper uses an explicit allowlist to exercise the same atomic
  writer without requiring a Tauri runtime.
- The bundled `.dmg` failure is unresolved on this host and must be rerun on a
  packaging-capable macOS runner.
