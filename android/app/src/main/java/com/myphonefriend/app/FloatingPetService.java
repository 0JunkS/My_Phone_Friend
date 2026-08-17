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
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
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
    private Handler wanderHandler;
    private Runnable wanderRunnable;
    private boolean isTouching = false;
    private float wanderVelocityX = 2.0f;
    private float wanderVelocityY = 1.35f;

    private static final String CHANNEL_ID = "FloatingPetChannel";
    private static final int NOTIFICATION_ID = 1001;

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

            final int newWidth = Math.round(dpToPx(160) * (float) scale);
            final int newHeight = Math.round(dpToPx(180) * (float) scale);

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

            // Compact floating window directly sized around character + speech bubble
            android.util.DisplayMetrics metrics = getResources().getDisplayMetrics();
            int screenWidth = metrics.widthPixels;
            int screenHeight = metrics.heightPixels;

            params = new WindowManager.LayoutParams(
                    dpToPx(160),
                    dpToPx(180),
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

            // WebChromeClient: grant microphone permission to WebView for SpeechRecognition
            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    new Handler(Looper.getMainLooper()).post(new Runnable() {
                        @Override
                        public void run() {
                            request.grant(request.getResources());
                        }
                    });
                }
            });

            // JS interface: allow JS to request/release focus for mic
            webView.addJavascriptInterface(new Object() {
                @android.webkit.JavascriptInterface
                public void requestFocus() {
                    new Handler(Looper.getMainLooper()).post(new Runnable() {
                        @Override
                        public void run() {
                            try {
                                if (params != null && windowManager != null && isViewAttached && floatingLayout != null) {
                                    params.flags &= ~WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
                                    windowManager.updateViewLayout(floatingLayout, params);
                                    webView.requestFocus();
                                }
                            } catch (Throwable t) {}
                        }
                    });
                }
                @android.webkit.JavascriptInterface
                public void releaseFocus() {
                    new Handler(Looper.getMainLooper()).post(new Runnable() {
                        @Override
                        public void run() {
                            try {
                                if (params != null && windowManager != null && isViewAttached && floatingLayout != null) {
                                    params.flags |= WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
                                    windowManager.updateViewLayout(floatingLayout, params);
                                }
                            } catch (Throwable t) {}
                        }
                    });
                }
            }, "OverlayFocusBridge");

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
                        view.loadUrl("file:///android_asset/public/pet-overlay.html");
                    }
                }
            });

            // Load the dedicated pet overlay HTML containing ZERO main app text/UI
            webView.loadUrl("file:///android_asset/public/pet-overlay.html");

            floatingLayout.addView(webView, new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
            ));

            // Native Touch & Drag listener with triple-tap detection
            // Touch events are dispatched to the WebView so character.js internal
            // triple-tap detection works (pointerdown/pointerup sequence)
            webView.setOnTouchListener(new View.OnTouchListener() {
                private int initialX, initialY;
                private float initialTouchX, initialTouchY;
                private long touchStartTime;
                private boolean movedBeyondThreshold = false;

                @Override
                public boolean onTouch(View v, MotionEvent event) {
                    if (params == null || windowManager == null || !isViewAttached) return false;

                    // Always forward touch events to the WebView so character.js
                    // receives the pointer events and handles triple-tap internally
                    webView.dispatchTouchEvent(event);

                    switch (event.getAction()) {
                        case MotionEvent.ACTION_DOWN:
                            isTouching = true;
                            movedBeyondThreshold = false;
                            touchStartTime = System.currentTimeMillis();
                            initialX = params.x;
                            initialY = params.y;
                            initialTouchX = event.getRawX();
                            initialTouchY = event.getRawY();
                            return true;

                        case MotionEvent.ACTION_MOVE:
                            float moveDiffX = Math.abs(event.getRawX() - initialTouchX);
                            float moveDiffY = Math.abs(event.getRawY() - initialTouchY);

                            // Only start dragging window after significant movement
                            if (moveDiffX > 15 || moveDiffY > 15) {
                                movedBeyondThreshold = true;
                            }

                            if (movedBeyondThreshold) {
                                int rawX = initialX + (int) (event.getRawX() - initialTouchX);
                                int rawY = initialY + (int) (event.getRawY() - initialTouchY);

                                android.util.DisplayMetrics currentMetrics = getResources().getDisplayMetrics();
                                int maxAllowedX = Math.max(0, currentMetrics.widthPixels - params.width);
                                int maxAllowedY = Math.max(0, getAvailableScreenHeight() - params.height);

                                params.x = Math.max(0, Math.min(rawX, maxAllowedX));
                                params.y = Math.max(0, Math.min(rawY, maxAllowedY));

                                try {
                                    if (isViewAttached && floatingLayout != null) {
                                        windowManager.updateViewLayout(floatingLayout, params);
                                    }
                                } catch (Throwable t) {}
                            }
                            return true;

                        case MotionEvent.ACTION_UP:
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
                    if (params == null || windowManager == null || !isViewAttached) return;
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
            startAutonomousWander();

        } catch (Throwable t) {
            t.printStackTrace();
            isViewAttached = false;
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

    private void startAutonomousWander() {
        if (wanderHandler != null && wanderRunnable != null) {
            wanderHandler.removeCallbacks(wanderRunnable);
        }
        wanderHandler = new Handler(Looper.getMainLooper());
        wanderRunnable = new Runnable() {
            @Override
            public void run() {
                try {
                    if (isViewAttached && floatingLayout != null && params != null && windowManager != null) {
                        android.util.DisplayMetrics currentMetrics = getResources().getDisplayMetrics();
                        int maxAllowedX = Math.max(0, currentMetrics.widthPixels - params.width);
                        int maxAllowedY = Math.max(0, getAvailableScreenHeight() - params.height);

                        if (!isTouching) {
                            params.x += Math.round(wanderVelocityX);
                            params.y += Math.round(wanderVelocityY);
                            if (params.x <= 0 || params.x >= maxAllowedX) {
                                wanderVelocityX = -wanderVelocityX;
                                params.x = Math.max(0, Math.min(params.x, maxAllowedX));
                            }
                            if (params.y <= 0 || params.y >= maxAllowedY) {
                                wanderVelocityY = -wanderVelocityY;
                                params.y = Math.max(0, Math.min(params.y, maxAllowedY));
                            }
                        }
                        windowManager.updateViewLayout(floatingLayout, params);
                    }
                } catch (Throwable t) {}
                if (wanderHandler != null && isViewAttached) {
                    wanderHandler.postDelayed(this, 32);
                }
            }
        };
        wanderHandler.post(wanderRunnable);
    }

    private int dpToPx(int dp) {
        return (int) (dp * getResources().getDisplayMetrics().density);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        try {
            if (wanderHandler != null && wanderRunnable != null) {
                wanderHandler.removeCallbacks(wanderRunnable);
                wanderHandler = null;
                wanderRunnable = null;
            }
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
