import SwiftUI

struct TableLayoutView: View {
    let view: ResolvedView
    let items: [ViewItem]

    var body: some View {
        if view.kind == .opportunities {
            OpportunitiesTableView(view: view, items: items)
        } else {
            fieldTable
        }
    }

    private var fieldTable: some View {
        ScrollView([.horizontal, .vertical]) {
            VStack(alignment: .leading, spacing: 0) {
                headerRow
                Divider()
                ForEach(items) { item in
                    itemRow(item)
                    Divider()
                }
            }
            .padding(view.density == .compact ? 8 : 12)
        }
    }

    private var headerRow: some View {
        HStack(alignment: .center, spacing: 12) {
            ForEach(view.fields, id: \.self) { field in
                Text(FieldKey.displayName(field))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .frame(minWidth: columnWidth(field), alignment: .leading)
            }
        }
        .padding(.vertical, 8)
    }

    private func itemRow(_ item: ViewItem) -> some View {
        HStack(alignment: .center, spacing: 12) {
            ForEach(view.fields, id: \.self) { field in
                FieldSlot(
                    field: field,
                    item: item,
                    accent: view.accentColor,
                    photoSize: view.density == .compact ? 24 : 32,
                    showLabel: false
                )
                .frame(minWidth: columnWidth(field), alignment: .leading)
            }
        }
        .padding(.vertical, view.density == .compact ? 6 : 8)
    }

    private func columnWidth(_ field: String) -> CGFloat {
        switch field {
        case "photo", "photoUrl", "photoURL":
            return 56
        case "name", "title", "company":
            return 160
        case "why", "bio":
            return 240
        case "url", "relatedJobUrl", "website", "careersUrl", "linkedinUrl", "xURL":
            return 100
        case "status", "applicationStatus":
            return 110
        case "rank", "openRolesCount":
            return 64
        default:
            return 140
        }
    }
}

struct OpportunitiesTableView: View {
    let view: ResolvedView
    let items: [ViewItem]
    @State private var selection: ViewItem.ID?

    var body: some View {
        Table(items, selection: $selection) {
            TableColumn("Title") { item in
                HStack(spacing: 6) {
                    Button(item.title ?? item.name) {
                        openWorkspaceURL(item.applyURL)
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(view.accentColor)
                    .font(.headline)
                    if let why = item.why, !why.isEmpty {
                        WhyInfoButton(why: why, accent: view.accentColor)
                    }
                }
            }
            .width(min: 180, ideal: 240)
            TableColumn("Company") { item in
                Text(item.company ?? "—")
            }
            TableColumn("Location") { item in
                Text(item.location ?? "—")
                    .foregroundStyle(item.location == nil ? .secondary : .primary)
            }
            TableColumn("Status") { item in
                if let status = item.status {
                    StatusChip(label: status, accent: view.accentColor)
                } else {
                    Text("—").foregroundStyle(.secondary)
                }
            }
            .width(min: 80, ideal: 100)
            TableColumn("App status") { item in
                if let value = item.applicationStatus {
                    StatusChip(label: value, accent: view.accentColor)
                } else {
                    StatusChip(label: "none", accent: view.accentColor, muted: true)
                }
            }
            .width(min: 90, ideal: 110)
            TableColumn("Source") { item in
                Text(item.source ?? "—")
                    .foregroundStyle(item.source == nil ? .secondary : .primary)
            }
            TableColumn("Rank") { item in
                Text(item.rank.map(String.init) ?? "—")
                    .foregroundStyle(item.rank == nil ? .secondary : .primary)
            }
            .width(min: 48, ideal: 64)
        }
        .contextMenu(forSelectionType: ViewItem.ID.self) { ids in
            Button("Open role") {
                if let id = ids.first, let item = items.first(where: { $0.id == id }) {
                    openWorkspaceURL(item.applyURL)
                }
            }
        }
    }
}
