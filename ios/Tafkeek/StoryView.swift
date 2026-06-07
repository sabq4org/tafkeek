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
                        .containerRelativeFrame([.horizontal, .vertical]) // كل شريحة = حجم الشاشة بالضبط (يمنع التداخل)
                        .id(page.id)
                }
            }
            .scrollTargetLayout()
        }
        .scrollTargetBehavior(.paging)
        .scrollPosition(id: $currentId)
        .scrollIndicators(.hidden)
        .ignoresSafeArea()
        .background(PageBackground())
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
        VStack(spacing: 12) {
            HStack(spacing: 4) {
                ForEach(pages.indices, id: \.self) { i in
                    Capsule()
                        .fill(i <= currentIndex ? Color.tafkeekIndigo : Color.gray.opacity(0.25))
                        .frame(height: 3)
                }
            }
            HStack {
                Button {
                    Speaker.shared.stop()
                    model.explanation = nil
                } label: {
                    Image(systemName: "xmark")
                        .font(.subheadline.bold())
                        .foregroundStyle(.secondary)
                        .padding(9)
                        .background(.ultraThinMaterial, in: Circle())
                }
                Spacer()
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 56)
    }
}

private struct PageBackground: View {
    var body: some View {
        LinearGradient(colors: [.white, Color(red: 0.95, green: 0.96, blue: 0.98)],
                       startPoint: .top, endPoint: .bottom)
            .ignoresSafeArea()
    }
}

// MARK: - بطاقة الصورة (تعرض الصورة كاملة، واضحة، بدون قص)
private struct IllustrationCard: View {
    let image: UIImage?
    let loading: Bool
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 24)
                .fill(Color(red: 0.96, green: 0.955, blue: 0.93))
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .padding(10)
            } else {
                VStack(spacing: 12) {
                    if loading {
                        ProgressView().controlSize(.large).tint(Color.tafkeekIndigo)
                        Text("نرسم التوضيح...").font(.subheadline).foregroundStyle(.secondary)
                    } else {
                        Image(systemName: "photo").font(.largeTitle).foregroundStyle(.secondary)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity)
        .containerRelativeFrame(.vertical) { height, _ in height * 0.46 }
        .clipShape(RoundedRectangle(cornerRadius: 24))
        .overlay(RoundedRectangle(cornerRadius: 24).stroke(.black.opacity(0.05)))
        .shadow(color: .black.opacity(0.08), radius: 16, y: 8)
    }
}

private struct CoverCard: View {
    let exp: Explanation
    let image: UIImage?
    let loading: Bool
    var body: some View {
        VStack(spacing: 22) {
            Spacer(minLength: 8)
            IllustrationCard(image: image, loading: loading)
            VStack(alignment: .leading, spacing: 10) {
                Text("كيف يعمل").font(.subheadline.bold()).foregroundStyle(Color.tafkeekIndigo)
                Text(exp.topic)
                    .font(.system(size: 30, weight: .heavy)).foregroundStyle(.primary)
                    .fixedSize(horizontal: false, vertical: true)
                Text(exp.summary)
                    .font(.title3).foregroundStyle(.secondary).lineSpacing(4)
                    .fixedSize(horizontal: false, vertical: true)
                HStack {
                    SpeakButton(text: "\(exp.topic). \(exp.summary)")
                    Spacer()
                    Label("اسحب للأعلى", systemImage: "chevron.up")
                        .font(.subheadline).foregroundStyle(.secondary)
                }
                .padding(.top, 4)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            Spacer(minLength: 8)
        }
        .padding(.horizontal, 22)
        .padding(.top, 96)
        .padding(.bottom, 28)
    }
}

private struct StageCard: View {
    let step: Step
    let total: Int
    let image: UIImage?
    let loading: Bool
    var body: some View {
        VStack(spacing: 22) {
            Spacer(minLength: 8)
            IllustrationCard(image: image, loading: loading)
            VStack(alignment: .leading, spacing: 10) {
                Text("المرحلة \(step.order) من \(total)")
                    .font(.caption.bold()).foregroundStyle(Color.tafkeekIndigo)
                    .padding(.horizontal, 12).padding(.vertical, 6)
                    .background(Color.tafkeekIndigo.opacity(0.12), in: Capsule())
                Text(step.title)
                    .font(.system(size: 26, weight: .bold)).foregroundStyle(.primary)
                    .fixedSize(horizontal: false, vertical: true)
                Text(step.detail)
                    .font(.body).foregroundStyle(.secondary).lineSpacing(5)
                    .fixedSize(horizontal: false, vertical: true)
                SpeakButton(text: "\(step.title). \(step.detail)")
                    .padding(.top, 2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            Spacer(minLength: 8)
        }
        .padding(.horizontal, 22)
        .padding(.top, 96)
        .padding(.bottom, 28)
    }
}

private struct RelatedCard: View {
    let questions: [String]
    let onSelect: (String) -> Void
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Spacer(minLength: 8)
            Text("تعمّق أكثر").font(.system(size: 30, weight: .bold)).foregroundStyle(.primary)
            Text("اختر سؤالاً جديداً لتفكيكه").foregroundStyle(.secondary)
            ForEach(questions, id: \.self) { q in
                Button { onSelect(q) } label: {
                    HStack {
                        Text(q).font(.headline).foregroundStyle(.primary)
                        Spacer()
                        Image(systemName: "arrow.left").foregroundStyle(Color.tafkeekIndigo)
                    }
                    .padding(18)
                    .frame(maxWidth: .infinity)
                    .background(.white, in: RoundedRectangle(cornerRadius: 18))
                    .overlay(RoundedRectangle(cornerRadius: 18).stroke(.black.opacity(0.06)))
                    .shadow(color: .black.opacity(0.05), radius: 10, y: 4)
                }
            }
            Spacer()
        }
        .padding(.horizontal, 22)
        .padding(.top, 96)
        .padding(.bottom, 28)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
