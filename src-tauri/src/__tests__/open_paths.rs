use crate::open_paths::OpenPathQueue;

#[test]
fn takes_each_pending_open_path_once() {
    let queue = OpenPathQueue::from(["/tmp/a.edb"]);
    assert_eq!(queue.take(), vec!["/tmp/a.edb"]);
    assert!(queue.take().is_empty());
}
