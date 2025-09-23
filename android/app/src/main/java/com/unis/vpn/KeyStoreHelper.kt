package com.unis.vpn

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import android.util.Base64

object KeyStoreHelper {
    private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    private const val AES_MODE = "AES/GCM/NoPadding"
    private const val IV_SIZE = 12

    fun ensureKey(alias: String, useStrongBox: Boolean = true) {
        val ks = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        if (ks.getEntry(alias, null) != null) return

        val kg = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
        val specBuilder = KeyGenParameterSpec.Builder(
            alias,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setRandomizedEncryptionRequired(true)
            .setUserAuthenticationRequired(false)

        // Try StrongBox if requested
        if (useStrongBox) {
            try {
                specBuilder.setIsStrongBoxBacked(true)
            } catch (_: Throwable) { /* fallback silently */ }
        }

        kg.init(specBuilder.build())
        kg.generateKey()
    }

    fun encrypt(alias: String, plaintext: ByteArray): String {
        val ks = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        val key = ks.getKey(alias, null) as SecretKey
        val cipher = Cipher.getInstance(AES_MODE)
        cipher.init(Cipher.ENCRYPT_MODE, key)
        val iv = cipher.iv
        val out = cipher.doFinal(plaintext)
        val combined = ByteArray(iv.size + out.size)
        System.arraycopy(iv, 0, combined, 0, iv.size)
        System.arraycopy(out, 0, combined, iv.size, out.size)
        return Base64.encodeToString(combined, Base64.NO_WRAP)
    }

    fun decrypt(alias: String, base64: String): ByteArray {
        val combined = Base64.decode(base64, Base64.NO_WRAP)
        val iv = combined.copyOfRange(0, IV_SIZE)
        val ct = combined.copyOfRange(IV_SIZE, combined.size)
        val ks = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        val key = ks.getKey(alias, null) as SecretKey
        val cipher = Cipher.getInstance(AES_MODE)
        val spec = GCMParameterSpec(128, iv)
        cipher.init(Cipher.DECRYPT_MODE, key, spec)
        return cipher.doFinal(ct)
    }
}
