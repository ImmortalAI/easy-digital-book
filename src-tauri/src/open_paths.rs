#[cfg(test)]
#[path = "__tests__/open_paths.rs"]
mod tests;

use std::sync::Mutex;

pub struct OpenPathQueue {
    paths: Mutex<Vec<String>>,
}

impl<I, S> From<I> for OpenPathQueue
where
    I: IntoIterator<Item = S>,
    S: Into<String>,
{
    fn from(paths: I) -> Self {
        Self {
            paths: Mutex::new(paths.into_iter().map(Into::into).collect()),
        }
    }
}

impl Default for OpenPathQueue {
    fn default() -> Self {
        Self::from(std::iter::empty::<String>())
    }
}

impl OpenPathQueue {
    pub fn push(&self, path: impl Into<String>) {
        self.paths
            .lock()
            .expect("open path queue poisoned")
            .push(path.into());
    }

    pub fn take(&self) -> Vec<String> {
        std::mem::take(&mut *self.paths.lock().expect("open path queue poisoned"))
    }
}
