import Foundation
import SwiftUI

enum ViewLayout: String, Codable, CaseIterable, Sendable {
    case cards
    case table
}

enum ViewDensity: String, Codable, CaseIterable, Sendable {
    case comfortable
    case compact
}

enum ViewKind: String, Equatable, Sendable {
    case generic
    case companies
    case opportunities
    case people

    var defaultLayout: ViewLayout {
        switch self {
        case .opportunities: return .table
        case .generic, .companies, .people: return .cards
        }
    }

    var defaultFields: [String] {
        switch self {
        case .generic:
            return FieldKey.defaults
        case .companies:
            return [
                "name", "website", "careersUrl", "linkedinUrl", "openRolesCount", "source",
            ]
        case .opportunities:
            return [
                "title", "company", "location", "status", "applicationStatus",
                "source", "rank", "why", "url",
            ]
        case .people:
            return [
                "name", "role", "company", "linkedinUrl", "email", "photoUrl",
                "why", "relatedJobUrl",
            ]
        }
    }

    static func detect(viewId: String, fields: [String]?) -> ViewKind {
        let id = viewId.lowercased()
        if id.hasPrefix("job-scout.companies") { return .companies }
        if id.hasPrefix("job-scout.opportunities") { return .opportunities }
        if id.hasPrefix("job-scout.people") { return .people }

        let set = Set(fields ?? [])
        if set.contains("openRolesCount")
            || ((set.contains("careersUrl") || set.contains("careers")) && set.contains("website"))
        {
            return .companies
        }
        if set.contains("applicationStatus")
            || (set.contains("title") && set.contains("url") && set.contains("status"))
        {
            return .opportunities
        }
        if set.contains("relatedJobUrl")
            || (set.contains("email") && set.contains("linkedinUrl") && set.contains("photoUrl"))
        {
            return .people
        }
        return .generic
    }
}

struct ViewTheme: Codable, Equatable, Sendable {
    var accent: String?
    var density: ViewDensity?
}

struct ViewItem: Equatable, Identifiable, Sendable {
    var id: String
    var name: String
    var photoURL: String? = nil
    var bio: String? = nil
    var priorities: [String]? = nil
    var xURL: String? = nil
    var company: String? = nil
    var role: String? = nil
    var tags: [String]? = nil
    var fields: [String: String]? = nil
    var website: String? = nil
    var careersUrl: String? = nil
    var linkedinUrl: String? = nil
    var openRolesCount: Int? = nil
    var source: String? = nil
    var title: String? = nil
    var location: String? = nil
    var status: String? = nil
    var applicationStatus: String? = nil
    var rank: Int? = nil
    var why: String? = nil
    var url: String? = nil
    var email: String? = nil
    var relatedJobUrl: String? = nil
    var logoUrl: String? = nil

    var displayName: String {
        if !name.isEmpty { return name }
        return title ?? ""
    }

    var personTier: String? {
        fields?["tier"]
    }

    var applyURL: String? {
        ItemFieldValue.url(self, field: "url") ?? (id.hasPrefix("http") ? id : nil)
    }

    var resolvedLogoURL: String? {
        if let logoUrl, !logoUrl.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return logoUrl
        }
        return Self.clearbitLogoURL(from: website ?? careersUrl)
    }

    static func clearbitLogoURL(from website: String?) -> String? {
        guard let website, let host = URL(string: website)?.host, !host.isEmpty else {
            return nil
        }
        let trimmed = host.hasPrefix("www.") ? String(host.dropFirst(4)) : host
        return "https://logo.clearbit.com/\(trimmed)"
    }
}

struct ViewDocument: Codable, Equatable, Sendable {
    var viewId: String
    var title: String
    var layout: ViewLayout?
    var theme: ViewTheme?
    var fields: [String]?
    var items: [ViewItem]
}

struct PreferencesDocument: Codable, Equatable, Sendable {
    var layout: ViewLayout?
    var theme: ViewTheme?
    var fields: [String]?
}

enum FieldKey {
    static let builtins = [
        "photo", "photoUrl", "photoURL", "name", "title", "bio", "priorities", "xURL",
        "company", "role", "website", "careersUrl", "linkedinUrl", "openRolesCount",
        "source", "location", "status", "applicationStatus", "rank", "why", "url",
        "email", "relatedJobUrl", "tier", "logoUrl", "logo",
        "careers", "linkedin",
    ]
    static let defaults = [
        "photo", "name", "bio", "priorities", "xURL", "company", "role",
    ]
    static let photoAliases = ["photo", "photoUrl", "photoURL"]
    static let nameAliases = ["name", "title"]
    static let linkFields = [
        "website", "careersUrl", "careers", "linkedinUrl", "linkedin",
        "url", "relatedJobUrl", "xURL",
    ]

    static func displayName(_ field: String) -> String {
        switch field {
        case "photo", "photoUrl", "photoURL": return "Photo"
        case "name": return "Name"
        case "title": return "Title"
        case "bio": return "Bio"
        case "priorities": return "Priorities"
        case "xURL": return "X"
        case "company": return "Company"
        case "role": return "Role"
        case "website": return "Website"
        case "careersUrl": return "Careers"
        case "linkedinUrl": return "LinkedIn"
        case "openRolesCount": return "Open roles"
        case "source": return "Source"
        case "location": return "Location"
        case "status": return "Status"
        case "applicationStatus": return "App status"
        case "logoUrl", "logo": return "Logo"
        case "rank": return "Rank"
        case "why": return "Why"
        case "url": return "URL"
        case "email": return "Email"
        case "relatedJobUrl": return "Job"
        case "tier": return "Tier"
        default:
            return field.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }

    static func linkLabel(_ field: String) -> String {
        switch field {
        case "website": return "Website"
        case "careersUrl": return "Careers"
        case "linkedinUrl": return "LinkedIn"
        case "url", "relatedJobUrl": return "Open role"
        case "xURL": return "Open X"
        default: return displayName(field)
        }
    }
}

enum ViewDefaults {
    static let accentHex = "#2563EB"
    static let density = ViewDensity.comfortable
    static let layout = ViewLayout.cards
    static let fields = FieldKey.defaults
}

struct ResolvedView: Equatable, Sendable {
    var viewId: String
    var title: String
    var kind: ViewKind
    var layout: ViewLayout
    var accentHex: String
    var density: ViewDensity
    var fields: [String]
    var items: [ViewItem]

    var accentColor: Color {
        Color(hex: accentHex) ?? Color(hex: ViewDefaults.accentHex) ?? .blue
    }

    var presentsCompanyCards: Bool {
        if kind == .companies { return true }
        guard kind == .opportunities else { return false }
        return !items.contains { item in
            item.url != nil
                || item.status != nil
                || item.location != nil
                || (item.title != nil && item.company != nil && item.title != item.company)
        }
    }

    static func merge(
        document: ViewDocument,
        preferences: PreferencesDocument?
    ) -> ResolvedView {
        let kind = ViewKind.detect(
            viewId: document.viewId,
            fields: document.fields ?? preferences?.fields
        )
        let accent =
            document.theme?.accent
            ?? preferences?.theme?.accent
            ?? ViewDefaults.accentHex
        let density =
            document.theme?.density
            ?? preferences?.theme?.density
            ?? ViewDefaults.density
        let layout: ViewLayout
        if kind == .companies || kind == .people {
            layout = document.layout ?? .cards
        } else {
            layout =
                document.layout
                ?? preferences?.layout
                ?? kind.defaultLayout
        }
        let fields: [String]
        if let payloadFields = document.fields, !payloadFields.isEmpty {
            fields = payloadFields
        } else if kind != .generic {
            fields = kind.defaultFields
        } else {
            fields = preferences?.fields ?? kind.defaultFields
        }
        return ResolvedView(
            viewId: document.viewId,
            title: document.title,
            kind: kind,
            layout: layout,
            accentHex: accent,
            density: density,
            fields: fields,
            items: document.items
        )
    }

    func filteredItems(search: String) -> [ViewItem] {
        let query = search.trimmingCharacters(in: .whitespacesAndNewlines)
        if query.isEmpty {
            return items
        }
        return items.filter { item in
            let haystack = [
                item.displayName,
                item.title,
                item.company,
                item.location,
                item.role,
                item.email,
                item.source,
            ]
            .compactMap { $0 }
            + (item.tags ?? [])
            return haystack.contains { $0.localizedCaseInsensitiveContains(query) }
        }
    }
}

enum ViewJSON {
    static let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        return decoder
    }()

    static func decodeDocument(from data: Data) throws -> ViewDocument {
        try decoder.decode(ViewDocument.self, from: data)
    }

    static func decodePreferences(from data: Data) throws -> PreferencesDocument {
        try decoder.decode(PreferencesDocument.self, from: data)
    }

    static func debugDump(_ document: ViewDocument, resolved: ResolvedView) {
        print(
            "[SearchBuddyViews] decoded viewId=\(document.viewId) kind=\(resolved.kind.rawValue) "
                + "layout=\(resolved.layout.rawValue) fields=\(resolved.fields) "
                + "items=\(document.items.count)"
        )
        for (index, item) in document.items.prefix(5).enumerated() {
            print(
                "[SearchBuddyViews]   [\(index)] id=\(item.id) name=\(item.displayName) "
                    + "title=\(item.title ?? "nil") company=\(item.company ?? "nil") "
                    + "location=\(item.location ?? "nil") status=\(item.status ?? "nil") "
                    + "applicationStatus=\(item.applicationStatus ?? "nil") "
                    + "source=\(item.source ?? "nil") rank=\(item.rank.map(String.init) ?? "nil") "
                    + "why=\(item.why ?? "nil") url=\(item.url ?? "nil") "
                    + "website=\(item.website ?? "nil") careersUrl=\(item.careersUrl ?? "nil") "
                    + "linkedinUrl=\(item.linkedinUrl ?? "nil") logoUrl=\(item.logoUrl ?? "nil") "
                    + "photoUrl=\(item.photoURL ?? "nil") email=\(item.email ?? "nil") "
                    + "relatedJobUrl=\(item.relatedJobUrl ?? "nil") "
                    + "openRolesCount=\(item.openRolesCount.map(String.init) ?? "nil") "
                    + "tier=\(item.personTier ?? "nil")"
            )
        }
    }
}

private struct AnyCodingKey: CodingKey {
    var stringValue: String
    var intValue: Int?

    init(_ string: String) {
        stringValue = string
        intValue = nil
    }

    init?(stringValue: String) {
        self.stringValue = stringValue
        intValue = nil
    }

    init?(intValue: Int) {
        stringValue = String(intValue)
        self.intValue = intValue
    }
}

private struct FlexibleScalar: Codable {
    let value: String?

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            value = nil
        } else if let string = try? container.decode(String.self) {
            value = string
        } else if let number = try? container.decode(Int.self) {
            value = String(number)
        } else if let number = try? container.decode(Double.self) {
            value = String(number)
        } else if let flag = try? container.decode(Bool.self) {
            value = flag ? "true" : "false"
        } else {
            value = nil
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(value)
    }
}

extension ViewItem: Codable {
    enum CodingKeys: String, CodingKey {
        case id, name, title, photoURL, photoUrl, photo, bio, priorities, xURL
        case company, role, tags, fields
        case website, careersUrl, careers, linkedinUrl, linkedin, openRolesCount, source
        case location, status, applicationStatus, rank, why, url, email, relatedJobUrl
        case logoUrl, logo
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: AnyCodingKey.self)
        id = try container.decode(String.self, forKey: AnyCodingKey("id"))
        let extra = Self.decodeFields(container)
        fields = extra

        let decodedTitle = container.decodeFlexibleString("title") ?? extra?["title"]
        let decodedName = container.decodeFlexibleString("name") ?? extra?["name"]
        let resolvedName = decodedName ?? decodedTitle
        guard let resolvedName, !resolvedName.isEmpty else {
            throw DecodingError.dataCorruptedError(
                forKey: AnyCodingKey("name"),
                in: container,
                debugDescription: "Item needs name or title"
            )
        }
        name = resolvedName
        title = decodedTitle ?? decodedName
        photoURL =
            container.decodeFlexibleString("photoURL", "photoUrl", "photo")
            ?? extra?["photoURL"] ?? extra?["photoUrl"] ?? extra?["photo"]
        bio = container.decodeFlexibleString("bio") ?? extra?["bio"]
        priorities = try container.decodeIfPresent([String].self, forKey: AnyCodingKey("priorities"))
        xURL = container.decodeFlexibleString("xURL", "xUrl") ?? extra?["xURL"]
        company = container.decodeFlexibleString("company") ?? extra?["company"]
        role = container.decodeFlexibleString("role") ?? extra?["role"]
        tags = try container.decodeIfPresent([String].self, forKey: AnyCodingKey("tags"))
        website = container.decodeFlexibleString("website") ?? extra?["website"]
        careersUrl =
            container.decodeFlexibleString("careersUrl", "careers", "careerUrl")
            ?? extra?["careersUrl"] ?? extra?["careers"]
        linkedinUrl =
            container.decodeFlexibleString("linkedinUrl", "linkedin", "linkedIn")
            ?? extra?["linkedinUrl"] ?? extra?["linkedin"]
        openRolesCount =
            container.decodeFlexibleInt("openRolesCount")
            ?? extra?["openRolesCount"].flatMap(Int.init)
        source = container.decodeFlexibleString("source") ?? extra?["source"]
        location = container.decodeFlexibleString("location") ?? extra?["location"]
        status = container.decodeFlexibleString("status") ?? extra?["status"]
        applicationStatus =
            container.decodeFlexibleString("applicationStatus", "appStatus")
            ?? extra?["applicationStatus"]
        rank = container.decodeFlexibleInt("rank") ?? extra?["rank"].flatMap(Int.init)
        why = container.decodeFlexibleString("why") ?? extra?["why"]
        url = container.decodeFlexibleString("url") ?? extra?["url"]
        email = container.decodeFlexibleString("email") ?? extra?["email"]
        relatedJobUrl =
            container.decodeFlexibleString("relatedJobUrl")
            ?? extra?["relatedJobUrl"]
        logoUrl =
            container.decodeFlexibleString("logoUrl", "logoURL", "logo")
            ?? extra?["logoUrl"] ?? extra?["logo"]
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encodeIfPresent(title, forKey: .title)
        try container.encodeIfPresent(photoURL, forKey: .photoURL)
        try container.encodeIfPresent(bio, forKey: .bio)
        try container.encodeIfPresent(priorities, forKey: .priorities)
        try container.encodeIfPresent(xURL, forKey: .xURL)
        try container.encodeIfPresent(company, forKey: .company)
        try container.encodeIfPresent(role, forKey: .role)
        try container.encodeIfPresent(tags, forKey: .tags)
        try container.encodeIfPresent(fields, forKey: .fields)
        try container.encodeIfPresent(website, forKey: .website)
        try container.encodeIfPresent(careersUrl, forKey: .careersUrl)
        try container.encodeIfPresent(linkedinUrl, forKey: .linkedinUrl)
        try container.encodeIfPresent(openRolesCount, forKey: .openRolesCount)
        try container.encodeIfPresent(source, forKey: .source)
        try container.encodeIfPresent(location, forKey: .location)
        try container.encodeIfPresent(status, forKey: .status)
        try container.encodeIfPresent(applicationStatus, forKey: .applicationStatus)
        try container.encodeIfPresent(rank, forKey: .rank)
        try container.encodeIfPresent(why, forKey: .why)
        try container.encodeIfPresent(url, forKey: .url)
        try container.encodeIfPresent(email, forKey: .email)
        try container.encodeIfPresent(relatedJobUrl, forKey: .relatedJobUrl)
        try container.encodeIfPresent(logoUrl, forKey: .logoUrl)
    }

    private static func decodeFields(
        _ container: KeyedDecodingContainer<AnyCodingKey>
    ) -> [String: String]? {
        guard let raw = try? container.decodeIfPresent(
            [String: FlexibleScalar].self,
            forKey: AnyCodingKey("fields")
        ) else {
            return nil
        }
        let mapped = raw.compactMapValues(\.value)
        return mapped.isEmpty ? nil : mapped
    }
}

private extension KeyedDecodingContainer where K == AnyCodingKey {
    func decodeFlexibleString(_ keys: String...) -> String? {
        for key in keys {
            if let value = try? decodeIfPresent(String.self, forKey: AnyCodingKey(key)) {
                let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
                if !trimmed.isEmpty { return trimmed }
            }
        }
        return nil
    }

    func decodeFlexibleInt(_ key: String) -> Int? {
        if let value = try? decodeIfPresent(Int.self, forKey: AnyCodingKey(key)) {
            return value
        }
        if let raw = try? decodeIfPresent(String.self, forKey: AnyCodingKey(key)) {
            return Int(raw)
        }
        return nil
    }
}

enum ItemFieldValue {
    static func url(_ item: ViewItem, field: String) -> String? {
        switch field {
        case "website": return nonempty(item.website)
        case "careersUrl", "careers": return nonempty(item.careersUrl)
        case "linkedinUrl", "linkedin": return nonempty(item.linkedinUrl)
        case "url": return nonempty(item.url)
        case "relatedJobUrl": return nonempty(item.relatedJobUrl)
        case "xURL": return nonempty(item.xURL)
        case "logoUrl", "logo": return nonempty(item.logoUrl)
        default: return nil
        }
    }

    static func extra(_ item: ViewItem, field: String) -> String? {
        nonempty(item.fields?[field])
    }

    static func text(_ item: ViewItem, field: String) -> String? {
        switch field {
        case "name": return nonempty(item.displayName)
        case "title": return nonempty(item.title ?? item.name)
        case "bio": return nonempty(item.bio)
        case "company": return nonempty(item.company)
        case "role": return nonempty(item.role)
        case "website": return nonempty(item.website)
        case "careersUrl", "careers": return nonempty(item.careersUrl)
        case "linkedinUrl", "linkedin": return nonempty(item.linkedinUrl)
        case "logoUrl", "logo": return nonempty(item.logoUrl)
        case "source": return nonempty(item.source)
        case "location": return nonempty(item.location)
        case "status": return nonempty(item.status)
        case "applicationStatus": return nonempty(item.applicationStatus)
        case "why": return nonempty(item.why)
        case "url": return nonempty(item.url)
        case "email": return nonempty(item.email)
        case "relatedJobUrl": return nonempty(item.relatedJobUrl)
        case "xURL": return nonempty(item.xURL)
        case "tier": return extra(item, field: "tier")
        case "openRolesCount":
            return item.openRolesCount.map(String.init)
        case "rank":
            return item.rank.map(String.init)
        case "priorities":
            let values = item.priorities ?? []
            return values.isEmpty ? nil : values.joined(separator: ", ")
        default:
            return extra(item, field: field)
        }
    }

    static func missingLabel(for field: String) -> String {
        if field == "email" { return "no email" }
        if field == "applicationStatus" { return "none" }
        return "—"
    }

    private static func nonempty(_ value: String?) -> String? {
        guard let value else { return nil }
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}

extension Color {
    init?(hex: String) {
        var raw = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if raw.hasPrefix("#") {
            raw.removeFirst()
        }
        guard raw.count == 6, let value = UInt64(raw, radix: 16) else {
            return nil
        }
        let red = Double((value >> 16) & 0xFF) / 255
        let green = Double((value >> 8) & 0xFF) / 255
        let blue = Double(value & 0xFF) / 255
        self.init(red: red, green: green, blue: blue)
    }
}
