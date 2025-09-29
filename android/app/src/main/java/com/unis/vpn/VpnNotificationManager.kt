package com.unis.vpn

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import android.net.VpnService

class VpnNotificationManager(private val context: Context) {

    companion object {
        const val CHANNEL_ID = "vpn_status_channel"
        const val NOTIFICATION_ID = 1
        const val FOREGROUND_SERVICE_ID = 12345
    }

    init { createNotificationChannel() }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "VPN Status",
                NotificationManager.IMPORTANCE_LOW
            ).apply { description = "Shows VPN connection status"; setShowBadge(false) }
            val manager = context.getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    fun buildNotification(content: String): Notification {
        val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val pendingIntent = PendingIntent.getActivity(
            context, 0, intent,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            else PendingIntent.FLAG_UPDATE_CURRENT
        )
        return NotificationCompat.Builder(context, CHANNEL_ID)
            .setContentTitle("WireGuard VPN")
            .setContentText(content)
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    fun showNotification(context: Context, content: String) {
        val notification = buildNotification(content)
        val notificationManager = context.getSystemService(NotificationManager::class.java)
        notificationManager.notify(NOTIFICATION_ID, notification)
    }

    fun cancelNotification(context: Context) {
        val notificationManager = context.getSystemService(NotificationManager::class.java)
        notificationManager.cancel(NOTIFICATION_ID)
        notificationManager.cancel(FOREGROUND_SERVICE_ID)
    }
}
