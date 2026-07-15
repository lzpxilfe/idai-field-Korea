package kr.idai.fieldmobile

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.vision.digitalink.DigitalInkRecognition
import com.google.mlkit.vision.digitalink.DigitalInkRecognitionModel
import com.google.mlkit.vision.digitalink.DigitalInkRecognitionModelIdentifier
import com.google.mlkit.vision.digitalink.DigitalInkRecognizerOptions
import com.google.mlkit.vision.digitalink.Ink
import com.google.mlkit.vision.digitalink.RecognitionContext
import com.google.mlkit.vision.digitalink.WritingArea
import org.json.JSONObject

class KoreanHandwritingRecognitionModule(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  companion object {
    const val ENGINE_ID = "ml-kit-digital-ink-ko-18.1"
  }

  override fun getName(): String = "KoreanHandwritingRecognition"

  @ReactMethod
  fun getModelStatus(promise: Promise) {
    try {
      val model = createModel()
      RemoteModelManager.getInstance().isModelDownloaded(model)
        .addOnSuccessListener { downloaded ->
          val result = Arguments.createMap()
          result.putBoolean("downloaded", downloaded)
          result.putString("engine", ENGINE_ID)
          promise.resolve(result)
        }
        .addOnFailureListener { error -> reject(promise, "MODEL_STATUS_FAILED", error) }
    } catch (error: Exception) {
      reject(promise, "MODEL_STATUS_FAILED", error)
    }
  }

  @ReactMethod
  fun downloadModel(promise: Promise) {
    try {
      val model = createModel()
      RemoteModelManager.getInstance()
        .download(model, DownloadConditions.Builder().build())
        .addOnSuccessListener {
          val result = Arguments.createMap()
          result.putBoolean("downloaded", true)
          result.putString("engine", ENGINE_ID)
          promise.resolve(result)
        }
        .addOnFailureListener { error -> reject(promise, "MODEL_DOWNLOAD_FAILED", error) }
    } catch (error: Exception) {
      reject(promise, "MODEL_DOWNLOAD_FAILED", error)
    }
  }

  @ReactMethod
  fun recognize(
    serializedStrokes: String,
    writingWidth: Double,
    writingHeight: Double,
    preContext: String,
    promise: Promise
  ) {
    try {
      val model = createModel()
      RemoteModelManager.getInstance()
        .download(model, DownloadConditions.Builder().build())
        .addOnSuccessListener {
          recognizeDownloadedModel(
            model,
            serializedStrokes,
            writingWidth,
            writingHeight,
            preContext,
            promise
          )
        }
        .addOnFailureListener { error -> reject(promise, "MODEL_DOWNLOAD_FAILED", error) }
    } catch (error: Exception) {
      reject(promise, "RECOGNITION_FAILED", error)
    }
  }

  private fun recognizeDownloadedModel(
    model: DigitalInkRecognitionModel,
    serializedStrokes: String,
    writingWidth: Double,
    writingHeight: Double,
    preContext: String,
    promise: Promise
  ) {
    val recognizer = DigitalInkRecognition.getClient(
      DigitalInkRecognizerOptions.builder(model).build()
    )

    try {
      val ink = buildInk(serializedStrokes)
      val contextBuilder = RecognitionContext.builder()
        .setWritingArea(WritingArea(writingWidth.toFloat(), writingHeight.toFloat()))
        .setPreContext(preContext.takeLast(20))

      recognizer.recognize(ink, contextBuilder.build())
        .addOnSuccessListener { recognitionResult ->
          val candidates = Arguments.createArray()
          recognitionResult.candidates.forEach { candidate ->
            candidates.pushString(candidate.text)
          }
          val result = Arguments.createMap()
          result.putString("text", recognitionResult.candidates.firstOrNull()?.text ?: "")
          result.putArray("candidates", candidates)
          result.putString("engine", ENGINE_ID)
          result.putBoolean("modelDownloaded", true)
          recognizer.close()
          promise.resolve(result)
        }
        .addOnFailureListener { error ->
          recognizer.close()
          reject(promise, "RECOGNITION_FAILED", error)
        }
    } catch (error: Exception) {
      recognizer.close()
      reject(promise, "INVALID_INK", error)
    }
  }

  private fun buildInk(serializedStrokes: String): Ink {
    val root = JSONObject(serializedStrokes)
    val strokes = root.optJSONArray("strokes")
      ?: throw IllegalArgumentException("No handwriting strokes were supplied")
    val inkBuilder = Ink.builder()
    var fallbackTime = System.currentTimeMillis()

    for (strokeIndex in 0 until strokes.length()) {
      val strokeObject = strokes.optJSONObject(strokeIndex) ?: continue
      if (strokeObject.optString("tool", "pen") == "eraser") continue
      val points = strokeObject.optJSONArray("points") ?: continue
      if (points.length() == 0) continue
      val strokeBuilder = Ink.Stroke.builder()
      var validPointCount = 0

      for (pointIndex in 0 until points.length()) {
        val point = points.optJSONObject(pointIndex) ?: continue
        val x = point.optDouble("x", Double.NaN)
        val y = point.optDouble("y", Double.NaN)
        if (!x.isFinite() || !y.isFinite()) continue
        val timestamp = if (point.has("t")) point.optLong("t") else fallbackTime
        strokeBuilder.addPoint(Ink.Point.create(x.toFloat(), y.toFloat(), timestamp))
        validPointCount += 1
        fallbackTime = maxOf(fallbackTime + 8L, timestamp + 1L)
      }

      if (validPointCount > 0) inkBuilder.addStroke(strokeBuilder.build())
      fallbackTime += 45L
    }

    return inkBuilder.build()
  }

  private fun createModel(): DigitalInkRecognitionModel {
    val identifier = DigitalInkRecognitionModelIdentifier.fromLanguageTag("ko")
      ?: throw IllegalStateException("Korean handwriting model is unavailable")
    return DigitalInkRecognitionModel.builder(identifier).build()
  }

  private fun reject(promise: Promise, code: String, error: Throwable) {
    promise.reject(code, error.message ?: code, error)
  }
}
