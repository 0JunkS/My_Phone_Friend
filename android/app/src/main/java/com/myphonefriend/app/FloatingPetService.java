package com.myphonefriend.app;

import android.animation.ObjectAnimator;
import android.animation.PropertyValuesHolder;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
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
import android.widget.FrameLayout;
import android.widget.TextView;

public class FloatingPetService extends Service {

    private WindowManager windowManager;
    private FrameLayout floatingLayout;
    private WindowManager.LayoutParams params;
    private TextView petView;
    private TextView speechView;
    private Handler wanderHandler;
    private Runnable wanderRunnable;
    private boolean isViewAttached = false;

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
            createNativeFloatingPet();
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
                    .setContentText("화면 위에서 펫이 함께하고 있어요!")
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
                createNativeFloatingPet();
            }
        } catch (Throwable t) {
            t.printStackTrace();
        }
        return START_STICKY;
    }

    private void createNativeFloatingPet() {
        // Overlay permission check
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

            params = new WindowManager.LayoutParams(
                    dpToPx(120),
                    dpToPx(130),
                    layoutType,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL |
                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                    PixelFormat.TRANSLUCENT
            );

            params.gravity = Gravity.TOP | Gravity.START;
            params.x = dpToPx(60);
            params.y = dpToPx(180);

            floatingLayout = new FrameLayout(this);
            floatingLayout.setBackgroundColor(Color.TRANSPARENT);

            // Speech Bubble View
            speechView = new TextView(this);
            speechView.setText("안녕! 🍌");
            speechView.setTextColor(Color.parseColor("#0f172a"));
            speechView.setTextSize(11);
            speechView.setPadding(dpToPx(8), dpToPx(4), dpToPx(8), dpToPx(4));
            speechView.setBackgroundColor(Color.parseColor("#EEFFFFFF"));
            speechView.setGravity(Gravity.CENTER);
            speechView.setVisibility(View.GONE);

            FrameLayout.LayoutParams speechParams = new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT
            );
            speechParams.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
            floatingLayout.addView(speechView, speechParams);

            // Mascot Character Emoji View
            petView = new TextView(this);
            petView.setText("🍌");
            petView.setTextSize(50);
            petView.setGravity(Gravity.CENTER);

            FrameLayout.LayoutParams petParams = new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
            );
            petParams.gravity = Gravity.CENTER;
            floatingLayout.addView(petView, petParams);

            // Bobbing Animation
            startBobbingAnimation();

            // Touch, Drag & Tap Listeners on Android Screen
            floatingLayout.setOnTouchListener(new View.OnTouchListener() {
                private int initialX, initialY;
                private float initialTouchX, initialTouchY;
                private long touchStartTime;
                private int tapCount = 0;
                private long lastTapTime = 0;

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
                            if (petView != null) {
                                petView.setScaleX(1.15f);
                                petView.setScaleY(1.15f);
                            }
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
                            if (petView != null) {
                                petView.setScaleX(1.0f);
                                petView.setScaleY(1.0f);
                            }

                            long duration = System.currentTimeMillis() - touchStartTime;
                            float diffX = Math.abs(event.getRawX() - initialTouchX);
                            float diffY = Math.abs(event.getRawY() - initialTouchY);

                            if (duration < 350 && diffX < 15 && diffY < 15) {
                                long now = System.currentTimeMillis();
                                if (now - lastTapTime < 500) {
                                    tapCount++;
                                } else {
                                    tapCount = 1;
                                }
                                lastTapTime = now;

                                if (tapCount >= 2) {
                                    // Double tap -> Open MainActivity
                                    try {
                                        Intent launchIntent = new Intent(FloatingPetService.this, MainActivity.class);
                                        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                                        startActivity(launchIntent);
                                    } catch (Throwable t) {}
                                    tapCount = 0;
                                } else {
                                    showSpeechBubble("반가워요! 🍌✨", 2500);
                                }
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

    private void startBobbingAnimation() {
        try {
            if (petView == null) return;
            ObjectAnimator bobAnimator = ObjectAnimator.ofPropertyValuesHolder(
                    petView,
                    PropertyValuesHolder.ofFloat("translationY", 0f, -10f, 0f),
                    PropertyValuesHolder.ofFloat("rotation", -3f, 3f, -3f)
            );
            bobAnimator.setDuration(1200);
            bobAnimator.setRepeatCount(ObjectAnimator.INFINITE);
            bobAnimator.setRepeatMode(ObjectAnimator.RESTART);
            bobAnimator.start();
        } catch (Throwable t) {}
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
                        int deltaY = (int) ((Math.random() - 0.5) * 25);
                        params.x = Math.max(10, Math.min(params.x + deltaX, 800));
                        params.y = Math.max(50, Math.min(params.y + deltaY, 1500));
                        windowManager.updateViewLayout(floatingLayout, params);
                    }
                } catch (Throwable t) {}
                if (wanderHandler != null && isViewAttached) {
                    wanderHandler.postDelayed(this, 3000);
                }
            }
        };
        wanderHandler.postDelayed(wanderRunnable, 3000);
    }

    private void showSpeechBubble(String text, int durationMs) {
        try {
            if (speechView == null) return;
            speechView.setText(text);
            speechView.setVisibility(View.VISIBLE);
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                try {
                    if (speechView != null) speechView.setVisibility(View.GONE);
                } catch (Throwable t) {}
            }, durationMs);
        } catch (Throwable t) {}
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
        }
    }
}
