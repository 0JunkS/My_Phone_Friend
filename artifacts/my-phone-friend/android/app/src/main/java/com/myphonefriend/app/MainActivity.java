package com.myphonefriend.app;

import android.Manifest;
import android.app.PictureInPictureParams;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Rational;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int OVERLAY_PERMISSION_REQ_CODE = 1234;
    private static final int NOTIF_PERMISSION_REQ_CODE = 5678;
    private boolean pausedForBackground = false;
    private boolean permissionFlowActive = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            // The overlay WebView is full-screen so it can receive pet
            // gestures. Remove an old instance before showing the main app;
            // otherwise it would sit above the app and consume its touches.
            stopFloatingPetService();
            if (this.bridge != null && this.bridge.getWebView() != null) {
                this.bridge.getWebView().addJavascriptInterface(new AndroidPetBridge(), "AndroidPetBridge");
            }
            checkAndRequestPermissions();
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }

    private void checkAndRequestPermissions() {
        try {
            // Request Notification permission on Android 13+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    permissionFlowActive = true;
                    requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIF_PERMISSION_REQ_CODE);
                }
            }

            // Request Overlay permission
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (!Settings.canDrawOverlays(this)) {
                    permissionFlowActive = true;
                    Intent intent = new Intent(
                            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                            Uri.parse("package:" + getPackageName())
                    );
                    startActivityForResult(intent, OVERLAY_PERMISSION_REQ_CODE);
                }
            }
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        try {
            if (requestCode == OVERLAY_PERMISSION_REQ_CODE) {
                permissionFlowActive = false;
                pausedForBackground = false;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Settings.canDrawOverlays(this)) {
                    startFloatingPetService();
                }
            }
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }

    public void startFloatingPetService() {
        try {
            getPreferences(MODE_PRIVATE).edit()
                    .putBoolean("overlay_enabled", true)
                    .apply();
            startFloatingPetServiceInBackground();
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }

    private void startFloatingPetServiceInBackground() {
        try {
            if (!getPreferences(MODE_PRIVATE).getBoolean("overlay_enabled", true)) {
                return;
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
                checkAndRequestPermissions();
                return;
            }

            Intent serviceIntent = new Intent(this, FloatingPetService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }

    public void stopFloatingPetService() {
        try {
            Intent serviceIntent = new Intent(this, FloatingPetService.class);
            stopService(serviceIntent);
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        try {
            // Do not stop the service during initial launch or while returning
            // from an Android permission screen. Only remove the overlay when
            // the user actually brings the app back from the background.
            if (pausedForBackground && !permissionFlowActive) {
                stopFloatingPetService();
                pausedForBackground = false;
            }
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        try {
            pausedForBackground = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Settings.canDrawOverlays(this)) {
                startFloatingPetServiceInBackground();
            }
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }

    @Override
    public void onUserLeaveHint() {
        super.onUserLeaveHint();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Settings.canDrawOverlays(this)) {
                startFloatingPetService();
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                PictureInPictureParams.Builder pipBuilder = new PictureInPictureParams.Builder();
                Rational aspectRatio = new Rational(1, 1);
                pipBuilder.setAspectRatio(aspectRatio);
                enterPictureInPictureMode(pipBuilder.build());
            }
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }

    public class AndroidPetBridge {
        @JavascriptInterface
        public void startOverlay() {
            runOnUiThread(() -> startFloatingPetService());
        }

        @JavascriptInterface
        public void stopOverlay() {
            runOnUiThread(() -> {
                getPreferences(MODE_PRIVATE).edit()
                        .putBoolean("overlay_enabled", false)
                        .apply();
                stopFloatingPetService();
            });
        }

        @JavascriptInterface
        public boolean isOverlayGranted() {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    return Settings.canDrawOverlays(MainActivity.this);
                }
            } catch (Throwable t) {}
            return true;
        }

        @JavascriptInterface
        public void requestPermission() {
            runOnUiThread(() -> checkAndRequestPermissions());
        }
    }
}
