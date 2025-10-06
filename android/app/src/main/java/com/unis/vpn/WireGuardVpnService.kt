package com.unis.vpn


import android.annotation.SuppressLint
import android.app.Service
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import android.util.Log
import android.content.pm.ServiceInfo
import com.unis.BuildConfig
import com.wireguard.android.backend.GoBackend
import com.wireguard.android.backend.Tunnel
import com.wireguard.android.backend.Tunnel.State
import com.wireguard.config.Config
import java.io.BufferedReader
import java.io.StringReader

import android.app.NotificationManager

@SuppressLint("VpnServicePolicy")
class WireGuardVpnService : VpnService() {
    private var vpnInterface: ParcelFileDescriptor? = null
    private var backend: GoBackend? = null
    private var tunnel: Tunnel? = null
    private lateinit var notificationManager: VpnNotificationManager

    companion object {
        private const val TAG = "UnisWireGuardVPN"
    }

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "VPN Service created")
        notificationManager = VpnNotificationManager(this)
    }

    @SuppressLint("ForegroundServiceType")
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.i(TAG, "VPN Service starting...")

        val action = intent?.action
        when (action) {
            "STOP_VPN" -> {
                Log.i(TAG, "Received STOP_VPN action")
                stopVpnConnection()
                return START_NOT_STICKY
            }
        }

        val configText = intent?.getStringExtra("config") ?: run {
            Log.e(TAG, "No config provided")
            sendErrorNotification("VPN Config Missing")
            sendVpnState("ERROR: Config missing")
            stopSelf()
            return START_NOT_STICKY
        }

        if (configText.isBlank()) {
            Log.e(TAG, "Empty config provided")
            sendErrorNotification("VPN Config Empty")
            sendVpnState("ERROR: Config empty")
            stopSelf()
            return START_NOT_STICKY
        }

        Log.i(TAG, "Starting VPN with config length: ${configText.length}")

        // Start VPN connection in background thread
        Thread {
            startVpnConnection(configText)
        }.start()

        return START_STICKY
    }

    private fun startVpnConnection(configText: String) {
        try {
            // Start foreground service first
            startForegroundService("Connecting...")
            sendVpnState("CONNECTING")

            val config = Config.parse(BufferedReader(StringReader(configText)))
            backend = GoBackend(this)



            // Tunnel listener
            tunnel = object : Tunnel {
                override fun getName() = "UnisWireGuardVPN"

                override fun onStateChange(newState: State) {
                    Log.i(TAG, "Tunnel state changed to: $newState")
                    when (newState) {
                        State.UP -> {
                            Log.i(TAG, "Tunnel is UP, VPN connected\"")
                            updateForegroundNotification("VPN Connected - Secured")
                            sendVpnState("CONNECTED")
                        }
                        State.DOWN -> {
                            Log.i(TAG, "VPN disconnected")
                            updateForegroundNotification("VPN Disconnected")
                            sendVpnState("DISCONNECTED")
                        }
                        State.TOGGLE -> {
                            Log.i(TAG, "VPN toggled")
                            sendVpnState("RECONNECTING")
                        }
                        else -> {
                            Log.i(TAG, "VPN state: $newState")
                            updateForegroundNotification("VPN: $newState")
                            sendVpnState(newState.name)
                        }
                    }
                }
            }

            // Start tunnel
            backend?.setState(tunnel!!, State.UP, config)

            // Build VPN interface
            val builder = Builder()
            builder.setSession("UnisWireGuardVPN")

            // Add addresses
            config.`interface`.addresses.forEach { addr ->
                try {
                    builder.addAddress(addr.address.hostAddress, addr.mask)
                    Log.i(TAG, "Added address: ${addr.address.hostAddress}/${addr.mask}")
                } catch (ex: Exception) {
                    Log.w(TAG, "Failed to add address ${addr.address}: ${ex.message}", ex)
                }
            }

            // Add DNS
            config.`interface`.dnsServers.forEach { dns ->
                try {
                    builder.addDnsServer(dns.hostAddress)
                    Log.i(TAG, "Added DNS: ${dns.hostAddress}")
                } catch (ex: Exception) {
                    Log.w(TAG, "Failed to add DNS ${dns.hostAddress}: ${ex.message}", ex)
                }
            }

            // Routes

            // Exclude RN packages in debug
            if (BuildConfig.DEBUG) {
                try {
                    builder.addDisallowedApplication("com.facebook.react")
                    builder.addDisallowedApplication("com.facebook.react.devsupport")
                    builder.addDisallowedApplication("com.facebook.react.packagerconnection")
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to exclude React Native packages: ${e.message}")
                }
            }

            // Allow our app
            try {
                builder.addAllowedApplication("com.unis")
                Log.i(TAG, "Allowed app: com.unis")
            } catch (e: Exception) {
                Log.w(TAG, "Failed to allow app com.unis: ${e.message}")
            }

            vpnInterface = builder.establish()
            Log.i(TAG, "VPN interface established")

        } catch (e: Exception) {
            Log.e(TAG, "Error starting VPN: ${e.message}", e)
            sendErrorNotification("VPN Error: ${e.message}")
            sendVpnState("ERROR: ${e.message}")
            stopSelf()
        }
    }




    @SuppressLint("ForegroundServiceType")
    private fun startForegroundService(content: String) {
        val notification = notificationManager.buildNotification(content)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // SOLUTION: Change this to match the AndroidManifest.xml
            val foregroundServiceType = ServiceInfo.FOREGROUND_SERVICE_TYPE_REMOTE_MESSAGING
            startForeground(VpnNotificationManager.FOREGROUND_SERVICE_ID, notification, foregroundServiceType)
        } else {
            // Fallback for older Android versions
            startForeground(VpnNotificationManager.FOREGROUND_SERVICE_ID, notification)
        }
        Log.i(TAG, "Foreground service started: $content")
    }



    private fun updateForegroundNotification(content: String) {
        val notification = notificationManager.buildNotification(content)
        val notificationManager = getSystemService(NotificationManager::class.java)
        notificationManager.notify(VpnNotificationManager.FOREGROUND_SERVICE_ID, notification)
        Log.i(TAG, "Notification updated: $content")
    }

    private fun sendErrorNotification(content: String) {
        val notification = notificationManager.buildNotification(content)
        val notificationManager = getSystemService(NotificationManager::class.java)
        notificationManager.notify(VpnNotificationManager.NOTIFICATION_ID, notification)
    }

    private fun sendVpnState(state: String) {
        try {
            Log.d(TAG, "Broadcasting VPN state: $state")
            val stateIntent = Intent("com.unis.vpn.STATE_CHANGED")
            stateIntent.putExtra("state", state)
            stateIntent.setPackage(packageName)
            sendBroadcast(stateIntent)

            VpnModule.instance?.sendEvent("VPN_STATE", state)
        } catch (ex: Exception) {
            Log.w(TAG, "Failed to broadcast VPN state: ${ex.message}", ex)
        }
    }

    fun stopVpnConnection() {
        Log.i(TAG, "Stopping VPN...")

        try {
            // 1️⃣ Change tunnel state to DOWN
            tunnel?.let {
                Log.i(TAG, "Bringing tunnel down...")
                backend?.setState(it, State.DOWN, null)
                sendVpnState("DISCONNECTED")
            }

            // 2️⃣ Close the VPN interface
            vpnInterface?.close()
            vpnInterface = null
            Log.i(TAG, "VPN interface closed")

            notificationManager.cancelNotification(this)

            // 4️⃣ Stop the service
            stopSelf()
            Log.i(TAG, "VPN service stopped successfully")

        } catch (ex: Exception) {
            Log.e(TAG, "Error stopping VPN: ${ex.message}", ex)
            sendVpnState("ERROR_STOPPING_VPN")
        }
    }

    override fun onDestroy() {
        Log.i(TAG, "VPN Service destroyed")

        stopVpnConnection()
        sendVpnState("DISCONNECTED")



        stopForeground(true)
        super.onDestroy()
    }

    override fun onRevoke() {
        Log.i(TAG, "VPN permission revoked")
        sendVpnState("REVOKED")
        stopSelf()
        super.onRevoke()
    }
}