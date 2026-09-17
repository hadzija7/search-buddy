import AppKit
import SwiftUI
import UniformTypeIdentifiers

@main
struct SearchBuddyViewsApp: App {
    @StateObject private var store = ViewStore()

    var body: some Scene {
        WindowGroup {
            NavigationStack {
                ContentView(store: store)
            }
        }
        .defaultSize(width: 960, height: 680)
        .commands {
            CommandGroup(replacing: .newItem) {
                Button("Open…") {
                    openView()
                }
                .keyboardShortcut("o", modifiers: .command)
            }
        }
    }

    private func openView() {
        let panel = NSOpenPanel()
        panel.allowedContentTypes = [.json]
        panel.canChooseFiles = true
        panel.canChooseDirectories = false
        panel.allowsMultipleSelection = false
        panel.title = "Open view JSON"
        if panel.runModal() == .OK, let url = panel.url {
            store.openView(at: url)
        }
    }
}
