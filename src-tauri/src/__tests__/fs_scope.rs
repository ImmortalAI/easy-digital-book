use std::path::{Path, PathBuf};

use tempfile::tempdir;

use crate::fs_scope::{write_file_atomic, CommandError, PathValidator};

fn scoped_temp_path(name: &str) -> PathBuf {
    let dir = tempdir().unwrap();
    let path = dir.path().join(name);
    std::mem::forget(dir);
    path
}

fn scope_with(path: &Path) -> TestValidator {
    TestValidator(vec![path.to_path_buf()])
}

fn empty_scope() -> TestValidator {
    TestValidator(Vec::new())
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
    let candidate = directory
        .path()
        .join(format!(".novel.edb-tmp-{}-0", std::process::id()));
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
fn writes_only_after_injected_scope_validation() {
    let path = scoped_temp_path("dialog.edb");
    let validator = scope_with(&path);
    write_file_atomic(&validator, &path, b"new").unwrap();
    assert_eq!(std::fs::read(path).unwrap(), b"new");
}

#[test]
fn removes_temporary_file_when_replacement_fails() {
    let directory = tempdir().unwrap();
    let path = directory.path().join("novel.edb");
    std::fs::create_dir(&path).unwrap();
    std::fs::write(path.join("keep"), b"keep").unwrap();

    let error = write_file_atomic(&scope_with(&path), &path, b"new").unwrap_err();

    assert_eq!(error.code(), "fs.ioError");
    assert!(!std::fs::read_dir(directory.path())
        .unwrap()
        .any(|entry| entry
            .unwrap()
            .file_name()
            .to_string_lossy()
            .starts_with(".novel.edb-tmp-")));
}

struct TestValidator(Vec<PathBuf>);

impl PathValidator for TestValidator {
    fn validate(&self, path: &Path) -> Result<(), CommandError> {
        if self.0.iter().any(|allowed| allowed == path) {
            Ok(())
        } else {
            Err(CommandError::PermissionDenied {
                path: path.display().to_string(),
            })
        }
    }
}
