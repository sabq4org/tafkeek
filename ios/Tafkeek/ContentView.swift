import SwiftUI

struct ContentView: View {
    @StateObject private var model = AppModel()

    var body: some View {
        ZStack {
            if model.explanation != nil {
                StoryView(model: model)
                    .transition(.move(edge: .bottom))
            } else {
                HomeView(model: model)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: model.explanation?.topic)
        .task {
            // خطّاف اختياري للتجربة: عند ضبط متغيّر البيئة يبدأ بحثاً تلقائياً.
            if let demo = ProcessInfo.processInfo.environment["TAFKEEK_DEMO"],
               !demo.isEmpty, model.explanation == nil {
                await model.search(demo)
            }
        }
    }
}
