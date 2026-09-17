import SwiftUI
import UniformTypeIdentifiers

struct ContentView: View {
    @ObservedObject var store: ViewStore

    var body: some View {
        Group {
            if let view = store.resolved, store.status == .loaded {
                layout(for: view)
            } else {
                EmptyStateView(status: store.status, viewURL: store.viewURL)
            }
        }
        .frame(minWidth: 720, minHeight: 480)
        .navigationTitle(store.windowTitle)
        .searchable(text: $store.searchText, prompt: "Search name or tag")
        .onDrop(of: [.fileURL], isTargeted: nil, perform: handleDrop)
        .onAppear { store.start() }
    }

    @ViewBuilder
    private func layout(for view: ResolvedView) -> some View {
        let items = view.filteredItems(search: store.searchText)
        if items.isEmpty {
            EmptyStateView(status: .emptyItems, viewURL: store.viewURL)
        } else if view.presentsCompanyCards || view.kind == .people {
            CardsLayoutView(view: view, items: items)
        } else if view.kind == .opportunities || view.layout == .table {
            TableLayoutView(view: view, items: items)
        } else {
            CardsLayoutView(view: view, items: items)
        }
    }

    private func handleDrop(_ providers: [NSItemProvider]) -> Bool {
        guard let provider = providers.first else { return false }
        provider.loadItem(forTypeIdentifier: UTType.fileURL.identifier, options: nil) { item, _ in
            let dropped: URL?
            if let data = item as? Data {
                dropped = URL(dataRepresentation: data, relativeTo: nil)
            } else {
                dropped = item as? URL
            }
            guard let dropped, dropped.pathExtension.lowercased() == "json" else {
                return
            }
            Task { @MainActor in
                store.openView(at: dropped)
            }
        }
        return true
    }
}

#Preview("Cards") {
    NavigationStack {
        ContentView(store: .previewLoaded())
    }
    .frame(width: 900, height: 640)
}

#Preview("Empty") {
    NavigationStack {
        ContentView(store: .previewEmpty())
    }
    .frame(width: 720, height: 480)
}

#Preview("Dark") {
    NavigationStack {
        ContentView(store: .previewLoaded())
    }
    .frame(width: 900, height: 640)
    .preferredColorScheme(.dark)
}

#Preview("Job Scout Companies") {
    NavigationStack {
        ContentView(store: .previewFixture("job-scout.companies.json"))
    }
    .frame(width: 900, height: 640)
}

#Preview("Job Scout Opportunities") {
    NavigationStack {
        ContentView(store: .previewFixture("job-scout.opportunities.json"))
    }
    .frame(width: 960, height: 640)
}

#Preview("Job Scout People") {
    NavigationStack {
        ContentView(store: .previewFixture("job-scout.people.json"))
    }
    .frame(width: 900, height: 640)
}
