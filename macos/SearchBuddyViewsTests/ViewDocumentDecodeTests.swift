import XCTest
@testable import SearchBuddyViews

final class ViewDocumentDecodeTests: XCTestCase {
    func testDecodesSampleCurrentJSON() throws {
        let data = try FixtureLocator.data(named: "current.json")
        let document = try ViewJSON.decodeDocument(from: data)

        XCTAssertEqual(document.viewId, "sf-community-managers")
        XCTAssertEqual(document.title, "SF Community Managers")
        XCTAssertEqual(document.layout, .cards)
        XCTAssertEqual(document.theme?.accent, "#2563EB")
        XCTAssertEqual(document.theme?.density, .comfortable)
        XCTAssertEqual(document.items.count, 3)
        XCTAssertEqual(document.items.first?.name, "Jordan Hale")
        XCTAssertEqual(document.items.first?.fields?["location"], "South San Francisco")
    }

    func testDecodesSamplePreferencesJSON() throws {
        let data = try FixtureLocator.data(named: "preferences.json")
        let prefs = try ViewJSON.decodePreferences(from: data)

        XCTAssertEqual(prefs.layout, .cards)
        XCTAssertEqual(prefs.theme?.accent, "#2563EB")
        XCTAssertEqual(prefs.fields?.first, "photo")
    }

    func testPayloadOverridesPreferences() {
        let document = ViewDocument(
            viewId: "v1",
            title: "From payload",
            layout: .table,
            theme: ViewTheme(accent: "#111111", density: .compact),
            fields: ["name"],
            items: [ViewItem(id: "1", name: "Ada")]
        )
        let prefs = PreferencesDocument(
            layout: .cards,
            theme: ViewTheme(accent: "#2563EB", density: .comfortable),
            fields: ["photo", "name"]
        )

        let resolved = ResolvedView.merge(document: document, preferences: prefs)
        XCTAssertEqual(resolved.layout, .table)
        XCTAssertEqual(resolved.accentHex, "#111111")
        XCTAssertEqual(resolved.density, .compact)
        XCTAssertEqual(resolved.fields, ["name"])
        XCTAssertEqual(resolved.title, "From payload")
    }

    func testMissingKeysUsePreferencesThenDefaults() {
        let document = ViewDocument(
            viewId: "v2",
            title: "Sparse",
            layout: nil,
            theme: ViewTheme(accent: nil, density: nil),
            fields: nil,
            items: []
        )
        let prefs = PreferencesDocument(
            layout: .table,
            theme: ViewTheme(accent: "#00AA00", density: nil),
            fields: nil
        )

        let resolved = ResolvedView.merge(document: document, preferences: prefs)
        XCTAssertEqual(resolved.layout, .table)
        XCTAssertEqual(resolved.accentHex, "#00AA00")
        XCTAssertEqual(resolved.density, .comfortable)
        XCTAssertEqual(resolved.fields, ViewDefaults.fields)
    }

    func testSearchFiltersNameAndTag() {
        let view = ResolvedView(
            viewId: "v",
            title: "T",
            kind: .generic,
            layout: .cards,
            accentHex: ViewDefaults.accentHex,
            density: .comfortable,
            fields: ["name"],
            items: [
                ViewItem(id: "1", name: "Jordan Hale", tags: ["fintech"]),
                ViewItem(id: "2", name: "Amina Shah", tags: ["design"]),
            ]
        )
        XCTAssertEqual(view.filteredItems(search: "hale").map(\.id), ["1"])
        XCTAssertEqual(view.filteredItems(search: "design").map(\.id), ["2"])
        XCTAssertEqual(view.filteredItems(search: "").count, 2)
    }

    func testDecodesJobScoutCompaniesFixture() throws {
        let data = try FixtureLocator.data(named: "job-scout.companies.json")
        let document = try ViewJSON.decodeDocument(from: data)
        let resolved = ResolvedView.merge(document: document, preferences: nil)

        XCTAssertEqual(document.viewId, "job-scout.companies")
        XCTAssertEqual(resolved.kind, .companies)
        XCTAssertEqual(resolved.layout, .cards)
        XCTAssertEqual(resolved.fields, [
            "name", "website", "careersUrl", "linkedinUrl", "openRolesCount", "source",
        ])
        XCTAssertEqual(document.items.count, 12)
        XCTAssertEqual(document.items[0].id, "company:together.ai")
        XCTAssertEqual(document.items[0].name, "Together AI")
        XCTAssertEqual(document.items[0].website, "https://www.together.ai")
        XCTAssertEqual(document.items[0].careersUrl, "https://job-boards.greenhouse.io/togetherai")
        XCTAssertNil(document.items[0].linkedinUrl)
        XCTAssertNil(document.items[0].openRolesCount)
        XCTAssertEqual(
            document.items[0].resolvedLogoURL,
            "https://logo.clearbit.com/together.ai"
        )
        let lovable = document.items.first { $0.id == "company:lovable.dev" }
        XCTAssertEqual(lovable?.linkedinUrl, "https://www.linkedin.com/company/lovable-dev")
        XCTAssertTrue(resolved.presentsCompanyCards)
    }

    func testDecodesJobScoutOpportunitiesFixture() throws {
        let data = try FixtureLocator.data(named: "job-scout.opportunities.json")
        let document = try ViewJSON.decodeDocument(from: data)
        let resolved = ResolvedView.merge(document: document, preferences: nil)

        XCTAssertEqual(document.viewId, "job-scout.opportunities")
        XCTAssertEqual(resolved.kind, .opportunities)
        XCTAssertEqual(resolved.layout, .table)
        XCTAssertEqual(document.items.count, 2)
        XCTAssertEqual(document.items[0].id, "https://stripe.com/jobs/listing/community-manager/123")
        XCTAssertEqual(document.items[0].name, "Community Manager")
        XCTAssertEqual(document.items[0].title, "Community Manager")
        XCTAssertEqual(document.items[0].applicationStatus, "saved")
        XCTAssertNil(document.items[1].applicationStatus)
        XCTAssertEqual(ItemFieldValue.missingLabel(for: "applicationStatus"), "none")
    }

    func testDecodesJobScoutPeopleFixture() throws {
        let data = try FixtureLocator.data(named: "job-scout.people.json")
        let document = try ViewJSON.decodeDocument(from: data)
        let resolved = ResolvedView.merge(document: document, preferences: nil)

        XCTAssertEqual(document.viewId, "job-scout.people")
        XCTAssertEqual(resolved.kind, .people)
        XCTAssertEqual(resolved.layout, .cards)
        XCTAssertEqual(document.items.count, 2)
        XCTAssertEqual(document.items[0].id, "person:linkedin:priya-mehta")
        XCTAssertEqual(document.items[0].email, "priya@stripe.com")
        XCTAssertEqual(document.items[0].photoURL, "https://picsum.photos/seed/priya-mehta/160")
        XCTAssertEqual(document.items[0].personTier, "hiring_manager")
        XCTAssertEqual(document.items[1].id, "person:email:alex@linear.app")
        XCTAssertNil(document.items[1].email)
        XCTAssertNil(document.items[1].photoURL)
        XCTAssertEqual(ItemFieldValue.missingLabel(for: "email"), "no email")
        XCTAssertEqual(document.items[1].linkedinUrl, "https://www.linkedin.com/in/alex-chen")
    }

    func testDetectsKindFromFieldsWithoutPrefix() {
        XCTAssertEqual(
            ViewKind.detect(viewId: "custom", fields: ["name", "careersUrl", "website"]),
            .companies
        )
        XCTAssertEqual(
            ViewKind.detect(viewId: "custom", fields: ["title", "url", "status"]),
            .opportunities
        )
        XCTAssertEqual(
            ViewKind.detect(viewId: "custom", fields: ["email", "linkedinUrl", "photoUrl"]),
            .people
        )
        XCTAssertEqual(
            ViewKind.detect(viewId: "sf-community-managers", fields: FieldKey.defaults),
            .generic
        )
    }

    func testJobScoutKindDefaultsWhenPayloadOmitsLayoutAndFields() {
        let document = ViewDocument(
            viewId: "job-scout.opportunities",
            title: "Roles",
            layout: nil,
            theme: nil,
            fields: nil,
            items: [ViewItem(id: "https://example.com/job", name: "Engineer")]
        )
        let resolved = ResolvedView.merge(document: document, preferences: nil)
        XCTAssertEqual(resolved.kind, .opportunities)
        XCTAssertEqual(resolved.layout, .table)
        XCTAssertEqual(resolved.fields, ViewKind.opportunities.defaultFields)
    }

    func testJobScoutPayloadFieldsWinOverPreferences() {
        let document = ViewDocument(
            viewId: "job-scout.companies",
            title: "Companies",
            layout: .cards,
            theme: nil,
            fields: ["name", "website"],
            items: [ViewItem(id: "company:stripe", name: "Stripe")]
        )
        let prefs = PreferencesDocument(
            layout: .table,
            theme: ViewTheme(accent: "#2563EB", density: .compact),
            fields: ["photo", "name", "bio"]
        )
        let resolved = ResolvedView.merge(document: document, preferences: prefs)
        XCTAssertEqual(resolved.kind, .companies)
        XCTAssertEqual(resolved.layout, .cards)
        XCTAssertEqual(resolved.fields, ["name", "website"])
        XCTAssertEqual(resolved.density, .compact)
        XCTAssertEqual(resolved.layout, .cards)
    }

    func testCompaniesIgnoreGenericPreferenceTableAndFields() {
        let document = ViewDocument(
            viewId: "job-scout.companies",
            title: "Companies",
            layout: nil,
            theme: nil,
            fields: nil,
            items: [ViewItem(id: "company:lovable", name: "Lovable")]
        )
        let prefs = PreferencesDocument(
            layout: .table,
            theme: ViewTheme(accent: "#2563EB", density: .comfortable),
            fields: ["photo", "name", "bio", "priorities", "xURL", "company", "role"]
        )
        let resolved = ResolvedView.merge(document: document, preferences: prefs)
        XCTAssertEqual(resolved.kind, .companies)
        XCTAssertEqual(resolved.layout, .cards)
        XCTAssertEqual(resolved.fields, ViewKind.companies.defaultFields)
        XCTAssertTrue(resolved.presentsCompanyCards)
    }

    func testDecodesCareersAndLinkedinAliases() throws {
        let json = """
        {
          "viewId": "job-scout.companies",
          "title": "Aliases",
          "layout": "cards",
          "items": [
            {
              "id": "company:acme",
              "name": "Acme",
              "website": "https://acme.com",
              "careers": "https://acme.com/jobs",
              "linkedin": "https://www.linkedin.com/company/acme",
              "logoUrl": "https://example.com/acme.png"
            }
          ]
        }
        """
        let document = try ViewJSON.decodeDocument(from: Data(json.utf8))
        XCTAssertEqual(document.items[0].careersUrl, "https://acme.com/jobs")
        XCTAssertEqual(document.items[0].linkedinUrl, "https://www.linkedin.com/company/acme")
        XCTAssertEqual(document.items[0].logoUrl, "https://example.com/acme.png")
        XCTAssertEqual(document.items[0].resolvedLogoURL, "https://example.com/acme.png")
    }
}
