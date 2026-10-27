package app.billet.mobile.core.network

import app.billet.mobile.BuildConfig
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URI
import java.net.URLEncoder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.KSerializer
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject

class ApiException(message: String, val statusCode: Int) : IOException(message)

class ApiClient(
    private val baseUrl: String = BuildConfig.API_BASE_URL,
    private val tokenProvider: () -> String? = { null },
    private val tokenRefresher: (suspend (String?) -> String?)? = null,
) {
    val json = Json { ignoreUnknownKeys = true; explicitNulls = false }

    suspend fun <T> request(
        path: String,
        serializer: KSerializer<T>,
        method: String = "GET",
        body: String? = null,
    ): T = withRefresh {
        val connection = open(path, method)
        try {
            if (body != null) {
                connection.setRequestProperty("Content-Type", "application/json")
                connection.doOutput = true
                connection.outputStream.use { it.write(body.toByteArray()) }
            }
            val response = responseBytes(connection)
            json.decodeFromString(serializer, response.decodeToString())
        } finally {
            connection.disconnect()
        }
    }

    suspend inline fun <reified T> request(
        path: String,
        method: String = "GET",
        body: String? = null,
    ): T = request(path, kotlinx.serialization.serializer(), method, body)

    suspend inline fun <reified B, reified T> request(path: String, method: String, body: B): T =
        request(path, method, json.encodeToString(body))

    suspend fun send(path: String, method: String) = withRefresh {
        val connection = open(path, method)
        try {
            responseBytes(connection)
        } finally {
            connection.disconnect()
        }
    }

    suspend fun upload(url: String, data: ByteArray, mimeType: String) = withRefresh {
        val connection = (URI(url).toURL().openConnection() as HttpURLConnection).apply {
            requestMethod = "PUT"
            connectTimeout = 30_000
            readTimeout = 30_000
            doOutput = true
            setFixedLengthStreamingMode(data.size)
            setRequestProperty("Content-Type", mimeType)
            tokenProvider()?.let { setRequestProperty("Authorization", "Bearer $it") }
        }
        try {
            connection.outputStream.use { it.write(data) }
            responseBytes(connection)
        } finally {
            connection.disconnect()
        }
    }

    suspend fun bytes(path: String): ByteArray = withRefresh {
        val connection = open(path, "GET")
        try {
            responseBytes(connection)
        } finally {
            connection.disconnect()
        }
    }

    private suspend fun <T> withRefresh(block: () -> T): T = withContext(Dispatchers.IO) {
        val failedToken = tokenProvider()
        try {
            block()
        } catch (error: ApiException) {
            if (
                error.statusCode != 401 ||
                tokenRefresher == null ||
                tokenRefresher.invoke(failedToken) == null
            ) {
                throw error
            }
            block()
        }
    }

    private fun open(path: String, method: String): HttpURLConnection {
        val url = if (path.startsWith("http://") || path.startsWith("https://")) path else {
            "${baseUrl.trimEnd('/')}/${path.trimStart('/')}"
        }
        return (URI(url).toURL().openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 30_000
            readTimeout = 30_000
            setRequestProperty("Accept", "application/json")
            tokenProvider()?.let { setRequestProperty("Authorization", "Bearer $it") }
        }
    }

    private fun responseBytes(connection: HttpURLConnection): ByteArray {
        val code = connection.responseCode
        val stream = if (code in 200..299) connection.inputStream else connection.errorStream
        val data = stream?.use { it.readBytes() } ?: byteArrayOf()
        if (code !in 200..299) {
            val message = runCatching {
                json.parseToJsonElement(data.decodeToString()).jsonObject["message"]?.let { value ->
                    value.toString().trim('"')
                }
            }.getOrNull() ?: "Yêu cầu thất bại ($code)."
            throw ApiException(message, code)
        }
        return data
    }

    companion object {
        fun encode(value: String): String = URLEncoder.encode(value, "UTF-8")
    }
}
