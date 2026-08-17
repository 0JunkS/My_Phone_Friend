package com.myphonefriend.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

public class FloatingPetService extends Service {

    private static FloatingPetService activeInstance;
    private WindowManager windowManager;
    private FrameLayout floatingLayout;
    private WindowManager.LayoutParams params;
    private WebView webView;
    private boolean isViewAttached = false;
    private boolean isTouching = false;

    private static final String CHANNEL_ID = "FloatingPetChannel";
    private static final int NOTIFICATION_ID = 1001;

    // The overlay window is intentionally smaller than the full screen for
    // rendering/perf reasons (see .agents/memory/android-background.md), but
    // it is a REAL OS window boundary, not a CSS box: anything the character
    // draws outside it (the speech bubble above, the drop-shadow filter used
    // in the "lifted"/dragged state below) is hard-clipped by the window
    // edge, no matter what overflow rules the page sets. 160x180dp only left
    // 34dp above the character and ~26dp below it, both smaller than the
    // bubble/shadow actually need, so both were getting cut off. These must
    // stay in sync with character.js's default localRenderOffset, which
    // centers the character inside this box.
    private static final int OVERLAY_BASE_WIDTH_DP = 260;
    private static final int OVERLAY_BASE_HEIGHT_DP = 280;

    public static void updatePetDataInOverlay(final String petJsonData) {
        if (activeInstance != null) {
            activeInstance.applyScaleAndData(petJsonData);
        }
    }

    private void applyScaleAndData(final String petJsonData) {
        final String safeJson = petJsonData != null ? petJsonData : "{}";
        try {
            org.json.JSONObject obj = new org.json.JSONObject(safeJson);
            double scale = obj.optDouble("scale", 1.0);
            if (scale <= 0.2) scale = 1.0;

            final int newWidth = Math.round(dpToPx(OVERLAY_BASE_WIDTH_DP) * (float) scale);
            final int newHeight = Math.round(dpToPx(OVERLAY_BASE_HEIGHT_DP) * (float) scale);

            if (params != null && windowManager != null && isViewAttached && floatingLayout != null) {
                params.width = newWidth;
                params.height = newHeight;
                windowManager.updateViewLayout(floatingLayout, params);
            }
        } catch (Throwable t) {}

        if (webView != null) {
            webView.post(new Runnable() {
                @Override
                public void run() {
                    if (webView != null) {
                        webView.evaluateJavascript(
                                "window.applySyncedPetData && window.applySyncedPetData(" + safeJson + ");", null
                        );
                    }
                }
            });
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        activeInstance = this;
        try {
            startForegroundServiceWithNotification();
            createCompactOverlayPet();
        } catch (Throwable t) {
            t.printStackTrace();
            stopSelf();
        }
    }

    private void startForegroundServiceWithNotification() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID,
                        "내 폰 안의 친구 백그라운드 펫",
                        NotificationManager.IMPORTANCE_LOW
                );
                channel.setDescription("화면 위에서 항상 살아 움직이는 펫 서비스");
                channel.setShowBadge(false);
                NotificationManager manager = getSystemService(NotificationManager.class);
                if (manager != null) {
                    manager.createNotificationChannel(channel);
                }
            }

            Intent intent = new Intent(this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                    this, 0, intent,
                    Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0
            );

            Notification.Builder builder;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                builder = new Notification.Builder(this, CHANNEL_ID);
            } else {
                builder = new Notification.Builder(this);
            }

            Notification notification = builder
                    .setContentTitle("🍌 내 폰 안의 친구")
                    .setContentText("화면 위에서 캐릭터가 함께하고 있어요!")
                    .setSmallIcon(android.R.drawable.star_on)
                    .setContentIntent(pendingIntent)
                    .setOngoing(true)
                    .build();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                startForeground(
                        NOTIFICATION_ID,
                        notification,
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
                );
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        try {
            startForegroundServiceWithNotification();
            if (!isViewAttached) {
                createCompactOverlayPet();
            }
        } catch (Throwable t) {
            t.printStackTrace();
        }
        return START_STICKY;
    }

    private void createCompactOverlayPet() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(this)) {
                stopSelf();
                return;
            }
        }

        if (isViewAttached && floatingLayout != null) {
            return;
        }

        try {
            windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
            if (windowManager == null) return;

            int layoutType;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                layoutType = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
            } else {
                layoutType = WindowManager.LayoutParams.TYPE_PHONE;
            }

            // Compact floating window sized around the character, PLUS margin
            // for the speech bubble above it and the lifted-state shadow
            // below/around it (see OVERLAY_BASE_*_DP comment above) so they
            // aren't clipped by this window's own edges.
            android.util.DisplayMetrics metrics = getResources().getDisplayMetrics();
            int screenWidth = metrics.widthPixels;
            int screenHeight = metrics.heightPixels;

            params = new WindowManager.LayoutParams(
                    dpToPx(OVERLAY_BASE_WIDTH_DP),
                    dpToPx(OVERLAY_BASE_HEIGHT_DP),
                    layoutType,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                    PixelFormat.TRANSLUCENT
            );

            params.gravity = Gravity.TOP | Gravity.START;
            params.x = Math.max(0, Math.min(dpToPx(60), screenWidth - params.width));
            params.y = Math.max(0, Math.min(dpToPx(180), screenHeight - params.height));

            floatingLayout = new FrameLayout(this);
            floatingLayout.setBackgroundColor(Color.TRANSPARENT);

            // Transparent WebView rendering character & speech bubble
            webView = new WebView(this);
            webView.setVerticalScrollBarEnabled(false);
            webView.setHorizontalScrollBarEnabled(false);
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setAllowFileAccessFromFileURLs(true);
            settings.setAllowUniversalAccessFromFileURLs(true);
            settings.setMediaPlaybackRequiresUserGesture(false);

            // Transparent WebViews inside TYPE_APPLICATION_OVERLAY windows can
            // lose their SVG layer on some Android GPU implementations. The
            // software layer keeps the window transparent while compositing
            // the character reliably above other apps.
            webView.setBackgroundColor(Color.TRANSPARENT);
            webView.setLayerType(View.LAYER_TYPE_SOFTWARE, null);
            webView.setAlpha(1f);
            floatingLayout.setAlpha(1f);
            // Bridge that lets the SAME character.js physics/wander code that
            // drives the in-app view also drive this native overlay window,
            // instead of a second, independent native wander loop.
            webView.addJavascriptInterface(new AndroidPetBridge(), "AndroidPetBridge");

            webView.setWebViewClient(new WebViewClient() {
                @Override
                public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                    super.onPageStarted(view, url, favicon);
                    view.evaluateJavascript("document.documentElement.classList.add('mode-overlay'); document.body.classList.add('mode-overlay');", null);
                }

                @Override
                public void onPageFinished(WebView view, String url) {
                    super.onPageFinished(view, url);
                    view.evaluateJavascript("document.documentElement.classList.add('mode-overlay'); document.body.classList.add('mode-overlay');", null);

                    // Tell the shared JS physics code the REAL screen size (in CSS
                    // px / dp) so it wanders across the whole screen even though
                    // this native window itself is only a small tracking surface.
                    android.util.DisplayMetrics m = getResources().getDisplayMetrics();
                    int screenWidthDp = Math.round(m.widthPixels / m.density);
                    int screenHeightDp = Math.round(m.heightPixels / m.density);
                    view.evaluateJavascript(
                            "window.setOverlayScreenSize && window.setOverlayScreenSize(" + screenWidthDp + "," + screenHeightDp + ");",
                            null
                    );

                    try {
                        android.content.SharedPreferences prefs = getSharedPreferences("MyPetPrefs", MODE_PRIVATE);
                        String savedJson = prefs.getString("pet_data_json", null);
                        if (savedJson != null && !savedJson.isEmpty()) {
                            applyScaleAndData(savedJson);
                        }
                    } catch (Throwable t) {}
                }

                @Override
                public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                    super.onReceivedError(view, errorCode, description, failingUrl);
                    if (failingUrl != null && failingUrl.startsWith("file:///android_asset/")) {
                        view.loadUrl("file:///android_asset/public/index.html?mode=overlay");
                    }
                }
            });

            // Load the SAME app page used in the foreground, with ?mode=overlay.
            // The mode-overlay CSS (src/css/style.css) hides all app chrome and
            // leaves only the transparent character layer visible, so this is
            // literally the same HTML/JS/CSS driving both surfaces instead of a
            // separate duplicate overlay file.
            webView.loadUrl("file:///android_asset/public/index.html?mode=overlay");

            floatingLayout.addView(webView, new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
            ));

            // Native Touch & Drag listener with strict screen wall boundary clamping.
            // Dragging itself is still handled natively for a snappy, GPU-composited
            // feel, but the shared character.js is told when a drag starts/ends so
            // its own wander loop doesn't fight the user's finger, and the final
            // drop position is handed back to it so wandering resumes from exactly
            // where the pet was released (same as dropping it in the app view).
            webView.setOnTouchListener(new View.OnTouchListener() {
                private int initialX, initialY;
                private float initialTouchX, initialTouchY;
                private long touchStartTime;

                @Override
                public boolean onTouch(View v, MotionEvent event) {
                    if (params == null || windowManager == null || !isViewAttached) return false;

                    switch (event.getAction()) {
                        case MotionEvent.ACTION_DOWN:
                            isTouching = true;
                            touchStartTime = System.currentTimeMillis();
                            initialX = params.x;
                            initialY = params.y;
                            initialTouchX = event.getRawX();
                            initialTouchY = event.getRawY();
                            webView.evaluateJavascript("window.setOverlayDragging && window.setOverlayDragging(true);", null);
                            return true;

                        case MotionEvent.ACTION_MOVE:
                            int rawX = initialX + (int) (event.getRawX() - initialTouchX);
                            int rawY = initialY + (int) (event.getRawY() - initialTouchY);

                            android.util.DisplayMetrics currentMetrics = getResources().getDisplayMetrics();
                            int maxAllowedX = Math.max(0, currentMetrics.widthPixels - params.width);
                            int maxAllowedY = Math.max(0, getAvailableScreenHeight() - params.height);

                            // Clamp position so character and speech bubble never cross screen edges or soft keyboard
                            params.x = Math.max(0, Math.min(rawX, maxAllowedX));
                            params.y = Math.max(0, Math.min(rawY, maxAllowedY));

                            try {
                                if (isViewAttached && floatingLayout != null) {
                                    windowManager.updateViewLayout(floatingLayout, params);
                                }
                            } catch (Throwable t) {}
                            return true;

                        case MotionEvent.ACTION_UP:
                            long duration = System.currentTimeMillis() - touchStartTime;
                            float diffX = Math.abs(event.getRawX() - initialTouchX);
                            float diffY = Math.abs(event.getRawY() - initialTouchY);

                            if (duration < 350 && diffX < 15 && diffY < 15) {
                                webView.evaluateJavascript(
                                        "window.petTouched && window.petTouched();",
                                        null
                                );
                            } else {
                                // Hand the drop position back to the shared physics
                                // code (converted device px -> dp) so autonomous
                                // wandering continues from here.
                                android.util.DisplayMetrics dm = getResources().getDisplayMetrics();
                                int dropXDp = Math.round(params.x / dm.density);
                                int dropYDp = Math.round(params.y / dm.density);
                                webView.evaluateJavascript(
                                        "window.syncNativeDragPosition && window.syncNativeDragPosition(" + dropXDp + "," + dropYDp + ");",
                                        null
                                );
                            }
                            webView.evaluateJavascript("window.setOverlayDragging && window.setOverlayDragging(false);", null);
                            isTouching = false;
                            return true;
                    }
                        isTouching = false;
                        return false;
                }
            });

            // Prevent pet from overlapping or being covered when soft keyboard pops up
            floatingLayout.getViewTreeObserver().addOnGlobalLayoutListener(new android.view.ViewTreeObserver.OnGlobalLayoutListener() {
                @Override
                public void onGlobalLayout() {
                    if (params == null || windowManager == null || !isViewAttached || isTouching) return;
                    try {
                        int maxAllowedY = Math.max(0, getAvailableScreenHeight() - params.height);
                        if (params.y > maxAllowedY) {
                            params.y = maxAllowedY;
                            windowManager.updateViewLayout(floatingLayout, params);
                        }
                    } catch (Throwable t) {}
                }
            });

            windowManager.addView(floatingLayout, params);
            isViewAttached = true;

        } catch (Throwable t) {
            t.printStackTrace();
            isViewAttached = false;
        }
    }

    /**
     * Moves this native overlay window to the position the shared
     * character.js wander/physics loop has just computed (it is called
     * from CharacterController.updateTransform() via
     * window.AndroidPetBridge.updatePetPosition on every frame while in
     * "windowFollow" mode). x/y arrive in CSS px (dp) to match the screen
     * size handed to JS in setOverlayScreenSize, so they are converted to
     * device px here.
     */
    private class AndroidPetBridge {
        @android.webkit.JavascriptInterface
        public void updatePetPosition(final int xDp, final int yDp) {
            if (isTouching) return; // user's finger is authoritative during a drag
            webView.post(new Runnable() {
                @Override
                public void run() {
                    if (params == null || windowManager == null || !isViewAttached || isTouching) return;
                    try {
                        android.util.DisplayMetrics dm = getResources().getDisplayMetrics();
                        int maxAllowedX = Math.max(0, dm.widthPixels - params.width);
                        int maxAllowedY = Math.max(0, getAvailableScreenHeight() - params.height);
                        params.x = Math.max(0, Math.min(Math.round(xDp * dm.density), maxAllowedX));
                        params.y = Math.max(0, Math.min(Math.round(yDp * dm.density), maxAllowedY));
                        windowManager.updateViewLayout(floatingLayout, params);
                    } catch (Throwable t) {}
                }
            });
        }
    }

    private int getAvailableScreenHeight() {
        try {
            if (floatingLayout != null) {
                android.graphics.Rect r = new android.graphics.Rect();
                floatingLayout.getWindowVisibleDisplayFrame(r);
                if (r.bottom > 0) return r.bottom;
            }
        } catch (Throwable t) {}
        return getResources().getDisplayMetrics().heightPixels;
    }

    private int dpToPx(int dp) {
        return (int) (dp * getResources().getDisplayMetrics().density);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        try {
            if (isViewAttached && floatingLayout != null && windowManager != null) {
                windowManager.removeView(floatingLayout);
            }
        } catch (Throwable t) {
            t.printStackTrace();
        } finally {
            isViewAttached = false;
            floatingLayout = null;
            webView = null;
        }
    }
}
