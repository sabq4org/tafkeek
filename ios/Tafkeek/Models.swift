import Foundation

struct Explanation: Codable {
    let topic: String
    let level: String
    let summary: String
    let subject: String
    let steps: [Step]
    let diagram: Diagram
    let relatedQuestions: [String]
    let imagePrompt: String
}

struct Step: Codable, Identifiable {
    var id: Int { order }
    let order: Int
    let title: String
    let detail: String
    let visual: String
}

struct Diagram: Codable {
    let title: String
    let direction: String
    let nodes: [DiagramNode]
    let edges: [DiagramEdge]
}

struct DiagramNode: Codable { let id: String; let label: String }
struct DiagramEdge: Codable { let from: String; let to: String; let label: String? }

struct ExplainResponse: Codable { let explanation: Explanation }
struct IllustrateResponse: Codable { let cover: String?; let images: [StageImage] }
struct StageImage: Codable { let order: Int; let image: String? }
