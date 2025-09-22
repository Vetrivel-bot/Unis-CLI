package com.unis

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class HelloModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "HelloModule"

    @ReactMethod
    fun getHelloMessage(promise: Promise) {
        promise.resolve("find me on github @V3NITRO")
    }
}
