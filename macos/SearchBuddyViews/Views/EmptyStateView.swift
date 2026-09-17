import SwiftUI

struct EmptyStateView: View {
    let status: ViewLoadStatus
    let viewURL: URL

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: iconName)
                .font(.system(size: 36))
                .foregroundStyle(.secondary)
            Text(title)
                .font(.title2)
            Text(detail)
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 420)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(24)
    }

    private var iconName: String {
        switch status {
        case .decodeError: return "exclamationmark.triangle"
        case .emptyItems: return "tray"
        case .missingFile: return "doc.badge.plus"
        case .loaded: return "square.grid.2x2"
        }
    }

    private var title: String {
        switch status {
        case .missingFile: return "No view file"
        case .emptyItems: return "No items"
        case .decodeError: return "Could not read view"
        case .loaded: return "View"
        }
    }

    private var detail: String {
        switch status {
        case .missingFile:
            return "Drop a view JSON here, use File → Open, or write:\n\(viewURL.path)"
        case .emptyItems:
            return "The view loaded, but items is empty."
        case .decodeError(let message):
            return message
        case .loaded:
            return ""
        }
    }
}
