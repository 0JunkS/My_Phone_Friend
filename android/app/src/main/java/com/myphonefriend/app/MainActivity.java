package com.myphonefriend.app;

import android.Manifest;
import android.app.PictureInPictureParams;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Rational;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {

    private static final int OVERLAY_PERMISSION_REQ_CODE = 1234;
    private static final int NOTIF_PERMISSION_REQ_CODE = 5678;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                this.bridge.getWebView().addJavascriptInterface(new AndroidPetBridge(), "AndroidPetBridge");

                // Capacitor's default WebChromeClient does not grant getUserMedia /
                // Web Speech API mic requests on its own, so the in-app triple-tap
                // voice feature silently fails with "no mic". Extend it (instead of
                // replacing it) so file-chooser and other Capacitor behavior is kept,
                // and only auto-grant the audio resource when RECORD_AUDIO has
                // already been approved by the user at the OS level.
                this.bridge.getWebView().setWebChromeClient(new BridgeWebChromeClient(this.bridge) {
                    @Override
                    public void onPermissionRequest(final PermissionRequest request) {
                        try {
                            if (request == null) return;
                            if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                                runOnUiThread(() -> request.grant(request.getResources()));
                            } else {
                                super.onPermissionRequest(request);
                            }
                        } catch (Throwable t) {
                            super.onPermissionRequest(request);
                        }
                    }
                });
            }
            checkAndRequestPermissions();
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }

    private void checkAndRequestPermissions() {
        try {
            // Request Notification (Android 13+) and Microphone permissions together.
            // RECORD_AUDIO is declared in the manifest but, like all dangerous
            // permissions on Android 6+, it also has to be requested at runtime or
            // every mic access (Web Speech API triple-tap, etc.) silently fails.
            java.util.List<String> toRequest = new java.util.ArrayList<>();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    toRequest.add(Manifest.permission.POST_NOTIFICATIONS);
                }
            }
            if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                toRequest.add(Manifest.permission.RECORD_AUDIO);
            }
            if (!toRequest.isEmpty()) {
                requestPermissions(toRequest.toArray(new String[0]), NOTIF_PERMISSION_REQ_CODE);
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
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        try {
            if (requestCode == OVERLAY_PERMISSION_REQ_CODE) {
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
            stopFloatingPetService();
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Settings.canDrawOverlays(this)) {
                startFloatingPetService();
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
            }
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }

    public class AndroidPetBridge {
        @JavascriptInterface
        public void startOverlay() {
            MainActivity.this.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    startFloatingPetService();
                }
            });
        }

        @JavascriptInterface
        public void moveToBackground() {
            MainActivity.this.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    startFloatingPetService();
                    moveTaskToBack(true);
                }
            });
        }

        @JavascriptInterface
        public void syncPetData(final String petJsonData) {
            MainActivity.this.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        android.content.SharedPreferences prefs = getSharedPreferences("MyPetPrefs", MODE_PRIVATE);
                        prefs.edit().putString("pet_data_json", petJsonData).apply();
                        FloatingPetService.updatePetDataInOverlay(petJsonData);
                    } catch (Throwable t) {
                        t.printStackTrace();
                    }
                }
            });
        }

        @JavascriptInterface
        public void stopOverlay() {
            MainActivity.this.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    stopFloatingPetService();
                }
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
            MainActivity.this.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    checkAndRequestPermissions();
                }
            });
        }
    }
}
