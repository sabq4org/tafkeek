import SwiftUI

private enum StoryPage: Identifiable {
    case cover
    case stage(Step)
    case related
    var id: String {
        switch self {
        case .cover: return "cover"
        case .stage(let s): return "step-\(s.order)"
        case .related: return "related"
        }
    }
}

struct StoryView: View {
    @ObservedObject var model: AppModel
    @State private var currentId: String?

    var body: some View {
        if let exp = model.explanation {
            content(exp)
        } else {
            Color.clear
        }
    }

    @ViewBuilder
    private func content(_ exp: Explanation) -> some View {
        let pages: [StoryPage] = [.cover] + exp.steps.map { .stage($0) } + [.related]
        let currentIndex = pages.firstIndex { $0.id == currentId } ?? 0

        ScrollView(.vertical) {
            LazyVStack(spacing: 0) {
                ForEach(pages) { page in
                    pageView(page, exp: exp, total: exp.steps.count)
                        .containerRelativeFrame([.horizontal, .vertical])
                        .id(page.id)
                }
            }
            .scrollTargetLayout()
        }
        .scrollTargetBehavior(.paging)
        .scrollPosition(id: $currentId)
        .scrollIndicators(.hidden)
        .ignoresSafeArea()
        .background(Color(white: 0.98)) // Clean, minimal background
        .sensoryFeedback(.selection, trigger: currentId)
        .overlay(alignment: .top) { topBar(pages: pages, currentIndex: currentIndex) }
        .onAppear { if currentId == nil { currentId = "cover" } }
    }

    @ViewBuilder
    private func pageView(_ page: StoryPage, exp: Explanation, total: Int) -> some View {
        switch page {
        case .cover:
            CoverCard(exp: exp, image: model.cover, loading: model.imagesLoading)
        case .stage(let step):
            StageCard(step: step, total: total,
                      image: model.stageImages[step.order], loading: model.imagesLoading)
        case .related:
            RelatedCard(questions: exp.relatedQuestions) { q in
                Task { await model.search(q) }
            }
        }
    }

    private func topBar(pages: [StoryPage], currentIndex: Int) -> some View {
        VStack(spacing: 16) {
            // High-end progress indicator (thin capsules)
            HStack(spacing: 4) {
                ForEach(pages.indices, id: \.self) { i in
                    Capsule()
                        .fill(i <= currentIndex ? Color.tafkeekIndigo : Color.primary.opacity(0.1))
                        .frame(height: 3)
                }
            }
            .padding(.horizontal, 4)
            
            HStack {
                Button {
                    Speaker.shared.stop()
                    model.explanation = nil
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(.primary.opacity(0.6))
                        .padding(10)
                        .background(.ultraThinMaterial, in: Circle())
                }
                Spacer()
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 60)
    }
}

// MARK: - Reusable Hero Image Component
private struct HeroImage: View {
    let image: UIImage?
    let loading: Bool
    let heightMultiplier: Double
    
    var body: some View {
        ZStack {
            if let image = image {
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(maxWidth: .infinity)
                    .frame(height: UIScreen.main.bounds.height * heightMultiplier)
                    .clipped()
            } else {
                ZStack {
                    Rectangle()
                        .fill(Color.tafkeekIndigo.opacity(0.04))
                    
                    if loading {
                        VStack(spacing: 12) {
                            ProgressView()
                                .controlSize(.large)
                                .tint(Color.tafkeekIndigo)
                            Text("جاري الرسم...")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                    } else {
                        Image(systemName: "photo")
                            .font(.system(size: 40))
                            .foregroundStyle(.secondary.opacity(0.3))
                    }
                }
                .frame(height: UIScreen.main.bounds.height * heightMultiplier)
            }
        }
    }
}

// MARK: - Cover Card (Redesigned)
private struct CoverCard: View {
    let exp: Explanation
    let image: UIImage?
    let loading: Bool
    
    var body: some View {
        VStack(spacing: 0) {
            HeroImage(image: image, loading: loading, heightMultiplier: 0.52)
            
            VStack(alignment: .leading, spacing: 14) {
                Text("الموضوع")
                    .font(.caption.bold())
                    .tracking(1.0)
                    .foregroundStyle(Color.tafkeekIndigo)
                    .padding(.bottom, 2)

                Text(exp.topic)
                    .font(.system(size: 34, weight: .black, design: .rounded))
                    .foregroundStyle(.primary)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)

                Text(exp.summary)
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .lineSpacing(6)
                    .multilineTextAlignment(.leading)
                
                Spacer(minLength: 20)
                
                HStack {
                    SpeakButton(text: "\(exp.topic). \(exp.summary)")
                    Spacer()
                    VStack(spacing: 4) {
                        Image(systemName: "chevron.up")
                            .font(.system(size: 12, weight: .bold))
                        Text("اسحب للمزيد")
                            .font(.system(size: 10, weight: .bold))
                    }
                    .foregroundStyle(.secondary.opacity(0.7))
                }
            }
            .padding(28)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.white)
        }
        .clipShape(RoundedRectangle(cornerRadius: 36, style: .continuous))
        .shadow(color: .black.opacity(0.08), radius: 24, x: 0, y: 12)
        .padding(.horizontal, 16)
        .padding(.top, 100)
        .padding(.bottom, 30)
    }
}

// MARK: - Stage Card (Redesigned)
private struct StageCard: View {
    let step: Step
    let total: Int
    let image: UIImage?
    let loading: Bool
    
    var body: some View {
        VStack(spacing: 0) {
            HeroImage(image: image, loading: loading, heightMultiplier: 0.48)
            
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Text("المرحلة \(step.order) من \(total)")
                        .font(.system(size: 12, weight: .heavy))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.tafkeekIndigo, in: Capsule())
                    Spacer()
                }
                .padding(.bottom, 4)

                Text(step.title)
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundStyle(.primary)

                ScrollView(showsIndicators: false) {
                    Text(step.detail)
                        .font(.system(size: 18, weight: .regular))
                        .foregroundStyle(.secondary)
                        .lineSpacing(7)
                        .multilineTextAlignment(.leading)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                SpeakButton(text: "\(step.title). \(step.detail)")
                    .padding(.top, 8)
            }
            .padding(28)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.white)
            .clipShape(CustomCorner(corners: [.bottomLeft, .bottomRight], radius: 36))
        }
        .clipShape(RoundedRectangle(cornerRadius: 36, style: .continuous))
        .shadow(color: .black.opacity(0.08), radius: 24, x: 0, y: 12)
        .padding(.horizontal, 16)
        .padding(.top, 100)
        .padding(.bottom, 30)
    }
}

// MARK: - Related Card (Redesigned)
private struct RelatedCard: View {
    let questions: [String]
    let onSelect: (String) -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 8) {
                Text("تعمّق أكثر")
                    .font(.system(size: 36, weight: .black, design: .rounded))
                    .foregroundStyle(.primary)
                Text("اختر سؤالاً جديداً لاستكشافه بتفصيل أكبر")
                    .font(.headline)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 4)
            
            ScrollView(showsIndicators: false) {
                VStack(spacing: 12) {
                    ForEach(questions, id: \.self) { q in
                        Button { onSelect(q) } label: {
                            HStack(spacing: 16) {
                                Text(q)
                                    .font(.system(size: 18, weight: .semibold))
                                    .foregroundStyle(.primary)
                                    .multilineTextAlignment(.leading)
                                    .lineLimit(2)
                                Spacer()
                                Image(systemName: "sparkles")
                                    .font(.system(size: 16))
                                    .foregroundStyle(Color.tafkeekIndigo)
                            }
                            .padding(22)
                            .frame(maxWidth: .infinity)
                            .background(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                            .shadow(color: .black.opacity(0.04), radius: 8, x: 0, y: 4)
                            .overlay(
                                RoundedRectangle(cornerRadius: 24, style: .continuous)
                                    .stroke(Color.primary.opacity(0.06), lineWidth: 1)
                            )
                        }
                    }
                }
                .padding(.vertical, 4)
            }
            
            Spacer()
        }
        .padding(.horizontal, 20)
        .padding(.top, 110)
        .padding(.bottom, 30)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// SHAPE HELPER
struct CustomCorner: Shape {
    var corners: UIRectCorner
    var radius: CGFloat
    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(roundedRect: rect, byRoundingCorners: corners, cornerRadii: CGSize(width: radius, height: radius))
        return Path(path.cgPath)
    }
}
