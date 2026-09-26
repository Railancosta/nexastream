# NexaStream Android

Native Android client for the NexaStream testnet video platform. Kotlin + Jetpack
Compose, no cross-platform layer.

This app talks to the same core API as the web client. There are no
Android-exclusive endpoints — if a feature works here, it works over the public
API, and vice versa.

## Build

Requires JDK 17+ and the Android SDK (`compileSdk` 35, build-tools 35.0.0).

```bash
./gradlew :app:testDebugUnitTest   # unit tests
./gradlew :app:assembleDebug       # APK at app/build/outputs/apk/debug/app-debug.apk
```

Point the app at a running backend with the `NS_API` build config or by setting
`ns_api` in the app's settings. The core service must be started with a
`JWT_SECRET`:

```bash
JWT_SECRET=dev-secret node ../../services/core/server.js
```

## Layout

```
app/src/main/java/org/nexastream/app/
  monetization/RewardRates.kt   rate table mirrored from the backend + NST formatting
  data/Models.kt                wire models and their JSON parsers
  data/SessionStore.kt          token + user persisted in EncryptedSharedPreferences
  net/ApiClient.kt              HTTP client; streams uploads without buffering
  net/NexaStreamApi.kt          one function per backend endpoint
  ui/                           ViewModels, screens, navigation, theme
app/src/test/                   unit tests (parsing, formatting, rate table)
```

## Tests

Unit tests cover the parts that can be verified without a device: JSON parsing
for every wire model, NST/size/duration formatting, and the reward rate table.

The API contract itself is verified from the repository root, not here, because
it needs a live backend:

```bash
node apps/android/contract-test.mjs   # asserts every field the parsers read
node apps/android/pipeline-test.mjs   # real upload -> ffprobe -> transcode -> monetization
```

`contract-test.mjs` is the guard against client/server drift: it fails if a
route moves or a field is renamed, which is the class of bug that otherwise only
shows up on a user's device.

## Not done yet

Stated plainly so the app is not mistaken for more than it is:

- No instrumented/UI tests.
- No offline download or playback cache.
- No live streaming.
- No push notifications.
- Not published to any store.

Monetization is testnet-only. NST has no market value and no earnings are
guaranteed.
