# Flutter specific rules
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.embedding.android.** { *; }
-keep class io.flutter.embedding.engine.** { *; }
-keep class io.flutter.embedding.engine.dart.** { *; }

# Freezed / json_serializable
-keep class **.freezed.** { *; }
-keep class **$$Freezed** { *; }
-keep class **$_* { *; }

# Dio / CookieJar
-keep class com.tekartik.sqflite.** { *; }
-keep class okhttp3.** { *; }
-keep class retrofit2.** { *; }

# Google Fonts
-keep class com.google.firebase.** { *; }

# Prevent obfuscation of serialization methods
-keepclassmembers class * {
    @com.google.gson.annotations.* *;
}

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep Flutter plugin registrant
-keep class io.flutter.plugins.GeneratedPluginRegistrant
-keepclassmembers class io.flutter.plugins.GeneratedPluginRegistrant {
    public static void registerWith(io.flutter.plugin.common.PluginRegistry);
}