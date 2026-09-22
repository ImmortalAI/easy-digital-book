#[cfg(test)]
#[path = "__tests__/open_paths.rs"]
mod tests;

use std::sync::Mutex;

/// Wakeup event emitted when one or more paths are available in the queue.
///
/// The event intentionally has no payload. Frontends must register their
/// listener before the initial drain, then invoke `take_pending_open_paths`
/// once after subscribing and again from each event callback. The queue's
/// mutex-backed take operation makes concurrent drains consume each path once,
/// including paths queued before subscription.
pub const OPEN_PATHS_EVENT: &str = "open-paths";

pub struct OpenPathQueue {
    paths: Mutex<Vec<String>>,
}

impl<I, S> From<I> for OpenPathQueue
where
    I: IntoIterator<Item = S>,
    S: Into<String>,
{
    fn from(paths: I) -> Self {
        let queue = Self {
            paths: Mutex::new(Vec::new()),
        };
        for path in paths {
            queue.push(path);
        }
        queue
    }
}

impl Default for OpenPathQueue {
    fn default() -> Self {
        Self::from(std::iter::empty::<String>())
    }
}

impl OpenPathQueue {
    pub fn push(&self, path: impl Into<String>) {
        let mut paths = self.paths.lock().expect("open path queue poisoned");
        let path = path.into();
        if !paths.iter().any(|pending| pending == &path) {
            paths.push(path);
        }
    }

    pub fn take(&self) -> Vec<String> {
        std::mem::take(&mut *self.paths.lock().expect("open path queue poisoned"))
    }
}
