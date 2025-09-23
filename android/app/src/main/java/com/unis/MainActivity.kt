package com.unis

import android.os.Bundle
import android.os.Build
import android.view.WindowManager
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import java.io.File

class MainActivity : ReactActivity() {

  /**
   * Called when the activity is starting.
   * Here we:
   * 1️ Set FLAG_SECURE to prevent screenshots & recordings
   * 2️ Detect rooted devices
   * 3️ Detect emulators
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
      }

      // -----------------------------
      // Emulator detection
      // Set to false to disable during testing
      // -----------------------------
      val checkEmulator = false
      if (checkEmulator && isEmulator()) {
          finishAffinity() // exit app if emulator
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
          "/data/local/su"
      )
      return paths.any { path -> File(path).exists() }
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

      return (fingerprint.startsWith("generic")
              || fingerprint.contains("vbox")
              || fingerprint.contains("test-keys")
              || model.contains("Emulator")
              || product.contains("sdk")
              || brand.startsWith("generic")
              || hardware.contains("goldfish")
              || hardware.contains("ranchu"))
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
}
