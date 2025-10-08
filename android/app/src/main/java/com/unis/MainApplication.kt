package com.unis

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.defaults.DefaultReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.unis.vpn.VpnPackage
import com.unis.keystore.SecureStoragePackage
import com.unis.storage.HmacPackage

class MainApplication : Application(), ReactApplication {

    override val reactNativeHost: ReactNativeHost =
        object : DefaultReactNativeHost(this) {
            override fun getPackages(): List<ReactPackage> {
                // convert to mutable list so we can add packages manually
                val packages = PackageList(this).packages.toMutableList()
                packages.add(HelloPackage())             // manually added HelloModule
                packages.add(ScreenSecurityPackage())    // manually added secure module
                packages.add(VpnPackage())
                packages.add(SecureStoragePackage())
              //  packages.add(HmacPackage())              // add HmacPackage properly
                return packages
            }

            override fun getJSMainModuleName(): String = "index"

            override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

            override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
            override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
        }

    override val reactHost: ReactHost
        get() = DefaultReactHost.getDefaultReactHost(applicationContext, reactNativeHost)

    override fun onCreate() {
        super.onCreate()
        loadReactNative(this)
    }
}
