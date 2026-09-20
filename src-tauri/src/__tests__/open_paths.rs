use crate::open_paths::{OpenPathQueue, OPEN_PATHS_EVENT};
use std::sync::Arc;
use std::thread;

#[test]
fn takes_each_pending_open_path_once() {
    let queue = OpenPathQueue::from(["/tmp/a.edb"]);
    assert_eq!(queue.take(), vec!["/tmp/a.edb"]);
    assert!(queue.take().is_empty());
}

#[test]
fn concurrent_drains_deliver_each_path_once() {
    let queue = Arc::new(OpenPathQueue::from(["/tmp/a.edb", "/tmp/b.edb"]));
    let first = Arc::clone(&queue);
    let second = Arc::clone(&queue);
    let first = thread::spawn(move || first.take());
    let second = thread::spawn(move || second.take());
    let mut paths = first.join().unwrap();
    paths.extend(second.join().unwrap());
    paths.sort();
    assert_eq!(paths, vec!["/tmp/a.edb", "/tmp/b.edb"]);
}

#[test]
fn open_paths_event_is_a_wakeup_without_a_payload_contract() {
    assert_eq!(OPEN_PATHS_EVENT, "open-paths");
}
