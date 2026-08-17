package com.myphonefriend.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

public class FloatingPetService extends Service {

    private WindowManager windowManager;
    private FrameLayout floatingLayout;
    private WindowManager.LayoutParams params;
    private WebView webView;
    private boolean isViewAttached = false;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private static final String CHANNEL_ID = "FloatingPetChannel";
    private static final int NOTIFICATION_ID = 1001;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        try {
            startForegroundServiceWithNotification();
            createWebOverlayFloatingPet();
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
                    .setContentText("화면 위에서 똑같은 캐릭터가 함께하고 있어요!")
                    .setSmallIcon(android.R.drawable.star_on)
                    .setContentIntent(pendingIntent)
                    .setOngoing(true)
                    .build();

            startForeground(NOTIFICATION_ID, notification);
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        try {
            startForegroundServiceWithNotification();
            if (!isViewAttached) {
                createWebOverlayFloatingPet();
            }
        } catch (Throwable t) {
            t.printStackTrace();
        }
        return START_STICKY;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // Swiping the host activity away should not silently remove the
        // foreground companion. Android may recreate a START_STICKY service,
        // but scheduling one explicit retry makes the behavior deterministic
        // on devices that aggressively detach services from the task.
        Intent restartIntent = new Intent(getApplicationContext(), FloatingPetService.class);
        mainHandler.postDelayed(() -> {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(restartIntent);
                } else {
                    startService(restartIntent);
                }
            } catch (Throwable t) {
                t.printStackTrace();
            }
        }, 1000L);
        super.onTaskRemoved(rootIntent);
    }

    private void createWebOverlayFloatingPet() {
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

            // Full screen transparent overlay window
            params = new WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.MATCH_PARENT,
                    layoutType,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL |
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                    PixelFormat.TRANSLUCENT
            );

            params.gravity = Gravity.TOP | Gravity.START;

            floatingLayout = new FrameLayout(this);
            floatingLayout.setBackgroundColor(Color.TRANSPARENT);

            // Transparent WebView rendering local APK asset bundle offline
            webView = new WebView(this);
            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setAllowFileAccessFromFileURLs(true);
            settings.setAllowUniversalAccessFromFileURLs(true);
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setDatabaseEnabled(true);

            // A transparent WebView in a TYPE_APPLICATION_OVERLAY window can
            // lose its SVG layer on some Android GPU implementations. The
            // software layer keeps the page transparent while compositing the
            // character reliably above other apps.
            webView.setBackgroundColor(Color.TRANSPARENT);
            webView.setLayerType(View.LAYER_TYPE_SOFTWARE, null);
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

            webView.setWebViewClient(new WebViewClient() {
                @Override
                public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                    super.onReceivedError(view, request, error);
                }
            });

            // Use the dedicated, UI-free overlay entry point. Loading the
            // dashboard entry point here hid the app shell but still depended
            // on the dashboard bundle and could leave a transparent window
            // when Android resolved its asset URLs from file://.
            webView.loadUrl("file:///android_asset/public/pet-overlay.html?mode=overlay");

            floatingLayout.addView(webView, new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
            ));

            windowManager.addView(floatingLayout, params);
            isViewAttached = true;

        } catch (Throwable t) {
            t.printStackTrace();
            isViewAttached = false;
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        try {
            mainHandler.removeCallbacksAndMessages(null);
            if (isViewAttached && floatingLayout != null && windowManager != null) {
                windowManager.removeView(floatingLayout);
            }
            if (webView != null) {
                webView.stopLoading();
                webView.destroy();
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
