#[cfg(test)]
#[path = "__tests__/fs_scope.rs"]
mod tests;

use std::{
    fs::File,
    io,
    path::{Path, PathBuf},
    thread,
    time::Duration,
};

use serde::Serialize;
use thiserror::Error;

#[derive(Clone, Debug, Default)]
pub struct Scope {
    allowed: Vec<PathBuf>,
}

impl Scope {
    pub fn from_paths(paths: impl IntoIterator<Item = PathBuf>) -> Self {
        Self {
            allowed: paths.into_iter().collect(),
        }
    }

    pub fn validate(&self, path: &Path) -> Result<(), CommandError> {
        if self.allowed.iter().any(|allowed| allowed == path) {
            Ok(())
        } else {
            Err(CommandError::permission_denied(path))
        }
    }
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
}

impl CommandError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::PermissionDenied { .. } => "fs.permissionDenied",
            Self::Io { .. } => "fs.ioError",
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

pub fn write_file_atomic(scope: &Scope, path: &Path, bytes: &[u8]) -> Result<(), CommandError> {
    scope.validate(path)?;
    let temporary = temporary_neighbor(path)?;
    std::fs::write(&temporary, bytes)?;
    File::open(&temporary)?.sync_all()?;
    replace_with_retry(&temporary, path)
}

fn temporary_neighbor(path: &Path) -> Result<PathBuf, CommandError> {
    let name = path
        .file_name()
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "path has no filename"))?;
    Ok(path.with_file_name(format!(".{}.edb-tmp", name.to_string_lossy())))
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
    let path = PathBuf::from(path);
    if !app.fs_scope().is_allowed(&path) {
        return Err(CommandError::permission_denied(&path));
    }
    let temporary = temporary_neighbor(&path)?;
    std::fs::write(&temporary, &bytes)?;
    File::open(&temporary)?.sync_all()?;
    replace_with_retry(&temporary, &path)
}
