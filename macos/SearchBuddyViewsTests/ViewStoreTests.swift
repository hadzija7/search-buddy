import XCTest
@testable import SearchBuddyViews

@MainActor
final class ViewStoreTests: XCTestCase {
    func testReloadsMergedViewFromDisk() throws {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("SearchBuddyStore-\(UUID().uuidString)", isDirectory: true)
        let views = directory.appendingPathComponent("views", isDirectory: true)
        try FileManager.default.createDirectory(at: views, withIntermediateDirectories: true)
        let viewURL = views.appendingPathComponent("current.json")
        let prefsURL = directory.appendingPathComponent("preferences.json")

        let prefs = """
        {"layout":"table","theme":{"accent":"#2563EB","density":"compact"}}
        """
        try prefs.write(to: prefsURL, atomically: true, encoding: .utf8)

        let first = """
        {"viewId":"one","title":"First","items":[{"id":"a","name":"Ada"}]}
        """
        try first.write(to: viewURL, atomically: true, encoding: .utf8)

        let store = ViewStore(viewURL: viewURL, preferencesURL: prefsURL)
        store.reload()
        XCTAssertEqual(store.status, .loaded)
        XCTAssertEqual(store.resolved?.title, "First")
        XCTAssertEqual(store.resolved?.layout, .table)
        XCTAssertEqual(store.resolved?.density, .compact)
        XCTAssertEqual(store.resolved?.accentHex, "#2563EB")

        let second = """
        {"viewId":"one","title":"Second","layout":"cards","theme":{"accent":"#111111"},"items":[{"id":"a","name":"Ada"}]}
        """
        try second.write(to: viewURL, atomically: true, encoding: .utf8)
        store.reload()
        XCTAssertEqual(store.resolved?.title, "Second")
        XCTAssertEqual(store.resolved?.layout, .cards)
        XCTAssertEqual(store.resolved?.accentHex, "#111111")
        XCTAssertEqual(store.resolved?.density, .compact)

        try FileManager.default.removeItem(at: directory)
    }

    func testReloadsJobScoutKindsWithoutRestart() throws {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("SearchBuddyJobScout-\(UUID().uuidString)", isDirectory: true)
        let views = directory.appendingPathComponent("views", isDirectory: true)
        try FileManager.default.createDirectory(at: views, withIntermediateDirectories: true)
        let viewURL = views.appendingPathComponent("current.json")
        let prefsURL = directory.appendingPathComponent("preferences.json")

        let companies = try FixtureLocator.data(named: "job-scout.companies.json")
        try companies.write(to: viewURL)

        let store = ViewStore(viewURL: viewURL, preferencesURL: prefsURL)
        store.reload()
        XCTAssertEqual(store.status, .loaded)
        XCTAssertEqual(store.resolved?.kind, .companies)
        XCTAssertEqual(store.resolved?.layout, .cards)
        XCTAssertEqual(store.resolved?.items.first?.id, "company:together.ai")
        XCTAssertEqual(store.resolved?.items.count, 12)

        let opportunities = try FixtureLocator.data(named: "job-scout.opportunities.json")
        try opportunities.write(to: viewURL)
        store.reload()
        XCTAssertEqual(store.resolved?.kind, .opportunities)
        XCTAssertEqual(store.resolved?.layout, .table)
        XCTAssertEqual(store.resolved?.title, "Job Scout Opportunities")
        XCTAssertNil(store.resolved?.items.last?.applicationStatus)

        let people = try FixtureLocator.data(named: "job-scout.people.json")
        try people.write(to: viewURL)
        store.reload()
        XCTAssertEqual(store.resolved?.kind, .people)
        XCTAssertEqual(store.resolved?.layout, .cards)
        XCTAssertNil(store.resolved?.items.last?.email)
        XCTAssertNil(store.resolved?.items.last?.photoURL)

        let generic = try FixtureLocator.data(named: "current.json")
        try generic.write(to: viewURL)
        store.reload()
        XCTAssertEqual(store.resolved?.kind, .generic)
        XCTAssertEqual(store.resolved?.viewId, "sf-community-managers")
        XCTAssertEqual(store.resolved?.items.count, 3)

        try FileManager.default.removeItem(at: directory)
    }
}
