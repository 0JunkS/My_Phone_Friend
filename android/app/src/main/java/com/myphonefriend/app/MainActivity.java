package com.myphonefriend.app;

import android.app.PictureInPictureParams;
import android.content.res.Configuration;
import android.os.Build;
import android.os.Bundle;
import android.util.Rational;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    /**
     * Triggered when the user presses Home button or switches apps on Android.
     * Automatically enters Picture-in-Picture mode so the pet stays floating over all apps!
     */
    @Override
    public void onUserLeaveHint() {
        super.onUserLeaveHint();
        enterAutoPipMode();
    }

    private void enterAutoPipMode() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                PictureInPictureParams.Builder pipBuilder = new PictureInPictureParams.Builder();
                // 1:1 Aspect ratio for pet floating widget
                Rational aspectRatio = new Rational(1, 1);
                pipBuilder.setAspectRatio(aspectRatio);
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    pipBuilder.setAutoEnterEnabled(true);
                    pipBuilder.setSeamlessResizeEnabled(true);
                }
                
                enterPictureInPictureMode(pipBuilder.build());
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    @Override
    public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode, Configuration newConfig) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig);
        // Inform webview if needed via bridge
    }
}
