package com.unis.vpn

import android.content.Intent
import android.os.Build
import android.util.Base64
import com.facebook.react.bridge.*
import java.lang.Exception

class VpnModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "VpnModule"

    @ReactMethod
    fun storePrivateKey(base64PrivateKey: String, promise: Promise) {
        try {
            val alias = "wg_key"

            // Try StrongBox first, fallback to software keystore
            try {
                KeyStoreHelper.ensureKey(alias, useStrongBox = true)
            } catch (_: Throwable) {
                KeyStoreHelper.ensureKey(alias, useStrongBox = false)
            }

            val raw = Base64.decode(base64PrivateKey, Base64.NO_WRAP)
            val enc = KeyStoreHelper.encrypt(alias, raw)
            SecureStorage.storeEncryptedKey(reactApplicationContext, enc)

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_STORE_KEY", e)
        }
    }

    @ReactMethod
    fun startVpn(allowedApps: ReadableArray, ifaceAddress: String, promise: Promise) {
        try {
            val list = ArrayList<String>()
            for (i in 0 until allowedApps.size()) list.add(allowedApps.getString(i) ?: "")

            val intent = Intent(reactApplicationContext, MyVpnService::class.java)
            intent.putStringArrayListExtra("allowed_apps", list)
            intent.putExtra("wg_alias", "wg_key")
            intent.putExtra("iface_address", ifaceAddress)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(intent)
            } else {
                reactApplicationContext.startService(intent)
            }

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_START_VPN", e)
        }
    }

    @ReactMethod
    fun stopVpn(promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, MyVpnService::class.java)
            reactApplicationContext.stopService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_STOP_VPN", e)
        }
    }
}
