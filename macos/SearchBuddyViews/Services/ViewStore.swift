import Foundation
import SwiftUI

enum ViewLoadStatus: Equatable {
    case missingFile
    case emptyItems
    case loaded
    case decodeError(String)
}

@MainActor
final class ViewStore: ObservableObject {
    @Published private(set) var resolved: ResolvedView?
    @Published private(set) var status: ViewLoadStatus = .missingFile
    @Published var searchText = ""
    @Published private(set) var viewURL: URL
    @Published private(set) var preferencesURL: URL

    private var watcher: FileWatcher?

    init(
        viewURL: URL = AppPaths.defaultViewURL,
        preferencesURL: URL = AppPaths.defaultPreferencesURL
    ) {
        self.viewURL = viewURL
        self.preferencesURL = preferencesURL
    }

    var windowTitle: String {
        resolved?.title ?? "SearchBuddy Views"
    }

    func start() {
        try? AppPaths.ensureDirectories()
        reload()
        startWatching()
    }

    func openView(at url: URL) {
        viewURL = url
        reload()
        startWatching()
    }

    func reload() {
        let preferences = loadPreferences()
        guard FileManager.default.fileExists(atPath: viewURL.path) else {
            resolved = nil
            status = .missingFile
            return
        }
        do {
            let data = try Data(contentsOf: viewURL)
            let document = try ViewJSON.decodeDocument(from: data)
            let merged = ResolvedView.merge(document: document, preferences: preferences)
            ViewJSON.debugDump(document, resolved: merged)
            resolved = merged
            status = merged.items.isEmpty ? .emptyItems : .loaded
        } catch {
            resolved = nil
            status = .decodeError(error.localizedDescription)
        }
    }

    private func startWatching() {
        let watcher = FileWatcher { [weak self] in
            Task { @MainActor in
                self?.reload()
            }
        }
        watcher.watch(directories: [
            viewURL.deletingLastPathComponent(),
            preferencesURL.deletingLastPathComponent(),
        ])
        self.watcher = watcher
    }

    private func loadPreferences() -> PreferencesDocument? {
        guard FileManager.default.fileExists(atPath: preferencesURL.path) else {
            return nil
        }
        do {
            let data = try Data(contentsOf: preferencesURL)
            return try ViewJSON.decodePreferences(from: data)
        } catch {
            return nil
        }
    }
}

extension ViewStore {
    static func previewLoaded() -> ViewStore {
        let store = ViewStore()
        if let data = try? FixtureLocator.data(named: "current.json"),
           let document = try? ViewJSON.decodeDocument(from: data)
        {
            let prefsData = try? FixtureLocator.data(named: "preferences.json")
            let prefs = prefsData.flatMap { try? ViewJSON.decodePreferences(from: $0) }
            store.resolved = ResolvedView.merge(document: document, preferences: prefs)
            store.status = .loaded
        }
        return store
    }

    static func previewEmpty() -> ViewStore {
        let store = ViewStore()
        store.status = .missingFile
        return store
    }

    static func previewFixture(_ name: String) -> ViewStore {
        let store = ViewStore()
        if let data = try? FixtureLocator.data(named: name),
           let document = try? ViewJSON.decodeDocument(from: data)
        {
            store.resolved = ResolvedView.merge(document: document, preferences: nil)
            store.status = document.items.isEmpty ? .emptyItems : .loaded
        }
        return store
    }
}
