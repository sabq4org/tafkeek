import SwiftUI

struct HomeView: View {
    @ObservedObject var model: AppModel
    @State private var query = ""

    private let examples = [
        "كيف تعمل الطائرة؟", "كيف تعمل البطارية؟",
        "كيف يعمل الرادار؟", "كيف يعمل التكييف؟",
    ]
    private let levels: [(id: String, label: String)] = [
        ("child", "فضولي"), ("student", "متعلّم"), ("expert", "مختص"),
    ]

    var body: some View {
        ScrollView {
            VStack(spacing: 22) {
                VStack(spacing: 8) {
                    Text("تفكيك").font(.system(size: 42, weight: .bold))
                    Text("كيف تعمل الأشياء؟ افهمها خطوة بخطوة.")
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.top, 70)

                HStack(spacing: 8) {
                    TextField("اسأل: كيف تعمل الطائرة؟", text: $query)
                        .submitLabel(.search)
                        .onSubmit { Task { await model.search(query) } }
                        .padding(14)
                        .background(.white, in: RoundedRectangle(cornerRadius: 14))
                        .overlay(RoundedRectangle(cornerRadius: 14).stroke(.gray.opacity(0.2)))
                    Button { Task { await model.search(query) } } label: {
                        Text("فكّك").bold().foregroundStyle(.white)
                            .padding(.horizontal, 18).padding(.vertical, 15)
                            .background(Color.tafkeekIndigo, in: RoundedRectangle(cornerRadius: 14))
                    }
                }

                HStack(spacing: 8) {
                    ForEach(levels, id: \.id) { lv in
                        let active = model.level == lv.id
                        Button { model.level = lv.id } label: {
                            Text(lv.label).fontWeight(.semibold)
                                .frame(maxWidth: .infinity).padding(.vertical, 10)
                                .background(active ? Color.tafkeekIndigo.opacity(0.12) : .white,
                                           in: RoundedRectangle(cornerRadius: 12))
                                .foregroundStyle(active ? Color.tafkeekIndigo : .secondary)
                                .overlay(RoundedRectangle(cornerRadius: 12)
                                    .stroke(active ? Color.tafkeekIndigo : .gray.opacity(0.2)))
                        }
                    }
                }

                if model.loading {
                    VStack(spacing: 10) {
                        ProgressView()
                        Text("نفكّر ونرسم...").foregroundStyle(.secondary)
                    }
                    .padding(.top, 30)
                } else if let err = model.error {
                    Text(err)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.red.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
                } else {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("جرّب:").foregroundStyle(.secondary)
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                            ForEach(examples, id: \.self) { ex in
                                Button { query = ex; Task { await model.search(ex) } } label: {
                                    Text(ex).font(.subheadline)
                                        .frame(maxWidth: .infinity).padding(.vertical, 12)
                                        .background(.white, in: RoundedRectangle(cornerRadius: 12))
                                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(.gray.opacity(0.2)))
                                        .foregroundStyle(.primary)
                                }
                            }
                        }
                    }
                    .padding(.top, 6)
                }
            }
            .padding(20)
        }
        .background(
            LinearGradient(colors: [.white, Color.tafkeekBg],
                           startPoint: .top, endPoint: .bottom)
                .ignoresSafeArea()
        )
    }
}
