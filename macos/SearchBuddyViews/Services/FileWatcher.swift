import Darwin
import Foundation

final class FileWatcher: @unchecked Sendable {
    private var sources: [DispatchSourceFileSystemObject] = []
    private let queue = DispatchQueue(label: "dev.searchbuddy.filewatcher")
    private let handlerQueue: DispatchQueue
    private let onChange: @Sendable () -> Void

    init(
        handlerQueue: DispatchQueue = .main,
        onChange: @escaping @Sendable () -> Void
    ) {
        self.handlerQueue = handlerQueue
        self.onChange = onChange
    }

    deinit {
        stop()
    }

    func watch(directories: [URL]) {
        stop()
        var seen = Set<String>()
        for directory in directories {
            let path = directory.standardizedFileURL.path
            guard seen.insert(path).inserted else { continue }
            watchDirectory(directory)
        }
    }

    func stop() {
        let existing = sources
        sources.removeAll()
        for source in existing {
            source.cancel()
        }
    }

    private func watchDirectory(_ directory: URL) {
        try? FileManager.default.createDirectory(
            at: directory,
            withIntermediateDirectories: true
        )
        let fd = open(directory.path, O_EVTONLY)
        guard fd >= 0 else { return }

        let source = DispatchSource.makeFileSystemObjectSource(
            fileDescriptor: fd,
            eventMask: [.write, .extend, .attrib, .rename, .delete, .link],
            queue: queue
        )
        source.setEventHandler { [onChange, handlerQueue] in
            handlerQueue.async(execute: onChange)
        }
        source.setCancelHandler {
            close(fd)
        }
        source.resume()
        sources.append(source)
    }
}
