import XCTest
@testable import SearchBuddyViews

final class FileWatcherTests: XCTestCase {
    func testNotifiesWhenFileIsReplaced() {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("SearchBuddyWatcher-\(UUID().uuidString)", isDirectory: true)
        let file = directory.appendingPathComponent("current.json")
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try? "first".write(to: file, atomically: true, encoding: .utf8)

        let notified = expectation(description: "file change")
        notified.assertForOverFulfill = false
        let watcher = FileWatcher(handlerQueue: .main) {
            notified.fulfill()
        }
        watcher.watch(directories: [directory])

        let replacement = directory.appendingPathComponent("current.json.tmp")
        try? "second".write(to: replacement, atomically: true, encoding: .utf8)
        _ = try? FileManager.default.replaceItemAt(file, withItemAt: replacement)

        wait(for: [notified], timeout: 3)
        watcher.stop()
        try? FileManager.default.removeItem(at: directory)
    }
}
