import Foundation

enum FixtureLocator {
    static func directory(from filePath: String = #filePath) -> URL? {
        var dir = URL(fileURLWithPath: filePath)
        for _ in 0..<8 {
            dir.deleteLastPathComponent()
            let fixtures = dir.appendingPathComponent("Fixtures", isDirectory: true)
            let sample = fixtures.appendingPathComponent("current.json")
            if FileManager.default.fileExists(atPath: sample.path) {
                return fixtures
            }
        }
        return nil
    }

    static func url(named name: String) -> URL? {
        directory()?.appendingPathComponent(name)
    }

    static func data(named name: String) throws -> Data {
        guard let url = url(named: name) else {
            throw CocoaError(.fileNoSuchFile)
        }
        return try Data(contentsOf: url)
    }
}
