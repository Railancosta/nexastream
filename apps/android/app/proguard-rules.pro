# Keep the app entry points referenced from the manifest.
-keep class org.nexastream.app.NexaStreamApp { *; }
-keep class org.nexastream.app.MainActivity { *; }

# Media3/ExoPlayer uses reflection to instantiate renderers and extractors.
-keep class androidx.media3.** { *; }
-dontwarn androidx.media3.**

# Coil loads image decoders reflectively.
-keep class coil.** { *; }
-dontwarn coil.**
