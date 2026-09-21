#[cfg(test)]
#[path = "__tests__/fs_scope.rs"]
mod tests;

use std::{
    fs::{File, OpenOptions},
    io,
    path::{Path, PathBuf},
    thread,
    time::Duration,
};

pub use crate::error::CommandError;

pub trait PathValidator {
    fn validate(&self, path: &Path) -> Result<(), CommandError>;
}

impl PathValidator for tauri::fs::Scope {
    fn validate(&self, path: &Path) -> Result<(), CommandError> {
        if self.is_allowed(path) {
            Ok(())
        } else {
            Err(CommandError::permission_denied(path))
        }
    }
}

/// Trusted Rust-side admission for native-dialog/OS-open handlers.
/// Renderer commands must not expose this helper directly.
#[allow(dead_code)]
pub(crate) fn admit_file(scope: &tauri::fs::Scope, path: &Path) -> Result<(), CommandError> {
    scope.allow_file(path).map_err(|error| CommandError::Scope {
        message: error.to_string(),
    })
}

#[allow(dead_code)]
pub fn write_file_atomic<V: PathValidator>(
    validator: &V,
    path: &Path,
    bytes: &[u8],
) -> Result<(), CommandError> {
    validator.validate(path)?;
    let (temporary, mut file) = temporary_file(path)?;
    let mut result = (|| {
        std::io::Write::write_all(&mut file, bytes)?;
        file.sync_all()?;
        Ok(())
    })();
    // Always close the temporary file before cleanup or rename. This is
    // required for removal on Windows when write or sync fails.
    drop(file);
    if result.is_ok() {
        result = replace_with_retry(&temporary, path);
    }
    if result.is_err() {
        // Best effort only: preserve the original operation error if cleanup
        // itself fails (for example, on a platform holding the file open).
        let _ = std::fs::remove_file(&temporary);
    }
    result
}

fn temporary_file(path: &Path) -> Result<(PathBuf, File), CommandError> {
    let parent = path
        .parent()
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "path has no parent"))?;
    let name = path
        .file_name()
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "path has no filename"))?;
    for attempt in 0..16 {
        let candidate = parent.join(format!(
            ".{}.edb-tmp-{}-{}",
            name.to_string_lossy(),
            std::process::id(),
            attempt
        ));
        match OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&candidate)
        {
            Ok(file) => return Ok((candidate, file)),
            Err(error) if error.kind() == io::ErrorKind::AlreadyExists => continue,
            Err(error) => return Err(error.into()),
        }
    }
    Err(io::Error::new(
        io::ErrorKind::AlreadyExists,
        "could not allocate unique temporary file",
    )
    .into())
}

fn replace_with_retry(temporary: &Path, target: &Path) -> Result<(), CommandError> {
    let attempts = if cfg!(windows) { 5 } else { 1 };
    for attempt in 0..attempts {
        match replace_once(temporary, target) {
            Ok(()) => return Ok(()),
            Err(error)
                if cfg!(windows)
                    && attempt + 1 < attempts
                    && matches!(
                        error.kind(),
                        io::ErrorKind::PermissionDenied | io::ErrorKind::AlreadyExists
                    ) =>
            {
                thread::sleep(Duration::from_millis(20));
            }
            Err(error) => return Err(error.into()),
        }
    }
    unreachable!()
}

#[cfg(not(windows))]
fn replace_once(temporary: &Path, target: &Path) -> io::Result<()> {
    std::fs::rename(temporary, target)
}

#[cfg(windows)]
fn replace_once(temporary: &Path, target: &Path) -> io::Result<()> {
    use std::os::windows::ffi::OsStrExt;

    const MOVEFILE_REPLACE_EXISTING: u32 = 0x1;
    const MOVEFILE_WRITE_THROUGH: u32 = 0x8;

    #[link(name = "kernel32")]
    unsafe extern "system" {
        fn MoveFileExW(
            existing_file_name: *const u16,
            new_file_name: *const u16,
            flags: u32,
        ) -> i32;
    }

    let source: Vec<u16> = temporary.as_os_str().encode_wide().chain([0]).collect();
    let destination: Vec<u16> = target.as_os_str().encode_wide().chain([0]).collect();
    // MoveFileExW with REPLACE_EXISTING performs the destination replacement
    // as one filesystem operation, unlike remove-then-rename on Windows.
    let result = unsafe {
        MoveFileExW(
            source.as_ptr(),
            destination.as_ptr(),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
    };
    if result == 0 {
        Err(io::Error::last_os_error())
    } else {
        Ok(())
    }
}

#[tauri::command(rename = "write_file_atomic")]
pub fn write_file_atomic_command(
    app: tauri::AppHandle,
    path: String,
    bytes: Vec<u8>,
) -> Result<(), CommandError> {
    use tauri_plugin_fs::FsExt;
    write_file_atomic(&app.fs_scope(), Path::new(&path), &bytes)
}
