plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

/* Веб-частина SpeedRead лежить у корені репозиторію, на рівень вище за android/.
   Її файли копіюються в APK під час збірки, тож додаток працює без інтернету. */
val webRoot: File = rootProject.projectDir.parentFile
val appVersion: String = Regex("v\\s*:\\s*\"([^\"]+)\"")
    .find(File(webRoot, "src/00_version.js").readText())?.groupValues?.get(1) ?: "1.0.0"
// кожна збірка на GitHub отримує більший номер — Android дозволяє ставити її поверх старої
val buildNo: Int = System.getenv("GITHUB_RUN_NUMBER")?.toIntOrNull() ?: 1

val genDir: File = layout.buildDirectory.get().asFile.resolve("generated/speedread")

val copyWeb by tasks.registering(Copy::class) {
    from(webRoot) { include("index.html", "manifest.webmanifest", "version.json", "icons/**") }
    into(genDir.resolve("assets/www"))
}
val copyIcon by tasks.registering(Copy::class) {
    from(File(webRoot, "icons")) {
        include("icon-512.png")
        rename { "ic_launcher.png" }
    }
    into(genDir.resolve("res/mipmap-xxxhdpi"))
}

android {
    namespace = "ua.genichka.speedread"
    compileSdk = 34

    defaultConfig {
        applicationId = "ua.genichka.speedread"
        minSdk = 26
        targetSdk = 34
        versionCode = 1000 + buildNo
        versionName = "$appVersion ($buildNo)"
    }

    // Ключ підпису speedread.keystore створює GitHub Actions при першій збірці й шифрує паролем
    // із секрету SR_KEY_PASS; у коді пароля немає.
    // Ключ має бути завжди той самий, інакше Android не поставить нову версію поверх старої.
    // Без пароля (локальна збірка) APK підписується звичайним debug-ключем.
    val keyPass: String? = System.getenv("SR_KEY_PASS")?.takeIf { it.isNotBlank() }
    signingConfigs {
        if (keyPass != null && file("speedread.keystore").exists()) create("speedread") {
            storeFile = file("speedread.keystore")
            storeType = "pkcs12"
            storePassword = keyPass
            keyAlias = "speedread"
            keyPassword = keyPass
        }
    }

    buildTypes {
        getByName("debug") {
            signingConfigs.findByName("speedread")?.let { signingConfig = it }
        }
        getByName("release") {
            isMinifyEnabled = false
            signingConfigs.findByName("speedread")?.let { signingConfig = it }
        }
    }

    sourceSets["main"].assets.srcDir(genDir.resolve("assets"))
    sourceSets["main"].res.srcDir(genDir.resolve("res"))

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

tasks.named("preBuild") { dependsOn(copyWeb, copyIcon) }

dependencies {
    implementation("androidx.webkit:webkit:1.11.0")
}
