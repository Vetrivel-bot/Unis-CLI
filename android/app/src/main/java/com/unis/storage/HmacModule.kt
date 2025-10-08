// android/app/src/main/java/com/unis/storage/HmacModule.kt
package com.unis.storage

import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileInputStream
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

class HmacModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "Hmac"

    private fun hexStringToByteArray(sIn: String?): ByteArray {
        if (sIn.isNullOrBlank()) {
            throw IllegalArgumentException("hex string is null or blank")
        }
        val s = sIn.trim().lowercase()
        val cleanHex = if (s.length % 2 != 0) "0$s" else s
        val len = cleanHex.length
        val data = ByteArray(len / 2)
        var i = 0
        while (i < len) {
            val hi = Character.digit(cleanHex[i], 16)
            val lo = Character.digit(cleanHex[i + 1], 16)
            val high = if (hi >= 0) hi shl 4 else 0
            val low = if (lo >= 0) lo else 0
            data[i / 2] = (high + low).toByte()
            i += 2
        }
        return data
    }

    @ReactMethod
    fun computeHmac(filePath: String?, keyHex: String?, promise: Promise) {
        try {
            Log.d("HmacModule", "computeHmac called. filePath=${filePath}, keyHexPresent=${!keyHex.isNullOrEmpty()}")

            if (filePath.isNullOrEmpty()) {
                promise.reject("EINVAL", "File path is null or empty")
                return
            }

            if (keyHex.isNullOrEmpty()) {
                promise.reject("EINVAL", "Key hex is null or empty")
                return
            }

            val file = File(filePath)
            if (!file.exists()) {
                promise.reject("ENOENT", "File does not exist: $filePath")
                return
            }

            val keyBytes = try {
                hexStringToByteArray(keyHex)
            } catch (iae: IllegalArgumentException) {
                promise.reject("EINVAL", "Invalid key hex: ${iae.message}")
                return
            }

            val mac = Mac.getInstance("HmacSHA256")
            mac.init(SecretKeySpec(keyBytes, "HmacSHA256"))

            FileInputStream(file).use { input ->
                val buffer = ByteArray(64 * 1024)
                var read = input.read(buffer)
                while (read != -1) {
                    mac.update(buffer, 0, read)
                    read = input.read(buffer)
                }
            }

            val result = mac.doFinal()
            val base64 = Base64.encodeToString(result, Base64.NO_WRAP)
            promise.resolve(base64)

        } catch (e: Exception) {
            Log.e("HmacModule", "computeHmac failed", e)
            // ALWAYS pass a non-null code string to promise.reject
            promise.reject("HMAC_ERR", e.message ?: "An unknown error occurred in HmacModule", e)
        }
    }
}
