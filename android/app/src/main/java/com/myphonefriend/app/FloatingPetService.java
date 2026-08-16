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
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
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

    private WindowManager windowManager;
    private FrameLayout floatingLayout;
    private WindowManager.LayoutParams params;
    private WebView webView;
    private boolean isViewAttached = false;
    private Handler wanderHandler;
    private Runnable wanderRunnable;

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

            // Compact floating window directly sized around character + speech bubble (no full-screen touch blocking)
            params = new WindowManager.LayoutParams(
                    dpToPx(140),
                    dpToPx(160),
                    layoutType,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                    PixelFormat.TRANSLUCENT
            );

            params.gravity = Gravity.TOP | Gravity.START;
            params.x = dpToPx(60);
            params.y = dpToPx(180);

            floatingLayout = new FrameLayout(this);
            floatingLayout.setBackgroundColor(Color.TRANSPARENT);

            // Transparent WebView rendering character & speech bubble
            webView = new WebView(this);
            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setAllowFileAccessFromFileURLs(true);
            settings.setAllowUniversalAccessFromFileURLs(true);
            settings.setMediaPlaybackRequiresUserGesture(false);

            webView.setBackgroundColor(Color.TRANSPARENT);
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
            webView.setWebViewClient(new WebViewClient());

            // Load local android asset bundle offline
            webView.loadUrl("file:///android_asset/public/index.html?mode=overlay");

            floatingLayout.addView(webView, new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
            ));

            // Native Touch & Drag listener to move the floating pet window anywhere on screen
            floatingLayout.setOnTouchListener(new View.OnTouchListener() {
                private int initialX, initialY;
                private float initialTouchX, initialTouchY;
                private long touchStartTime;

                @Override
                public boolean onTouch(View v, MotionEvent event) {
                    if (params == null || windowManager == null || !isViewAttached) return false;

                    switch (event.getAction()) {
                        case MotionEvent.ACTION_DOWN:
                            touchStartTime = System.currentTimeMillis();
                            initialX = params.x;
                            initialY = params.y;
                            initialTouchX = event.getRawX();
                            initialTouchY = event.getRawY();
                            return true;

                        case MotionEvent.ACTION_MOVE:
                            params.x = initialX + (int) (event.getRawX() - initialTouchX);
                            params.y = initialY + (int) (event.getRawY() - initialTouchY);
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
                                // Tap pet -> Open main app
                                try {
                                    Intent launchIntent = new Intent(FloatingPetService.this, MainActivity.class);
                                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                                    startActivity(launchIntent);
                                } catch (Throwable t) {}
                            }
                            return true;
                    }
                    return false;
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
                        int deltaX = (int) ((Math.random() - 0.5) * 30);
                        int deltaY = (int) ((Math.random() - 0.5) * 20);
                        params.x = Math.max(10, Math.min(params.x + deltaX, 800));
                        params.y = Math.max(50, Math.min(params.y + deltaY, 1500));
                        windowManager.updateViewLayout(floatingLayout, params);
                    }
                } catch (Throwable t) {}
                if (wanderHandler != null && isViewAttached) {
                    wanderHandler.postDelayed(this, 3500);
                }
            }
        };
        wanderHandler.postDelayed(wanderRunnable, 3500);
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
