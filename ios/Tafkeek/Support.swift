import SwiftUI
import UIKit
import AVFoundation

// MARK: - الألوان
extension Color {
    static let tafkeekIndigo = Color(red: 0.388, green: 0.400, blue: 0.945)
    static let tafkeekBg = Color(red: 0.953, green: 0.957, blue: 0.965)
}

// MARK: - فك ترميز صورة data URL إلى UIImage
func imageFromDataURL(_ dataURL: String?) -> UIImage? {
    guard let dataURL, let comma = dataURL.firstIndex(of: ",") else { return nil }
    let b64 = String(dataURL[dataURL.index(after: comma)...])
    guard let data = Data(base64Encoded: b64) else { return nil }
    return UIImage(data: data)
}

// MARK: - النطق العربي
final class Speaker {
    static let shared = Speaker()
    private let synth = AVSpeechSynthesizer()
    func speak(_ text: String) {
        synth.stopSpeaking(at: .immediate)
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: "ar-SA")
        utterance.rate = 0.48
        synth.speak(utterance)
    }
    func stop() { synth.stopSpeaking(at: .immediate) }
}

// MARK: - صورة تملأ الإطار + حالة التحميل
struct FillImage: View {
    let image: UIImage?
    let loading: Bool
    var body: some View {
        if let image {
            Image(uiImage: image).resizable().scaledToFill()
        } else {
            ZStack {
                LinearGradient(
                    colors: [Color.tafkeekIndigo.opacity(0.35), Color.tafkeekIndigo.opacity(0.12)],
                    startPoint: .top, endPoint: .bottom
                )
                if loading {
                    ProgressView().controlSize(.large).tint(.white)
                } else {
                    Image(systemName: "photo").font(.largeTitle).foregroundStyle(.white.opacity(0.6))
                }
            }
        }
    }
}

// MARK: - زر الاستماع
struct SpeakButton: View {
    let text: String
    var light: Bool = false
    var body: some View {
        Button {
            Speaker.shared.speak(text)
        } label: {
            Label("استمع", systemImage: "speaker.wave.2.fill")
                .font(.subheadline.bold())
                .padding(.horizontal, 16).padding(.vertical, 10)
                .background(light ? Color.white.opacity(0.22) : Color.tafkeekIndigo.opacity(0.12), in: Capsule())
                .foregroundStyle(light ? Color.white : Color.tafkeekIndigo)
        }
    }
}
