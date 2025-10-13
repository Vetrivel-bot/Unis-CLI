package com.unis.vpn

import android.app.ActivityManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.VpnService
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.unis.vpn.IpChecker.checkPublicIp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay

class VpnModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val TAG = "VpnModule"
    private val context = reactContext
    private var lastVpnState: String? = null

    init {
        instance = this
    }

    companion object {
        var instance: VpnModule? = null
    }

    override fun getName() = "VpnModule"

    fun sendEvent(eventName: String, params: String) {
        try {
            context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
            Log.d(TAG, "Sent event $eventName: $params")
        } catch (ex: Exception) {
            Log.w(TAG, "Failed to send event $eventName: ${ex.message}")
        }
    }

    private val vpnStateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val state = intent?.getStringExtra("state") ?: "UNKNOWN"
            lastVpnState = state
            sendEvent("VPN_STATE", state)
            Log.i(TAG, "Received VPN state: $state")
        }
    }

    override fun initialize() {
        super.initialize()
        try {
            val filter = IntentFilter("com.unis.vpn.STATE_CHANGED")
            context.registerReceiver(vpnStateReceiver, filter)
            Log.i(TAG, "Registered VPN state receiver")
        } catch (ex: Exception) {
            Log.w(TAG, "Failed to register receiver: ${ex.message}")
        }
    }

    override fun invalidate() {
        super.invalidate()
        try {
            context.unregisterReceiver(vpnStateReceiver)
            Log.i(TAG, "Unregistered VPN state receiver")
        } catch (ex: Exception) {
            Log.w(TAG, "Failed to unregister receiver: ${ex.message}")
        }
    }

    @ReactMethod
    fun startVpn(config: String) {
        Log.i(TAG, "Starting VPN with config length: ${config.length}")
        try {
            val prepareIntent = VpnService.prepare(context)
            if (prepareIntent != null) {
                // app doesn't have VPN permission -> ask via MainActivity
                sendEvent("VPN_STATUS", "PERMISSION_REQUESTED")
                val intent = Intent(context, com.unis.MainActivity::class.java)
                intent.putExtra("vpn_action", "request_permission")
                intent.putExtra("config", config)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                Log.i(TAG, "Started MainActivity for VPN permission request")
            } else {
                // permission already granted — call your ReactMethod checkVpnPermission(promise)
                // Create a tiny promise implementation to capture the result
                val permissionResult = booleanArrayOf(false)
                val tempPromise = object : Promise {
                    override fun resolve(value: Any?) {
                        try {
                            permissionResult[0] = (value as? Boolean) ?: false
                            Log.i(TAG, "TempPromise resolved: ${permissionResult[0]}")
                        } catch (ex: Exception) {
                            Log.w(TAG, "TempPromise resolve error: ${ex.message}")
                        }
                    }

                    // Implement common reject overloads so the anonymous object is valid against the RN Promise interface
                    override fun reject(code: String, message: String?) {
                        Log.e(TAG, "TempPromise rejected: code=$code message=$message")
                    }

                    override fun reject(code: String, throwable: Throwable?) {
                        Log.e(TAG, "TempPromise rejected: code=$code throwable=${throwable?.message}")
                    }

                    override fun reject(code: String, message: String?, throwable: Throwable?) {
                        Log.e(TAG, "TempPromise rejected: code=$code message=$message throwable=${throwable?.message}")
                    }

                    override fun reject(throwable: Throwable) {
                        Log.e(TAG, "TempPromise rejected throwable: ${throwable.message}")
                    }

                    override fun reject(throwable: Throwable, userInfo: WritableMap) {
                        Log.e(TAG, "TempPromise rejected throwable with userInfo: ${throwable.message}")
                    }

                    override fun reject(code: String, userInfo: WritableMap) {
                        Log.e(TAG, "TempPromise rejected code with userInfo: $code")
                    }

                    override fun reject(code: String, throwable: Throwable?, userInfo: WritableMap) {
                        Log.e(TAG, "TempPromise rejected code with throwable and userInfo: $code ${throwable?.message}")
                    }

                    override fun reject(code: String, message: String?, userInfo: WritableMap) {
                        Log.e(TAG, "TempPromise rejected code with message and userInfo: $code $message")
                    }

                    override fun reject(code: String?, message: String?, throwable: Throwable?, userInfo: WritableMap?) {
                        Log.e(TAG, "TempPromise rejected generic: code=$code message=$message throwable=${throwable?.message}")
                    }

                    override fun reject(message: String) {
                        Log.e(TAG, "TempPromise rejected message: $message")
                    }
                }

                // Call the ReactMethod version (it will synchronously call promise.resolve)
                checkVpnPermission(tempPromise)

                // Decision based on the promise result (synchronous for our checkVpnPermission implementation)
                if (permissionResult[0]) {
                    startVpnService(config)
                    CoroutineScope(Dispatchers.IO).launch {
                        waitForVpnConnection()
                    }
                } else {
                    // If for some reason permission is false (shouldn't happen here), request it via MainActivity
                    sendEvent("VPN_STATUS", "PERMISSION_REQUIRED")
                    val intent = Intent(context, com.unis.MainActivity::class.java)
                    intent.putExtra("vpn_action", "request_permission")
                    intent.putExtra("config", config)
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    context.startActivity(intent)
                    Log.i(TAG, "Started MainActivity to request permission (fallback)")
                }
            }
        } catch (ex: Exception) {
            Log.e(TAG, "Failed to start VPN: ${ex.message}")
            sendEvent("VPN_ERROR", "Failed to start VPN: ${ex.message}")
        }
    }

    @ReactMethod
    fun stopVpn() {
        Log.i(TAG, "Stopping VPN")
        try {
            val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val isServiceRunning = activityManager.getRunningServices(Integer.MAX_VALUE)
                .any { it.service.className == WireGuardVpnService::class.java.name }
            if (!isServiceRunning) {
                Log.w(TAG, "VPN service is not running")
                sendEvent("VPN_STATUS", "ALREADY_STOPPED")
                return
            }
            val intent = Intent(context, WireGuardVpnService::class.java)
            intent.action = "STOP_VPN"
            context.startService(intent)
            Log.i(TAG, "stopService vpn")

        } catch (ex: Exception) {
            Log.e(TAG, "Failed to stop VPN: ${ex.message}")
            sendEvent("VPN_ERROR", "Failed to stop VPN: ${ex.message}")
        }
    }

    @ReactMethod
    fun checkVpnPermission(promise: Promise) {
        try {
            val hasPermission = VpnService.prepare(context) == null
            promise.resolve(hasPermission)
            Log.i(TAG, "VPN permission check: $hasPermission")
        } catch (ex: Exception) {
            Log.e(TAG, "VPN permission check error: ${ex.message}")
            promise.reject("VPN_PERMISSION_ERROR", ex.message)
        }
    }

    private fun checkVpnPermission(): Boolean {
        return VpnService.prepare(context) == null
    }

    private fun startVpnService(config: String) {
        try {
            val intent = Intent(context, WireGuardVpnService::class.java)
            intent.putExtra("config", config)
            context.startService(intent)
            sendEvent("VPN_STATUS", "STARTED")
            Log.i(TAG, "VPN service started successfully")
        } catch (ex: Exception) {
            Log.e(TAG, "Failed to start VPN service: ${ex.message}")
            sendEvent("VPN_ERROR", "Failed to start VPN service: ${ex.message}")
        }
    }

    private suspend fun waitForVpnConnection() {
        val timeout = System.currentTimeMillis() + 60000L * 1 // adjust as needed
        while (System.currentTimeMillis() < timeout) {
            delay(500)
            checkPublicIp()
        }
    }
}
