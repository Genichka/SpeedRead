package ua.genichka.speedread

import android.net.Uri
import android.view.WindowManager
import android.webkit.JavascriptInterface

/** Обʼєкт window.SpeedReadNative у веб-частині. Викликається не з UI-потоку. */
class Bridge(private val act: MainActivity) {

    /** Не гасити екран, поки йде читання чи тест. */
    @JavascriptInterface
    fun keepScreen(on: Boolean) {
        act.runOnUiThread {
            if (on) act.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            else act.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }

    /** Версія APK, наприклад «1.1.0 (3)». */
    @Suppress("DEPRECATION")
    @JavascriptInterface
    fun version(): String = try {
        act.packageManager.getPackageInfo(act.packageName, 0).versionName ?: ""
    } catch (e: Exception) {
        ""
    }

    /** Відкрити посилання в браузері (завантаження нового APK). */
    @JavascriptInterface
    fun openUrl(url: String) {
        act.runOnUiThread { act.openExternal(Uri.parse(url)) }
    }
}
