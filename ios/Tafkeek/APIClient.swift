import Foundation

enum APIConfig {
    /// الخلفية منشورة على Vercel — تعمل من أي مكان (محاكي/جوال/إنترنت).
    /// للتطوير المحلي بدّلها مؤقتاً لـ "http://localhost:3000".
    static let baseURL = "https://tafkeek.vercel.app"
}

enum APIError: Error { case badResponse }

struct IllustrateRequest: Codable {
    let subject: String
    let steps: [StepVisual]
    struct StepVisual: Codable { let order: Int; let visual: String }
}

enum APIClient {
    static func explain(query: String, level: String) async throws -> Explanation {
        let url = URL(string: "\(APIConfig.baseURL)/api/explain")!
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONEncoder().encode(["query": query, "level": level])
        req.timeoutInterval = 120
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else { throw APIError.badResponse }
        return try JSONDecoder().decode(ExplainResponse.self, from: data).explanation
    }

    static func illustrate(subject: String, steps: [Step]) async throws -> IllustrateResponse {
        let url = URL(string: "\(APIConfig.baseURL)/api/illustrate")!
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body = IllustrateRequest(
            subject: subject,
            steps: steps.map { .init(order: $0.order, visual: $0.visual) }
        )
        req.httpBody = try JSONEncoder().encode(body)
        req.timeoutInterval = 300
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else { throw APIError.badResponse }
        return try JSONDecoder().decode(IllustrateResponse.self, from: data)
    }
}
