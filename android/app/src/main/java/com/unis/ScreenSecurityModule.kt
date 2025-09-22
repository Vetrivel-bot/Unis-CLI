package com.unis

import android.view.WindowManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ScreenSecurityModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ScreenSecurityModule"

    @ReactMethod
    fun enableSecurity() {
        val activity = reactApplicationContext.currentActivity ?: return
        activity.runOnUiThread {
            try {
                val window = activity.window ?: return@runOnUiThread
                if (!activity.isFinishing) {
                    window.setFlags(
                        WindowManager.LayoutParams.FLAG_SECURE,
                        WindowManager.LayoutParams.FLAG_SECURE
                    )
                }
            } catch (_: Exception) {}
        }
    }

    @ReactMethod
    fun disableSecurity() {
        val activity = reactApplicationContext.currentActivity ?: return
        activity.runOnUiThread {
            try {
                val window = activity.window ?: return@runOnUiThread
                if (!activity.isFinishing) {
                    window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
                }
            } catch (_: Exception) {}
        }
    }
}
