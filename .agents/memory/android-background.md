---
name: Android background overlays
description: Durable Android constraints for apps that keep a WebView-based overlay alive outside the main activity.
---

Android 14+ can stop a floating overlay service immediately when it lacks a declared foreground-service type and matching permission. A screen-overlay companion should use the `specialUse` foreground-service type with a clear subtype property, while still handling older Android versions.

**Why:** WebView overlays often appear to work while the activity is open but disappear as soon as the app is backgrounded; the failure can be a platform service policy rejection rather than a JavaScript animation problem.

**How to apply:** Keep service startup in the foreground transition, avoid unconditional `onResume()` shutdowns that race with permission flows, and destroy/recreate the overlay WebView cleanly when the service lifecycle changes.

For an interactive companion, use a small touchable overlay window that the native service moves across the display instead of a full-screen touchable WebView. A full-screen touchable overlay steals scroll/tap events from the app underneath, while a full-screen non-touchable overlay makes the pet impossible to touch.

**Why:** Android dispatches input at the window level; transparent WebView pixels do not create pass-through touch regions.

**How to apply:** Bound the overlay to the pet and speech bubble, move that window natively for whole-screen roaming, and keep the bundled overlay page limited to the character UI.

Android WebView pages loaded from `file:///android_asset/` must use relative
script, modulepreload, and stylesheet URLs; root-relative `/assets/...` URLs
resolve outside the APK asset directory and can leave a transparent overlay
with no rendered character.

**Why:** The WebView can successfully create the transparent overlay window
while silently failing to load the character bundle from the wrong `file://`
location.

**How to apply:** Keep Capacitor/Vite output relative for the Android bundle
and add a build-time check that rejects root-relative asset URLs after
`cap sync`.