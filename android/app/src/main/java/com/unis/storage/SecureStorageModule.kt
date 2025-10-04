package com.unis.storage

import android.content.Context
import android.content.pm.ApplicationInfo
import android.util.Base64
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.facebook.react.bridge.*
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties

class SecureStorageModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val ctx: Context get() = reactApplicationContext

    // meta preferences (plain) store current alias / filename
    private val metaPrefs by lazy {
        ctx.getSharedPreferences("secure_store_meta", Context.MODE_PRIVATE)
    }

    private val DEFAULT_PREF_NAME = "secure_store"

    init {
        if (!metaPrefs.contains("current_master_alias")) {
            metaPrefs.edit().putString("current_master_alias", MasterKey.DEFAULT_MASTER_KEY_ALIAS).apply()
        }
        if (!metaPrefs.contains("current_pref_name")) {
            metaPrefs.edit().putString("current_pref_name", DEFAULT_PREF_NAME).apply()
        }
    }

    // Build a MasterKey for a given alias. Uses AES256-GCM key scheme.
    private fun buildMasterKeyForAlias(alias: String, requestStrongBox: Boolean = false): MasterKey {
        val builder = if (alias == MasterKey.DEFAULT_MASTER_KEY_ALIAS) {
            MasterKey.Builder(ctx)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        } else {
            MasterKey.Builder(ctx, alias)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        }

        if (requestStrongBox) {
            try {
                builder.setRequestStrongBoxBacked(true)
            } catch (ignored: Exception) {}
        }

        return builder.build()
    }

    private fun getCurrentMasterAlias(): String {
        return metaPrefs.getString("current_master_alias", MasterKey.DEFAULT_MASTER_KEY_ALIAS)!!
    }

    private fun setCurrentMasterAlias(alias: String) {
        metaPrefs.edit().putString("current_master_alias", alias).apply()
    }

    private fun getCurrentPrefName(): String {
        return metaPrefs.getString("current_pref_name", DEFAULT_PREF_NAME) ?: DEFAULT_PREF_NAME
    }

    private fun setCurrentPrefName(name: String) {
        metaPrefs.edit().putString("current_pref_name", name).apply()
    }

    // Return EncryptedSharedPreferences using the current alias/pref file
    private fun getEncryptedPrefsForCurrentKey(): android.content.SharedPreferences {
        val alias = getCurrentMasterAlias()
        val prefName = getCurrentPrefName()
        val masterKey = buildMasterKeyForAlias(alias)
        return EncryptedSharedPreferences.create(
            ctx,
            prefName,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    override fun getName() = "SecureStorage"

    // Basic operations
    private fun saveInternal(key: String, value: String) {
        val prefs = getEncryptedPrefsForCurrentKey()
        prefs.edit().putString(key, value).commit()
    }

    private fun getInternal(key: String): String? {
        val prefs = getEncryptedPrefsForCurrentKey()
        return prefs.getString(key, null)
    }

    @ReactMethod
    fun save(key: String, value: String, promise: Promise) {
        try {
            saveInternal(key, value)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SAVE_ERROR", e)
        }
    }

    @ReactMethod
    fun get(key: String, promise: Promise) {
        try {
            val value = getInternal(key)
            promise.resolve(value)
        } catch (e: Exception) {
            promise.reject("GET_ERROR", e)
        }
    }

    @ReactMethod
    fun remove(key: String, promise: Promise) {
        try {
            val prefs = getEncryptedPrefsForCurrentKey()
            prefs.edit().remove(key).commit()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("REMOVE_ERROR", e)
        }
    }

    @ReactMethod
    fun clear(promise: Promise) {
        try {
            val prefs = getEncryptedPrefsForCurrentKey()
            prefs.edit().clear().commit()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLEAR_ERROR", e)
        }
    }

    // Debug-only raw (disabled in release)
    @ReactMethod
    fun getRaw(key: String, promise: Promise) {
        try {
            val isDebug = (ctx.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
            if (!isDebug) {
                promise.reject("NOT_ALLOWED", "getRaw is disabled in release builds")
                return
            }

            val allPrefs = getEncryptedPrefsForCurrentKey().all
            val encryptedValue = allPrefs[key] as? String
            if (encryptedValue != null) {
                val bytes = encryptedValue.toByteArray(Charsets.ISO_8859_1)
                val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                promise.resolve(base64)
            } else {
                promise.resolve(null)
            }
        } catch (e: Exception) {
            promise.reject("GET_RAW_ERROR", e)
        }
    }

    // Biometric-protected operations (optional)
    private fun getMainExecutor() = ContextCompat.getMainExecutor(ctx)

    @ReactMethod
    fun saveWithAuth(key: String, value: String, promise: Promise) {
        val act = getCurrentActivity()
        val activity = act as? FragmentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Activity required for biometric authentication")
            return
        }

        val prompt = BiometricPrompt(activity, getMainExecutor(), object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                try {
                    saveInternal(key, value)
                    promise.resolve(true)
                } catch (e: Exception) {
                    promise.reject("SAVE_AUTH_ERROR", e)
                }
            }

            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                promise.reject("AUTH_ERROR", errString.toString())
            }
        })

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Authenticate to save secret")
            .setNegativeButtonText("Cancel")
            .build()

        prompt.authenticate(promptInfo)
    }

    @ReactMethod
    fun getWithAuth(key: String, promise: Promise) {
        val act = getCurrentActivity()
        val activity = act as? FragmentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Activity required for biometric authentication")
            return
        }

        val prompt = BiometricPrompt(activity, getMainExecutor(), object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                try {
                    val v = getInternal(key)
                    promise.resolve(v)
                } catch (e: Exception) {
                    promise.reject("GET_AUTH_ERROR", e)
                }
            }

            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                promise.reject("AUTH_ERROR", errString.toString())
            }
        })

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Authenticate to access secret")
            .setNegativeButtonText("Cancel")
            .build()

        prompt.authenticate(promptInfo)
    }

    // --- Key rotation ---
    @ReactMethod
    fun rotateMasterKey(promise: Promise) {
        try {
            // --- FIX: Store the old preference name BEFORE changing the metadata ---
            val oldPrefNameToDelete = getCurrentPrefName()

            val newAlias = "master_" + System.currentTimeMillis().toString()
            val newPrefName = "${ctx.packageName}.secure_store_${System.currentTimeMillis()}"

            val newMasterKey = buildMasterKeyForAlias(newAlias, requestStrongBox = false)

            val newPrefs = EncryptedSharedPreferences.create(
                ctx,
                newPrefName,
                newMasterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )

            val oldPrefs = getEncryptedPrefsForCurrentKey()
            val all = oldPrefs.all

            val editor = newPrefs.edit()
            for ((k, v) in all) {
                when (v) {
                    is String -> editor.putString(k, v)
                    is Int -> editor.putInt(k, v)
                    is Boolean -> editor.putBoolean(k, v)
                    is Float -> editor.putFloat(k, v)
                    is Long -> editor.putLong(k, v)
                    else -> editor.putString(k, v.toString())
                }
            }
            editor.commit()

            // Now update the pointers
            setCurrentMasterAlias(newAlias)
            setCurrentPrefName(newPrefName)

            // --- FIX: Delete the old file using the saved variable ---
            try {
                if (oldPrefNameToDelete != newPrefName) { // Safety check
                    ctx.deleteSharedPreferences(oldPrefNameToDelete)
                }
            } catch (ignored: Exception) {}

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ROTATE_ERROR", e)
        }
    }

    // Migrate to StrongBox if available
    @ReactMethod
    fun migrateToStrongBoxIfAvailable(promise: Promise) {
        try {
            // --- FIX: Store the old preference name BEFORE changing the metadata ---
            val oldPrefNameToDelete = getCurrentPrefName()

            val newAlias = "master_sb_" + System.currentTimeMillis()
            val newPrefName = "${ctx.packageName}.secure_store_sb_${System.currentTimeMillis()}"

            val newMasterKey = try {
                buildMasterKeyForAlias(newAlias, requestStrongBox = true)
            } catch (e: Exception) {
                // Fallback to non-strongbox if it fails
                buildMasterKeyForAlias(newAlias, requestStrongBox = false)
            }

            val newPrefs = EncryptedSharedPreferences.create(
                ctx,
                newPrefName,
                newMasterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )

            val oldPrefs = getEncryptedPrefsForCurrentKey()
            val all = oldPrefs.all
            val editor = newPrefs.edit()
            for ((k, v) in all) {
                when (v) {
                    is String -> editor.putString(k, v)
                    is Int -> editor.putInt(k, v)
                    is Boolean -> editor.putBoolean(k, v)
                    is Float -> editor.putFloat(k, v)
                    is Long -> editor.putLong(k, v)
                    else -> editor.putString(k, v.toString())
                }
            }
            editor.commit()

            // Now update the pointers to the new key and file
            setCurrentMasterAlias(newAlias)
            setCurrentPrefName(newPrefName)

            // --- FIX: Delete the old file using the saved variable ---
            try {
                if (oldPrefNameToDelete != newPrefName) { // Safety check
                    ctx.deleteSharedPreferences(oldPrefNameToDelete)
                }
            } catch (ignored: Exception) {}

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("MIGRATE_STRONGBOX_ERROR", e)
        }
    }
}
