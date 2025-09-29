package com.unis

import android.content.Intent
import android.net.VpnService
import android.os.Bundle
import android.os.Build
import android.util.Log
import android.view.WindowManager
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import java.io.File

class MainActivity : ReactActivity() {
    private val TAG = "MainActivity"
    private val VPN_PERMISSION_REQUEST_CODE = 1

    /**
     * Called when the activity is starting.
     * Here we:
     * 1️ Set FLAG_SECURE to prevent screenshots & recordings
     * 2️ Detect rooted devices
     * 3️ Detect emulators
     * 4️ Handle VPN permission requests
     */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // -----------------------------
        // Screenshot & screen recording protection
        // Set to false to disable during testing
        // -----------------------------
        val enableScreenshotProtection = true
        if (enableScreenshotProtection) {
            window.setFlags(
                WindowManager.LayoutParams.FLAG_SECURE,
                WindowManager.LayoutParams.FLAG_SECURE
            )
        }

        // -----------------------------
        // Root detection
        // Set to false to disable during testing
        // -----------------------------
        val checkRoot = true
        if (checkRoot && isDeviceRooted()) {
            finishAffinity() // exit app if rooted
            return
        }

        // -----------------------------
        // Emulator detection
        // Set to false to disable during testing
        // -----------------------------
        val checkEmulator = false
        if (checkEmulator && isEmulator()) {
            finishAffinity() // exit app if emulator
            return
        }

        // -----------------------------
        // Handle VPN permission request if coming from VPN module
        // -----------------------------
        handleVpnPermissionRequest(intent)
    }

    /**
     * Handle new intents (when activity is already running)
     */
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        handleVpnPermissionRequest(intent)
    }

    /**
     * Handle VPN permission requests from the VPN module
     */
    private fun handleVpnPermissionRequest(intent: Intent?) {
        try {
            if (intent != null && intent.hasExtra("vpn_action")) {
                val action = intent.getStringExtra("vpn_action")
                if ("request_permission" == action) {
                    val config = intent.getStringExtra("config")
                    if (!config.isNullOrEmpty()) {
                        requestVpnPermission(config)
                    } else {
                        Log.e(TAG, "No config provided for VPN permission request")
                    }
                }
            }
        } catch (ex: Exception) {
            Log.e(TAG, "Error handling VPN permission request: ${ex.message}", ex)
        }
    }

    /**
     * Request VPN permission from the system
     */
    private fun requestVpnPermission(config: String) {
        try {
            Log.i(TAG, "Requesting VPN permission with config length: ${config.length}")
            val prepareIntent = VpnService.prepare(this)
            if (prepareIntent != null) {
                // Add config to intent so we can use it after permission grant
                prepareIntent.putExtra("config", config)
                startActivityForResult(prepareIntent, VPN_PERMISSION_REQUEST_CODE)
                Log.i(TAG, "Started VPN permission activity")
            } else {
                // Permission already granted - start VPN service directly
                Log.i(TAG, "VPN permission already granted, starting service")
                startVpnService(config)
            }
        } catch (ex: Exception) {
            Log.e(TAG, "Error requesting VPN permission: ${ex.message}", ex)
        }
    }

    /**
     * Handle permission result from VPN permission dialog
     */
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        
        if (requestCode == VPN_PERMISSION_REQUEST_CODE) {
            if (resultCode == RESULT_OK) {
                // Permission granted - start VPN service
                Log.i(TAG, "VPN permission granted by user")
                
                // Try to get config from the returned intent first
                var config = data?.getStringExtra("config")
                if (config.isNullOrEmpty()) {
                    // Fall back to original intent
                    config = intent?.getStringExtra("config")
                }
                
                if (!config.isNullOrEmpty()) {
                    startVpnService(config)
                } else {
                    Log.e(TAG, "No config found after VPN permission grant")
                    // You might want to send an error event back to React Native here
                }
            } else {
                // Permission denied
                Log.w(TAG, "VPN permission denied by user")
                // You might want to send an event back to React Native here
            }
        }
    }

    /**
     * Start the VPN service with the provided configuration
     */
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
            // You might want to send an error event back to React Native here
        }
    }

    /**
     * Root detection logic
     */
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
            "/data/local/su",
            "/system/xbin/which su",
            "/system/bin/which su"
        )
        
        // Check for su binary in known locations
        if (paths.any { path -> File(path).exists() }) {
            Log.w(TAG, "Root detected: su binary found")
            return true
        }
        
        // Check for test keys (common in custom ROMs)
        val buildTags = Build.TAGS
        if (buildTags != null && buildTags.contains("test-keys")) {
            Log.w(TAG, "Root detected: test-keys found in build tags")
            return true
        }
        
        // Check for dangerous system properties
        try {
            val process = Runtime.getRuntime().exec(arrayOf("/system/xbin/which", "su"))
            val output = process.inputStream.bufferedReader().readText()
            if (output.isNotEmpty()) {
                Log.w(TAG, "Root detected: which su command succeeded")
                return true
            }
        } catch (e: Exception) {
            // Expected to fail on non-rooted devices
        }
        
        return false
    }

    /**
     * Emulator detection logic
     */
    private fun isEmulator(): Boolean {
        val model = Build.MODEL
        val product = Build.PRODUCT
        val brand = Build.BRAND
        val hardware = Build.HARDWARE
        val fingerprint = Build.FINGERPRINT
        val manufacturer = Build.MANUFACTURER
        val device = Build.DEVICE

        val isEmulator = (fingerprint.startsWith("generic")
                || fingerprint.contains("vbox")
                || fingerprint.contains("test-keys")
                || fingerprint.contains("generic/sdk/generic")
                || model.contains("Emulator")
                || model.contains("Android SDK")
                || product.contains("sdk")
                || product.contains("emulator")
                || product.contains("simulator")
                || brand.startsWith("generic")
                || hardware.contains("goldfish")
                || hardware.contains("ranchu")
                || manufacturer.contains("Genymotion")
                || device.contains("generic"))

        if (isEmulator) {
            Log.w(TAG, "Emulator detected: model=$model, product=$product, brand=$brand")
        }

        return isEmulator
    }

    /**
     * Returns the name of the main component registered from JavaScript.
     */
    override fun getMainComponentName(): String = "unis"

    /**
     * Returns the instance of the [ReactActivityDelegate].
     * Allows enabling New Architecture with the fabricEnabled flag.
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    /**
     * Handle back button press
     */
    override fun onBackPressed() {
        // You can customize back button behavior here
        // For example, minimize to background instead of closing
        moveTaskToBack(true)
    }

    /**
     * Called when the activity is being destroyed
     */
    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "MainActivity destroyed")
    }

    /**
     * Called when the activity is paused
     */
    override fun onPause() {
        super.onPause()
        Log.d(TAG, "MainActivity paused")
    }

    /**
     * Called when the activity is resumed
     */
    override fun onResume() {
        super.onResume()
        Log.d(TAG, "MainActivity resumed")
        
        // Check if we need to handle any pending VPN requests
        handleVpnPermissionRequest(intent)
    }

}