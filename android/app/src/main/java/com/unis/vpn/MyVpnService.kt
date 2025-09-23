package com.unis.vpn

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.ParcelFileDescriptor
import android.content.Context
import android.content.pm.PackageManager
import android.util.Base64
import androidx.core.app.NotificationCompat
import java.io.File
import java.security.SecureRandom
import kotlin.concurrent.thread

class MyVpnService : VpnService() {
    private var vpnInterface: ParcelFileDescriptor? = null
    private val CHANNEL_ID = "unis_vpn_channel"
    private val NOTIF_ID = 1337
    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val allowed = intent?.getStringArrayListExtra("allowed_apps") ?: arrayListOf()
        val wgAlias = intent?.getStringExtra("wg_alias") ?: "wg_key"
        val ifaceAddress = intent?.getStringExtra("iface_address") ?: "10.0.0.2/24"
        startForeground(NOTIF_ID, buildNotification("VPN starting"))
        thread {
            try {
                if (isDeviceRooted()) stopSelf()
                KeyStoreHelper.ensureKey(wgAlias)
                val enc = SecureStorage.readEncryptedKey(applicationContext)
                if (enc.isNullOrEmpty()) {
                    stopSelf(); return@thread
                }
                val priv = KeyStoreHelper.decrypt(wgAlias, enc)
                startVpn(allowed, priv, ifaceAddress)
            } catch (_: Throwable) {
                stopSelf()
            }
        }
        return START_STICKY
    }
    private fun startVpn(allowedApps: List<String>, privateKey: ByteArray, ifaceAddress: String) {
        try {
            val builder = Builder()
            builder.setSession("unis_secure_vpn")
            val addr = ifaceAddress.split("/")[0]
            val prefix = ifaceAddress.split("/")[1].toIntOrNull() ?: 24
            builder.addAddress(addr, prefix)
            builder.addRoute("0.0.0.0", 0)
            for (pkg in allowedApps) {
                try {
                    builder.addAllowedApplication(pkg)
                } catch (_: PackageManager.NameNotFoundException) {}
            }
            val intent = PendingIntent.getActivity(this, 0, Intent(packageName, null), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            builder.setConfigureIntent(intent)
            vpnInterface = builder.establish()
            vpnInterface?.let {
                startWireGuardTunnel(privateKey)
                monitorTunnel()
            } ?: stopSelf()
        } catch (_: Throwable) {
            stopSelf()
        }
    }
    private fun monitorTunnel() {
        val handler = Handler(mainLooper)
        val runnable = object : Runnable {
            override fun run() {
                val alive = vpnInterface != null
                if (!alive) stopSelf()
                else handler.postDelayed(this, 2000)
            }
        }
        handler.post(runnable)
    }
    override fun onDestroy() {
        try { stopWireGuardTunnel() } catch (_: Throwable) {}
        vpnInterface?.close()
        vpnInterface = null
        super.onDestroy()
    }
    override fun onBind(intent: Intent?): IBinder? = null
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val ch = NotificationChannel(CHANNEL_ID, "VPN", NotificationManager.IMPORTANCE_LOW)
            nm.createNotificationChannel(ch)
        }
    }
    private fun buildNotification(text: String): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setContentTitle("Secure VPN")
            .setContentText(text)
            .setOngoing(true)
            .build()
    }
    private fun isDeviceRooted(): Boolean {
        val paths = arrayOf(
            "/system/app/Superuser.apk",
            "/sbin/su",
            "/system/bin/su",
            "/system/xbin/su",
            "/data/local/xbin/su",
            "/data/local/bin/su",
            "/system/sd/xbin/su",
            "/system/bin/failsafe/su",
            "/data/local/su"
        )
        if (Build.TAGS?.contains("test-keys") == true) return true
        return paths.any { File(it).exists() }
    }
    private fun startWireGuardTunnel(privateKey: ByteArray) {
        // TODO: integrate with WireGuard library here
        // Example: call into your WireGuard library/module to create interface with the privateKey and start peer
        // Do NOT log or persist privateKey anywhere
    }
    private fun stopWireGuardTunnel() {
        // TODO: stop the wireguard tunnel via the library
    }
}
