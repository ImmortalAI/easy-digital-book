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

use serde::Serialize;
use thiserror::Error;

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

#[derive(Debug, Error)]
pub enum CommandError {
    #[error("path is not in the filesystem scope: {path}")]
    PermissionDenied { path: String },
    #[error("filesystem operation failed: {source}")]
    Io {
        #[source]
        source: io::Error,
    },
    #[error("filesystem scope operation failed: {message}")]
    #[allow(dead_code)]
    Scope { message: String },
}

impl CommandError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::PermissionDenied { .. } => "fs.permissionDenied",
            Self::Io { .. } => "fs.ioError",
            Self::Scope { .. } => "fs.scopeError",
        }
    }

    fn permission_denied(path: &Path) -> Self {
        Self::PermissionDenied {
            path: path.display().to_string(),
        }
    }
}

impl Serialize for CommandError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        #[derive(Serialize)]
        struct Wire<'a> {
            code: &'a str,
            message: String,
        }
        Wire {
            code: self.code(),
            message: self.to_string(),
        }
        .serialize(serializer)
    }
}

impl From<io::Error> for CommandError {
    fn from(source: io::Error) -> Self {
        Self::Io { source }
    }
}

#[allow(dead_code)]
pub fn write_file_atomic<V: PathValidator>(
    validator: &V,
    path: &Path,
    bytes: &[u8],
) -> Result<(), CommandError> {
    validator.validate(path)?;
    let (temporary, mut file) = temporary_file(path)?;
    std::io::Write::write_all(&mut file, bytes)?;
    file.sync_all()?;
    replace_with_retry(&temporary, path)
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
        match std::fs::rename(temporary, target) {
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

#[tauri::command(rename = "write_file_atomic")]
pub fn write_file_atomic_command(
    app: tauri::AppHandle,
    path: String,
    bytes: Vec<u8>,
) -> Result<(), CommandError> {
    use tauri_plugin_fs::FsExt;
    write_file_atomic(&app.fs_scope(), Path::new(&path), &bytes)
}
