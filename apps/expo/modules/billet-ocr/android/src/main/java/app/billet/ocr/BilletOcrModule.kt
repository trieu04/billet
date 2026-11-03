package app.billet.ocr

import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.net.URL

// On-device text recognition for receipt photos. Returns recognized lines in reading order with
// bounding boxes normalized to 0..1 and a top-left origin. The image never leaves the device.
class BilletOcrModule : Module() {
  private var recognizer: TextRecognizer? = null

  override fun definition() = ModuleDefinition {
    Name("BilletOcr")

    AsyncFunction("recognize") { uri: String, promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.reject("ERR_BILLET_OCR", "React context is not available", null)
        return@AsyncFunction
      }
      var download: File? = null
      val image =
        try {
          val parsed = Uri.parse(uri)
          val source =
            when (parsed.scheme) {
              null -> Uri.fromFile(File(uri))
              "http", "https" -> Uri.fromFile(downloadToCache(context.cacheDir, uri).also { download = it })
              else -> parsed
            }
          // fromFilePath decodes the bitmap (and applies EXIF rotation) immediately.
          InputImage.fromFilePath(context, source)
        } catch (error: Exception) {
          promise.reject("ERR_BILLET_OCR", "The image could not be read", error)
          return@AsyncFunction
        } finally {
          download?.delete()
        }
      val rotated = image.rotationDegrees % 180 != 0
      val width = (if (rotated) image.height else image.width).toFloat().coerceAtLeast(1f)
      val height = (if (rotated) image.width else image.height).toFloat().coerceAtLeast(1f)

      client()
        .process(image)
        .addOnSuccessListener { text -> promise.resolve(mapOf("lines" to toLines(text, width, height))) }
        .addOnFailureListener { error ->
          promise.reject("ERR_BILLET_OCR", error.message ?: "Text recognition failed", error)
        }
    }

    OnDestroy {
      recognizer?.close()
      recognizer = null
    }
  }

  private fun client(): TextRecognizer =
    recognizer ?: TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS).also { recognizer = it }

  // Bundled sample photos are served over HTTP by Metro in development; copy them to a file first.
  private fun downloadToCache(cacheDir: File, uri: String): File {
    val file = File.createTempFile("billet-ocr-", ".img", cacheDir)
    URL(uri).openStream().use { input -> file.outputStream().use { output -> input.copyTo(output) } }
    return file
  }

  private fun toLines(text: Text, width: Float, height: Float): List<Map<String, Any>> =
    text.textBlocks
      .flatMap { it.lines }
      .mapNotNull { line ->
        val box = line.boundingBox ?: return@mapNotNull null
        val value = line.text.trim()
        if (value.isEmpty()) null else value to box
      }
      .sortedWith(compareBy({ it.second.top }, { it.second.left }))
      .map { (value, box) ->
        mapOf(
          "text" to value,
          "box" to
            mapOf(
              "x" to clamp(box.left / width),
              "y" to clamp(box.top / height),
              "width" to clamp(box.width() / width),
              "height" to clamp(box.height() / height),
            ),
        )
      }

  private fun clamp(value: Float): Double = value.coerceIn(0f, 1f).toDouble()
}
