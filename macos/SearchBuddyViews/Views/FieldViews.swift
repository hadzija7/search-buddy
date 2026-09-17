import AppKit
import SwiftUI

struct RemotePhoto: View {
    let urlString: String?
    let size: CGFloat
    let accent: Color

    var body: some View {
        Group {
            if let urlString, let url = URL(string: urlString) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                    default:
                        placeholder
                    }
                }
            } else {
                placeholder
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
    }

    private var placeholder: some View {
        ZStack {
            Circle().fill(accent.opacity(0.12))
            Image(systemName: "person.fill")
                .font(.system(size: size * 0.38))
                .foregroundStyle(accent)
        }
    }
}

struct RemoteLogo: View {
    let urlString: String?
    let size: CGFloat
    let accent: Color

    var body: some View {
        Group {
            if let urlString, let url = URL(string: urlString) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFit()
                            .padding(4)
                    default:
                        placeholder
                    }
                }
            } else {
                placeholder
            }
        }
        .frame(width: size, height: size)
        .background(accent.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private var placeholder: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(accent.opacity(0.12))
            Image(systemName: "building.2.fill")
                .font(.system(size: size * 0.38))
                .foregroundStyle(accent)
        }
    }
}

struct LinkButton: View {
    let urlString: String?
    let label: String
    let accent: Color
    var hideIfMissing: Bool = false

    var body: some View {
        if let urlString, let url = URL(string: urlString) {
            Button(label) {
                NSWorkspace.shared.open(url)
            }
            .buttonStyle(.plain)
            .foregroundStyle(accent)
        } else if hideIfMissing {
            EmptyView()
        } else {
            Text("—")
                .foregroundStyle(.secondary)
        }
    }
}

struct XLinkButton: View {
    let urlString: String?
    let accent: Color

    var body: some View {
        LinkButton(urlString: urlString, label: "Open X", accent: accent)
    }
}

struct StatusChip: View {
    let label: String
    let accent: Color
    var muted: Bool = false

    var body: some View {
        Text(label)
            .font(.caption)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(muted ? Color.secondary.opacity(0.12) : accent.opacity(0.12))
            .clipShape(Capsule())
            .foregroundStyle(muted ? Color.secondary : accent)
    }
}

struct WhyInfoButton: View {
    let why: String
    let accent: Color
    @State private var showing = false

    var body: some View {
        Button {
            showing.toggle()
        } label: {
            Image(systemName: "info.circle")
                .foregroundStyle(accent)
        }
        .buttonStyle(.plain)
        .help(why)
        .popover(isPresented: $showing, arrowEdge: .bottom) {
            Text(why)
                .font(.body)
                .padding(12)
                .frame(maxWidth: 280, alignment: .leading)
        }
    }
}

struct PriorityChips: View {
    let priorities: [String]
    let accent: Color

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            ForEach(priorities, id: \.self) { item in
                Text(item)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(accent.opacity(0.12))
                    .clipShape(Capsule())
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct FieldSlot: View {
    let field: String
    let item: ViewItem
    let accent: Color
    var photoSize: CGFloat = 32
    var showLabel: Bool = true

    var body: some View {
        if FieldKey.photoAliases.contains(field) {
            RemotePhoto(urlString: item.photoURL, size: photoSize, accent: accent)
        } else if field == "logoUrl" || field == "logo" {
            RemoteLogo(urlString: item.resolvedLogoURL, size: photoSize, accent: accent)
        } else if FieldKey.linkFields.contains(field) {
            labeled {
                LinkButton(
                    urlString: ItemFieldValue.url(item, field: field),
                    label: FieldKey.linkLabel(field),
                    accent: accent
                )
            }
        } else if field == "status" {
            labeled {
                if let status = ItemFieldValue.text(item, field: "status") {
                    StatusChip(label: status, accent: accent)
                } else {
                    missing
                }
            }
        } else if field == "applicationStatus" {
            labeled {
                if let value = ItemFieldValue.text(item, field: "applicationStatus") {
                    StatusChip(label: value, accent: accent)
                } else {
                    StatusChip(label: "none", accent: accent, muted: true)
                }
            }
        } else if field == "email" {
            labeled {
                if let email = ItemFieldValue.text(item, field: "email") {
                    Text(email)
                } else {
                    Text("no email").foregroundStyle(.secondary)
                }
            }
        } else if field == "priorities" {
            if let priorities = item.priorities, !priorities.isEmpty {
                labeled {
                    PriorityChips(priorities: priorities, accent: accent)
                }
            }
        } else if field == "name" || field == "title" {
            Text(ItemFieldValue.text(item, field: field) ?? "—")
                .font(.headline)
        } else {
            labeled {
                Text(ItemFieldValue.text(item, field: field) ?? ItemFieldValue.missingLabel(for: field))
                    .foregroundStyle(
                        ItemFieldValue.text(item, field: field) == nil ? Color.secondary : Color.primary
                    )
            }
        }
    }

    @ViewBuilder
    private func labeled<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        if showLabel {
            VStack(alignment: .leading, spacing: 2) {
                Text(FieldKey.displayName(field))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                content()
            }
        } else {
            content()
        }
    }

    private var missing: some View {
        Text("—").foregroundStyle(.secondary)
    }
}

func openWorkspaceURL(_ raw: String?) {
    guard let raw, let url = URL(string: raw) else { return }
    NSWorkspace.shared.open(url)
}
