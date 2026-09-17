import SwiftUI

struct CardsLayoutView: View {
    let view: ResolvedView
    let items: [ViewItem]

    private var minWidth: CGFloat {
        switch view.kind {
        case .companies: return view.density == .compact ? 260 : 300
        case .people: return view.density == .compact ? 240 : 280
        default: return view.density == .compact ? 200 : 260
        }
    }

    private var padding: CGFloat {
        view.density == .compact ? 10 : 16
    }

    var body: some View {
        ScrollView {
            LazyVGrid(
                columns: [GridItem(.adaptive(minimum: minWidth), spacing: 16)],
                spacing: 16
            ) {
                ForEach(items) { item in
                    card(for: item)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(padding)
        }
    }

    @ViewBuilder
    private func card(for item: ViewItem) -> some View {
        switch view.kind {
        case .companies:
            CompanyCard(item: item, accent: view.accentColor, compact: view.density == .compact)
        case .people:
            PersonCard(item: item, accent: view.accentColor, compact: view.density == .compact)
        case .opportunities where view.presentsCompanyCards:
            CompanyCard(item: item, accent: view.accentColor, compact: view.density == .compact)
        default:
            ItemCard(item: item, view: view)
        }
    }
}

struct CompanyCard: View {
    let item: ViewItem
    let accent: Color
    var compact: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: compact ? 10 : 12) {
            HStack(alignment: .center, spacing: 12) {
                RemoteLogo(
                    urlString: item.resolvedLogoURL,
                    size: compact ? 44 : 52,
                    accent: accent
                )
                VStack(alignment: .leading, spacing: 3) {
                    Text(item.displayName)
                        .font(.headline)
                        .lineLimit(2)
                    if let host = displayHost(item.website) {
                        Button(host) {
                            openWorkspaceURL(item.website)
                        }
                        .buttonStyle(.plain)
                        .foregroundStyle(accent)
                        .font(.subheadline)
                    }
                }
                Spacer(minLength: 8)
                if let count = item.openRolesCount {
                    Text("\(count) open")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 5)
                        .background(accent.opacity(0.14))
                        .foregroundStyle(accent)
                        .clipShape(Capsule())
                }
            }

            HStack(spacing: 16) {
                action("Website", item.website)
                action("Careers", item.careersUrl)
                action("LinkedIn", item.linkedinUrl)
            }
        }
        .padding(compact ? 14 : 16)
        .frame(maxWidth: .infinity, minHeight: compact ? 108 : 120, alignment: .leading)
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(accent.opacity(0.18), lineWidth: 1)
        )
    }

    @ViewBuilder
    private func action(_ label: String, _ urlString: String?) -> some View {
        if let urlString, URL(string: urlString) != nil {
            Button(label) {
                openWorkspaceURL(urlString)
            }
            .buttonStyle(.plain)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(accent)
        }
    }

    private func displayHost(_ urlString: String?) -> String? {
        guard let urlString, let host = URL(string: urlString)?.host, !host.isEmpty else {
            return nil
        }
        return host.hasPrefix("www.") ? String(host.dropFirst(4)) : host
    }
}

struct PersonCard: View {
    let item: ViewItem
    let accent: Color
    var compact: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: compact ? 10 : 12) {
            HStack(alignment: .top, spacing: 12) {
                RemotePhoto(
                    urlString: item.photoURL,
                    size: compact ? 44 : 56,
                    accent: accent
                )
                VStack(alignment: .leading, spacing: 4) {
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text(item.displayName)
                            .font(.headline)
                        if let tier = item.personTier {
                            StatusChip(label: tier.replacingOccurrences(of: "_", with: " "), accent: accent)
                        }
                    }
                    let subtitle = [item.role, item.company].compactMap { $0 }.filter { !$0.isEmpty }
                    if !subtitle.isEmpty {
                        Text(subtitle.joined(separator: " · "))
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            if let why = item.why, !why.isEmpty {
                Text(why)
                    .font(.callout)
                    .foregroundStyle(.primary)
            }

            HStack(spacing: 10) {
                LinkButton(
                    urlString: item.linkedinUrl,
                    label: "LinkedIn",
                    accent: accent,
                    hideIfMissing: true
                )
                if let email = item.email, !email.isEmpty {
                    Text(email)
                        .font(.callout)
                } else {
                    Text("no email")
                        .font(.callout)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                LinkButton(
                    urlString: item.relatedJobUrl,
                    label: "Open role",
                    accent: accent,
                    hideIfMissing: true
                )
            }
        }
        .padding(compact ? 14 : 16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(accent.opacity(0.2), lineWidth: 1)
        )
    }
}

struct ItemCard: View {
    let item: ViewItem
    let view: ResolvedView

    var body: some View {
        VStack(alignment: .leading, spacing: view.density == .compact ? 8 : 12) {
            ForEach(view.fields, id: \.self) { field in
                FieldSlot(
                    field: field,
                    item: item,
                    accent: view.accentColor,
                    photoSize: view.density == .compact ? 40 : 56,
                    showLabel: !FieldKey.photoAliases.contains(field)
                        && field != "name"
                        && field != "title"
                )
            }
        }
        .padding(view.density == .compact ? 12 : 16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.background)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(view.accentColor.opacity(0.28), lineWidth: 1)
        )
    }
}
