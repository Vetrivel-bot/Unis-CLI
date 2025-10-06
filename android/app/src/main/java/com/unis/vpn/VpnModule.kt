package com.unis.vpn

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.util.Log
import android.net.VpnService
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.unis.vpn.IpChecker.checkPublicIp

class VpnModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val TAG = "VpnModule"
    private val context = reactContext

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
        } catch (ex: Exception) {
            Log.w(TAG, "Failed to send event $eventName: ${ex.message}")
        }
    }

    private val vpnStateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val state = intent?.getStringExtra("state") ?: "UNKNOWN"
            sendEvent("VPN_STATE", state)
        }
    }

    override fun initialize() {
        super.initialize()
        try {
            val filter = IntentFilter("com.unis.vpn.STATE_CHANGED")
            context.registerReceiver(vpnStateReceiver, filter)
        } catch (ex: Exception) {
            Log.w(TAG, "Failed to register receiver: ${ex.message}")
        }
    }

    override fun invalidate() {
        super.invalidate()
        try {
            context.unregisterReceiver(vpnStateReceiver)
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
                // Need to request VPN permission - start MainActivity to handle it
                sendEvent("VPN_STATUS", "PERMISSION_REQUESTED")
                
                val intent = Intent(context, com.unis.MainActivity::class.java)
                intent.putExtra("vpn_action", "request_permission")
                intent.putExtra("config", config)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                
                Log.i(TAG, "Started MainActivity for VPN permission request")
            } else {
                // Permission already granted - start service directly
                checkPublicIp() 
                startVpnService(config)
                checkPublicIp() 
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
            val intent = Intent(context, WireGuardVpnService::class.java)
            intent.action = "STOP_VPN" // 🔑 Send stop action

            context.startService(intent)
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
}