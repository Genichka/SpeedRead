package ua.genichka.speedread

import android.annotation.SuppressLint
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject

/**
 * SpeedRead як Android-додаток: той самий застосунок, що й на GitHub Pages,
 * тільки файли лежать у APK — працює без інтернету з першого запуску.
 */
class MainActivity : Activity() {

    companion object {
        private const val HOST = "appassets.androidplatform.net"
        private const val START_URL = "https://$HOST/assets/www/index.html"
        private const val REQ_FILE = 3
    }

    private lateinit var web: WebView
    private lateinit var assets: WebViewAssetLoader
    private var fileCb: ValueCallback<Array<Uri>>? = null
    private var pageReady = false
    private var pendingShare: String? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        assets = WebViewAssetLoader.Builder()
            .setDomain(HOST)
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        web = WebView(this)
        web.setBackgroundColor(0xFF111217.toInt())
        setContentView(web)
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            setSupportMultipleWindows(false)
            textZoom = 100
            userAgentString = "$userAgentString SpeedReadApp"
        }
        web.addJavascriptInterface(Bridge(this), "SpeedReadNative")
        web.webViewClient = Client()
        web.webChromeClient = Chrome()

        takeShare(intent)
        if (savedInstanceState == null || web.restoreState(savedInstanceState) == null) web.loadUrl(START_URL)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        takeShare(intent)
        deliverShare()
    }

    /** Текст, яким поділилися з іншого застосунку, відкривається в «Свій текст». */
    private fun takeShare(i: Intent?) {
        if (i?.action == Intent.ACTION_SEND && i.type?.startsWith("text/") == true) {
            val t = i.getStringExtra(Intent.EXTRA_TEXT)
            if (!t.isNullOrBlank()) pendingShare = t
        }
    }

    private fun deliverShare() {
        val t = pendingShare ?: return
        if (!pageReady) return
        pendingShare = null
        web.evaluateJavascript("window.srShare && window.srShare(${JSONObject.quote(t)})", null)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    override fun onPause() {
        // згорнули додаток — зупинити читання й тест, зберегти прогрес
        web.evaluateJavascript("window.srPause && window.srPause()", null)
        super.onPause()
    }

    override fun onDestroy() {
        web.destroy()
        super.onDestroy()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // спершу закрити вікно або повернутися на «Тест»; якщо нічого — згорнути, а не вбити
        web.evaluateJavascript("(window.srBack && window.srBack()) || false") { r ->
            if (r != "true") moveTaskToBack(true)
        }
    }

    fun openExternal(uri: Uri) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
        } catch (e: ActivityNotFoundException) {
            /* немає програми для цього посилання */
        } catch (e: Exception) { /* */ }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQ_FILE) {
            fileCb?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data))
            fileCb = null
        }
    }

    private inner class Client : WebViewClient() {
        override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
            val u = request.url
            return if (u.host == HOST) assets.shouldInterceptRequest(u) else null
        }

        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            if (request.url.host == HOST) return false
            openExternal(request.url)
            return true
        }

        override fun onPageFinished(view: WebView, url: String?) {
            pageReady = true
            deliverShare()
        }
    }

    private inner class Chrome : WebChromeClient() {
        override fun onShowFileChooser(
            view: WebView,
            callback: ValueCallback<Array<Uri>>,
            params: WebChromeClient.FileChooserParams,
        ): Boolean {
            fileCb?.onReceiveValue(null)
            fileCb = callback
            val pick = Intent(Intent.ACTION_GET_CONTENT).addCategory(Intent.CATEGORY_OPENABLE).setType("text/*")
            return try {
                startActivityForResult(Intent.createChooser(pick, "Вибери текстовий файл"), REQ_FILE)
                true
            } catch (e: Exception) {
                fileCb = null
                false
            }
        }
    }
}
