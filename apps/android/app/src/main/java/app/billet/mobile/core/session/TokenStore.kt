package app.billet.mobile.core.session

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.core.content.edit
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable data class SessionTokens(val accessToken: String, val refreshToken: String)

class TokenStore(context: Context) {
    private val preferences = context.getSharedPreferences("billet-secure-session", Context.MODE_PRIVATE)
    private val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }

    fun read(): SessionTokens? = runCatching {
        val ciphertext = preferences.getString(CIPHERTEXT, null) ?: return null
        val iv = preferences.getString(IV, null) ?: return null
        val cipher = Cipher.getInstance(TRANSFORMATION).apply {
            init(
                Cipher.DECRYPT_MODE,
                encryptionKey(),
                GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP)),
            )
        }
        Json.decodeFromString<SessionTokens>(
            cipher.doFinal(Base64.decode(ciphertext, Base64.NO_WRAP)).decodeToString(),
        )
    }.getOrElse {
        clear()
        null
    }

    fun write(tokens: SessionTokens?) {
        if (tokens == null) {
            clear()
            return
        }
        val cipher = Cipher.getInstance(TRANSFORMATION).apply {
            init(Cipher.ENCRYPT_MODE, encryptionKey())
        }
        val ciphertext = cipher.doFinal(Json.encodeToString(tokens).encodeToByteArray())
        preferences.edit(commit = true) {
            putString(CIPHERTEXT, Base64.encodeToString(ciphertext, Base64.NO_WRAP))
            putString(IV, Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
        }
    }

    fun clear() {
        preferences.edit { clear() }
    }

    private fun encryptionKey(): SecretKey {
        (keyStore.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").run {
            init(
                KeyGenParameterSpec.Builder(
                    KEY_ALIAS,
                    KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
                )
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setKeySize(256)
                    .build(),
            )
            generateKey()
        }
    }

    private companion object {
        const val KEY_ALIAS = "billet-session-tokens"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
        const val CIPHERTEXT = "ciphertext"
        const val IV = "iv"
    }
}
