package com.unis.vpn

import android.app.Activity
import android.content.Intent
import android.net.VpnService
import android.os.Bundle
import android.util.Log

class VpnPermissionActivity : Activity() {
    private val TAG = "VpnPermissionActivity"
    
    companion object {
        const val VPN_REQUEST_CODE = 1234
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val config = intent.getStringExtra("config") ?: ""
        Log.i(TAG, "VpnPermissionActivity created with config length: ${config.length}")
        
        requestVpnPermission(config)
    }

    private fun requestVpnPermission(config: String) {
        try {
            val prepareIntent = VpnService.prepare(this)
            if (prepareIntent != null) {
                // Start system VPN permission dialog
                startActivityForResult(prepareIntent, VPN_REQUEST_CODE)
            } else {
                // Permission already granted, start VPN service
                startVpnService(config)
                finish()
            }
        } catch (ex: Exception) {
            Log.e(TAG, "Error requesting VPN permission: ${ex.message}", ex)
            finish()
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        
        if (requestCode == VPN_REQUEST_CODE) {
            val config = intent.getStringExtra("config") ?: ""
            
            if (resultCode == RESULT_OK) {
                Log.i(TAG, "VPN permission granted")
                startVpnService(config)
            } else {
                Log.w(TAG, "VPN permission denied by user")
                // Send event back to React Native
                sendVpnEvent("PERMISSION_DENIED")
            }
            finish()
        }
    }

    private fun startVpnService(config: String) {
        try {
            val intent = Intent(this, WireGuardVpnService::class.java)
            intent.putExtra("config", config)
            startService(intent)
            Log.i(TAG, "VPN service started after permission grant")
            sendVpnEvent("PERMISSION_GRANTED")
        } catch (ex: Exception) {
            Log.e(TAG, "Failed to start VPN service: ${ex.message}", ex)
            sendVpnEvent("START_FAILED: ${ex.message}")
        }
    }

    private fun sendVpnEvent(message: String) {
        try {
            val eventIntent = Intent("com.unis.vpn.STATE_CHANGED")
            eventIntent.putExtra("state", message)
            eventIntent.setPackage(packageName)
            sendBroadcast(eventIntent)
        } catch (ex: Exception) {
            Log.w(TAG, "Failed to send VPN event: ${ex.message}", ex)
        }
    }
}