import ExpoModulesCore
import Foundation
import ImageIO
import Vision

// On-device text recognition for receipt photos. Returns recognized lines in reading order with
// bounding boxes normalized to 0...1 and a top-left origin. The image never leaves the device.
public class BilletOcrModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BilletOcr")

    AsyncFunction("recognize") { (uri: String, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          let lines = try BilletTextRecognizer.recognize(uri: uri)
          promise.resolve(["lines": lines])
        } catch {
          promise.reject("ERR_BILLET_OCR", error.localizedDescription)
        }
      }
    }
  }
}

enum BilletOcrError: LocalizedError {
  case invalidUri
  case unreadableImage

  var errorDescription: String? {
    switch self {
    case .invalidUri: return "The image URI is not valid."
    case .unreadableImage: return "The image could not be read."
    }
  }
}

enum BilletTextRecognizer {
  static let preferredLanguages = ["vi-VN", "en-US"]

  static func recognize(uri: String) throws -> [[String: Any]] {
    let (image, orientation) = try loadImage(uri: uri)
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    let supported = (try? request.supportedRecognitionLanguages()) ?? []
    let languages = preferredLanguages.filter { supported.contains($0) }
    if !languages.isEmpty { request.recognitionLanguages = languages }

    let handler = VNImageRequestHandler(cgImage: image, orientation: orientation, options: [:])
    try handler.perform([request])

    let lines: [(text: String, box: CGRect)] = (request.results ?? []).compactMap { observation in
      guard let candidate = observation.topCandidates(1).first else { return nil }
      let text = candidate.string.trimmingCharacters(in: .whitespacesAndNewlines)
      if text.isEmpty { return nil }
      // Vision uses a bottom-left origin; flip to the top-left origin used by the parser.
      let box = observation.boundingBox
      let flipped = CGRect(
        x: box.minX, y: 1 - box.maxY, width: box.width, height: box.height)
      return (text, flipped)
    }

    return lines
      .sorted { lhs, rhs in
        abs(lhs.box.minY - rhs.box.minY) > min(lhs.box.height, rhs.box.height) / 2
          ? lhs.box.minY < rhs.box.minY
          : lhs.box.minX < rhs.box.minX
      }
      .map { line in
        [
          "text": line.text,
          "box": [
            "x": clamp(line.box.minX),
            "y": clamp(line.box.minY),
            "width": clamp(line.box.width),
            "height": clamp(line.box.height),
          ],
        ]
      }
  }

  private static func clamp(_ value: CGFloat) -> Double {
    Double(min(max(value, 0), 1))
  }

  private static func loadImage(uri: String) throws -> (CGImage, CGImagePropertyOrientation) {
    guard let url = URL(string: uri) ?? URL(string: "file://\(uri)") else {
      throw BilletOcrError.invalidUri
    }
    let source: CGImageSource?
    if url.isFileURL || url.scheme == nil {
      source = CGImageSourceCreateWithURL(
        (url.isFileURL ? url : URL(fileURLWithPath: uri)) as CFURL, nil)
    } else {
      // Bundled sample photos are served over HTTP by Metro in development.
      guard let data = try? Data(contentsOf: url) else { throw BilletOcrError.unreadableImage }
      source = CGImageSourceCreateWithData(data as CFData, nil)
    }
    guard let source, let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
      throw BilletOcrError.unreadableImage
    }
    let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any]
    let rawOrientation = (properties?[kCGImagePropertyOrientation] as? UInt32) ?? 1
    return (image, CGImagePropertyOrientation(rawValue: rawOrientation) ?? .up)
  }
}
