package com.unis.vpn

import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.net.URL

object IpChecker {
    fun checkPublicIp() {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val ip = URL("https://api.ipify.org").readText()
                withContext(Dispatchers.Main) {
                    Log.d("VPN_IP_CHECK", "Current public IP: $ip")
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Log.e("VPN_IP_CHECK", "Error checking IP", e)
                }
            }
        }
    }
}
