use std::{
    path::{Path, PathBuf},
    sync::Mutex,
};

use tempfile::tempdir;

use crate::fs_scope::{admit_file, write_file_atomic, Scope, ScopeAccess};

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

#[cfg(unix)]
#[test]
fn does_not_follow_a_preexisting_temporary_symlink() {
    let directory = tempdir().unwrap();
    let path = directory.path().join("novel.edb");
    let outside = directory.path().join("outside.txt");
    let candidate = directory.path().join(format!(
        ".novel.edb-tmp-{}-0",
        std::process::id()
    ));
    std::fs::write(&outside, b"safe").unwrap();
    std::os::unix::fs::symlink(&outside, &candidate).unwrap();

    write_file_atomic(&scope_with(&path), &path, b"new").unwrap();
    assert_eq!(std::fs::read(&outside).unwrap(), b"safe");
    assert_eq!(std::fs::read(&path).unwrap(), b"new");
}

#[test]
fn rejects_a_path_not_in_scope() {
    let directory = tempdir().unwrap();
    let path = directory.path().join("outside.edb");
    assert_eq!(
        write_file_atomic(&empty_scope(), &path, b"x")
            .unwrap_err()
            .code(),
        "fs.permissionDenied"
    );
    assert!(!std::fs::read_dir(directory.path())
        .unwrap()
        .any(|entry| entry
            .unwrap()
            .file_name()
            .to_string_lossy()
            .starts_with(".outside.edb-tmp-")));
}

#[test]
fn admits_a_dialog_path_through_the_scope_seam() {
    let path = scoped_temp_path("dialog.edb");
    let admitted = Mutex::new(Vec::new());
    admit_file(
        &RecordingScope {
            admitted: &admitted,
        },
        &path,
    )
    .unwrap();
    assert_eq!(admitted.into_inner().unwrap(), vec![path]);
}

struct RecordingScope<'a> {
    admitted: &'a Mutex<Vec<PathBuf>>,
}

impl ScopeAccess for RecordingScope<'_> {
    fn allow_file(&self, path: &Path) -> Result<(), String> {
        self.admitted.lock().unwrap().push(path.to_path_buf());
        Ok(())
    }
}
