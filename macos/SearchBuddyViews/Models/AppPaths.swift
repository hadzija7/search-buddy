import Foundation

enum AppPaths {
    static let supportFolderName = "SearchBuddy"

    static var applicationSupport: URL {
        let root = FileManager.default.urls(
            for: .applicationSupportDirectory,
            in: .userDomainMask
        ).first
            ?? URL(fileURLWithPath: NSHomeDirectory())
                .appendingPathComponent("Library/Application Support")
        return root.appendingPathComponent(supportFolderName, isDirectory: true)
    }

    static var viewsDirectory: URL {
        applicationSupport.appendingPathComponent("views", isDirectory: true)
    }

    static var defaultViewURL: URL {
        viewsDirectory.appendingPathComponent("current.json")
    }

    static var defaultPreferencesURL: URL {
        applicationSupport.appendingPathComponent("preferences.json")
    }

    static func ensureDirectories() throws {
        try FileManager.default.createDirectory(
            at: viewsDirectory,
            withIntermediateDirectories: true
        )
    }
}
