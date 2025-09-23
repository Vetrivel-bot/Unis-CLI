package com.unis.vpn

import android.content.Context
import android.content.SharedPreferences

object SecureStorage {
    private const val PREFS = "unis_secure_prefs"
    private const val KEY_WG = "wg_encrypted_key"
    private const val KEY_CONFIG = "wg_encrypted_config"
    fun storeEncryptedKey(context: Context, base64Encrypted: String) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_WG, base64Encrypted).apply()
    }
    fun readEncryptedKey(context: Context): String? {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return prefs.getString(KEY_WG, null)
    }
    fun storeEncryptedConfig(context: Context, base64Encrypted: String) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_CONFIG, base64Encrypted).apply()
    }
    fun readEncryptedConfig(context: Context): String? {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return prefs.getString(KEY_CONFIG, null)
    }
}
