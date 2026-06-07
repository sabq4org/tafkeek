import SwiftUI
import UIKit

@MainActor
final class AppModel: ObservableObject {
    @Published var level = "student"
    @Published var loading = false
    @Published var error: String?
    @Published var explanation: Explanation?

    @Published var cover: UIImage?
    @Published var stageImages: [Int: UIImage] = [:]
    @Published var imagesLoading = false

    func search(_ query: String) async {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard q.count >= 2 else { return }
        loading = true
        error = nil
        explanation = nil
        cover = nil
        stageImages = [:]
        do {
            let exp = try await APIClient.explain(query: q, level: level)
            explanation = exp
            loading = false
            await generateImages(for: exp)
        } catch {
            self.error = "تعذّر الاتصال بالخادم. تأكد أنه يعمل (npm run dev)."
            loading = false
        }
    }

    func generateImages(for exp: Explanation) async {
        imagesLoading = true
        do {
            let res = try await APIClient.illustrate(subject: exp.subject, steps: exp.steps)
            cover = imageFromDataURL(res.cover)
            var map: [Int: UIImage] = [:]
            for item in res.images {
                if let img = imageFromDataURL(item.image) { map[item.order] = img }
            }
            stageImages = map
        } catch {
            // نُبقي النص بدون صور إن فشل التوليد
        }
        imagesLoading = false
    }
}
