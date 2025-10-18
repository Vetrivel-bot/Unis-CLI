package com.unis

import android.content.Intent
import android.net.VpnService
import android.os.Bundle
import android.os.Build
import android.view.WindowManager
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import java.io.File
import android.util.Log

class MainActivity : ReactActivity() {

    private val TAG = "MainActivity"
    private val VPN_PERMISSION_REQUEST_CODE = 1

    // Toggle this flag to true or false to control VPN
    private var isVpnEnabled = false

    private val HARDCODED_CONFIG = """
        [Interface]
        PrivateKey = ABtb1597OLZYLiFy5IeMMUGz1sqlBZaXLB1SMDjn9Gc=
        Address = 10.2.0.2/32
        DNS = 10.2.0.1

        [Peer]
        PublicKey = 4+452KKZ/BpmTeJ0Ua5YulgtVJKrFlw0AKKo4PtlYxM=
        AllowedIPs = 0.0.0.0/0, ::/0
        Endpoint = 178.249.214.65:51820
    """.trimIndent()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val enableScreenshotProtection = true
        if (enableScreenshotProtection) {
            window.setFlags(
                WindowManager.LayoutParams.FLAG_SECURE,
                WindowManager.LayoutParams.FLAG_SECURE
            )
        }

        val checkRoot = true
        if (checkRoot && isDeviceRooted()) {
            finishAffinity()
        }
        val checkEmulator = false
        if (checkEmulator && isEmulator()) {
            finishAffinity()
        }

        handleVpnPermissionRequest(intent)

        // ✅ Control VPN ON/OFF here by toggling isVpnEnabled
        try {
            if (isVpnEnabled) {
                Log.i(TAG, "VPN toggle = ON → requesting/start VPN")
                requestVpnPermission(HARDCODED_CONFIG)
            } else {
                Log.i(TAG, "VPN toggle = OFF → stopping VPN service")
                stopVpnService()
            }
        } catch (ex: Exception) {
            Log.e(TAG, "Error toggling VPN state: ${ex.message}", ex)
        }
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        handleVpnPermissionRequest(intent)
    }

    private fun handleVpnPermissionRequest(intent: Intent?) {
        try {
            if (intent != null && intent.hasExtra("vpn_action")) {
                val action = intent.getStringExtra("vpn_action")
                if ("request_permission" == action) {
                    val config = intent.getStringExtra("config")
                    if (!config.isNullOrEmpty()) {
                        requestVpnPermission(config)
                    } else {
                        Log.i(TAG, "No config provided in intent — using hardcoded config")
                        requestVpnPermission(HARDCODED_CONFIG)
                    }
                }
            }
        } catch (ex: Exception) {
            Log.e(TAG, "Error handling VPN permission request: ${ex.message}", ex)
        }
    }

    private fun requestVpnPermission(config: String) {
        try {
            Log.i(TAG, "Requesting VPN permission with config length: ${config.length}")
            val prepareIntent = VpnService.prepare(this)
            if (prepareIntent != null) {
                prepareIntent.putExtra("config", config)
                startActivityForResult(prepareIntent, VPN_PERMISSION_REQUEST_CODE)
                Log.i(TAG, "Started VPN permission activity")
            } else {
                Log.i(TAG, "VPN permission already granted, starting service")
                startVpnService(config)
            }
        } catch (ex: Exception) {
            Log.e(TAG, "Error requesting VPN permission: ${ex.message}", ex)
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

        if (requestCode == VPN_PERMISSION_REQUEST_CODE) {
            if (resultCode == RESULT_OK) {
                Log.i(TAG, "VPN permission granted by user")
                var config = data?.getStringExtra("config")
                if (config.isNullOrEmpty()) {
                    config = intent?.getStringExtra("config")
                }
                if (config.isNullOrEmpty()) {
                    config = HARDCODED_CONFIG
                }
                if (!config.isNullOrEmpty()) {
                    startVpnService(config)
                } else {
                    Log.e(TAG, "No config found after VPN permission grant")
                }
            } else {
                Log.w(TAG, "VPN permission denied by user")
            }
        }
    }

    private fun startVpnService(config: String) {
        try {
            Log.i(TAG, "Starting VPN service with config length: ${config.length}")
            val intent = Intent(this, com.unis.vpn.WireGuardVpnService::class.java)
            intent.putExtra("config", config)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent)
            } else {
                startService(intent)
            }
            Log.i(TAG, "VPN service started successfully")
        } catch (ex: Exception) {
            Log.e(TAG, "Failed to start VPN service: ${ex.message}", ex)
        }
    }

    private fun stopVpnService() {
        try {
            Log.i(TAG, "Stopping VPN service manually")
            val stopIntent = Intent(this, com.unis.vpn.WireGuardVpnService::class.java)
            stopIntent.action = "STOP_VPN"
            stopService(stopIntent)
        } catch (ex: Exception) {
            Log.e(TAG, "Error stopping VPN service: ${ex.message}", ex)
        }
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
        return paths.any { path -> File(path).exists() }
    }

    private fun isEmulator(): Boolean {
        val model = Build.MODEL ?: ""
        val product = Build.PRODUCT ?: ""
        val brand = Build.BRAND ?: ""
        val hardware = Build.HARDWARE ?: ""
        val fingerprint = Build.FINGERPRINT ?: ""

        return (fingerprint.startsWith("generic")
                || fingerprint.contains("vbox")
                || fingerprint.contains("test-keys")
                || model.contains("Emulator")
                || product.contains("sdk")
                || brand.startsWith("generic")
                || hardware.contains("goldfish")
                || hardware.contains("ranchu"))
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.i(TAG, "MainActivity destroyed — stopping VPN service")
        try {
            val stopIntent = Intent(this, com.unis.vpn.WireGuardVpnService::class.java)
            stopIntent.action = "STOP_VPN"
            stopService(stopIntent)
        } catch (ex: Exception) {
            Log.e(TAG, "Error stopping VPN service on activity destroy: ${ex.message}", ex)
        }
    }

    override fun getMainComponentName(): String = "unis"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    override fun onResume() {
        super.onResume()
        Log.d(TAG, "MainActivity resumed")
        handleVpnPermissionRequest(intent)
    }
}
