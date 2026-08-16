---
name: Android background overlays
description: Durable Android constraints for apps that keep a WebView-based overlay alive outside the main activity.
---

Android 14+ can stop a floating overlay service immediately when it lacks a declared foreground-service type and matching permission. A screen-overlay companion should use the `specialUse` foreground-service type with a clear subtype property, while still handling older Android versions.

**Why:** WebView overlays often appear to work while the activity is open but disappear as soon as the app is backgrounded; the failure can be a platform service policy rejection rather than a JavaScript animation problem.

**How to apply:** Keep service startup in the foreground transition, avoid unconditional `onResume()` shutdowns that race with permission flows, and destroy/recreate the overlay WebView cleanly when the service lifecycle changes.