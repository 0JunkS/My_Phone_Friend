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
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int OVERLAY_PERMISSION_REQ_CODE = 1234;
    private static final int NOTIF_PERMISSION_REQ_CODE = 5678;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Register Javascript Interface so web app can communicate with Android native service
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().addJavascriptInterface(new AndroidPetBridge(), "AndroidPetBridge");
        }

        checkAndRequestPermissions();
    }

    private void checkAndRequestPermissions() {
        // Request Notification permission on Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIF_PERMISSION_REQ_CODE);
            }
        }

        // Request Overlay permission
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(this)) {
                Intent intent = new Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + getPackageName())
                );
                startActivityForResult(intent, OVERLAY_PERMISSION_REQ_CODE);
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == OVERLAY_PERMISSION_REQ_CODE) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Settings.canDrawOverlays(this)) {
                startFloatingPetService();
            }
        }
    }

    public void startFloatingPetService() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            checkAndRequestPermissions();
            return;
        }

        try {
            Intent serviceIntent = new Intent(this, FloatingPetService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void stopFloatingPetService() {
        try {
            Intent serviceIntent = new Intent(this, FloatingPetService.class);
            stopService(serviceIntent);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Stop overlay while user is actively inside main activity
        stopFloatingPetService();
    }

    @Override
    protected void onPause() {
        super.onPause();
        // Start floating overlay pet when user leaves or minimizes the app
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Settings.canDrawOverlays(this)) {
            startFloatingPetService();
        }
    }

    @Override
    public void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Settings.canDrawOverlays(this)) {
            startFloatingPetService();
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                PictureInPictureParams.Builder pipBuilder = new PictureInPictureParams.Builder();
                Rational aspectRatio = new Rational(1, 1);
                pipBuilder.setAspectRatio(aspectRatio);
                enterPictureInPictureMode(pipBuilder.build());
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    public class AndroidPetBridge {
        @JavascriptInterface
        public void startOverlay() {
            runOnUiThread(() -> startFloatingPetService());
        }

        @JavascriptInterface
        public void stopOverlay() {
            runOnUiThread(() -> stopFloatingPetService());
        }

        @JavascriptInterface
        public boolean isOverlayGranted() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                return Settings.canDrawOverlays(MainActivity.this);
            }
            return true;
        }

        @JavascriptInterface
        public void requestPermission() {
            runOnUiThread(() -> checkAndRequestPermissions());
        }
    }
}
