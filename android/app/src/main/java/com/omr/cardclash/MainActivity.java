package com.omr.cardclash;

import android.os.Bundle;
import android.view.View;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LocalServerPlugin.class);
        super.onCreate(savedInstanceState);
        
        // Set Status and Navigation Bar colors
        getWindow().setStatusBarColor(android.graphics.Color.parseColor("#0f172a"));
        getWindow().setNavigationBarColor(android.graphics.Color.parseColor("#0f172a"));
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);

        if (hasFocus) {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            );
        }
    }
}
