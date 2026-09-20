use std::path::{Path, PathBuf};

use tempfile::tempdir;

use crate::fs_scope::{write_file_atomic, Scope};

fn scoped_temp_path(name: &str) -> PathBuf {
    let dir = tempdir().unwrap();
    let path = dir.path().join(name);
    std::mem::forget(dir);
    path
}

fn scope_with(path: &Path) -> Scope {
    Scope::from_paths([path.to_path_buf()])
}

fn empty_scope() -> Scope {
    Scope::from_paths([])
}

#[test]
fn atomically_replaces_an_allowed_file() {
    let path = scoped_temp_path("novel.edb");
    std::fs::write(&path, b"old").unwrap();
    write_file_atomic(&scope_with(&path), &path, b"new").unwrap();
    assert_eq!(std::fs::read(path).unwrap(), b"new");
}

#[test]
fn rejects_a_path_not_in_scope() {
    let path = Path::new("/outside.edb");
    assert_eq!(
        write_file_atomic(&empty_scope(), path, b"x")
            .unwrap_err()
            .code(),
        "fs.permissionDenied"
    );
}
