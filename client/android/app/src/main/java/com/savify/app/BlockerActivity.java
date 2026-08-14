package com.savify.app;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

public class BlockerActivity extends Activity {

    private String blockedPackage = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Ensure this overlay appears above everything (like a lock screen)
        // If the user has "Draw Over Other Apps" permission, TYPE_APPLICATION_OVERLAY puts it absolutely on top
        // Here we just use an Activity, we'll try to keep it full screen and hide navigation
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                             WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                             WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);

        setContentView(R.layout.activity_blocker);

        if (getIntent() != null) {
            blockedPackage = getIntent().getStringExtra("blocked_package");
        }

        Button btnClose = findViewById(R.id.btn_close_app);
        Button btnBypass = findViewById(R.id.btn_bypass_app);

        // Close App Button -> Redirect to Home Screen
        btnClose.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent homeIntent = new Intent(Intent.ACTION_MAIN);
                homeIntent.addCategory(Intent.CATEGORY_HOME);
                homeIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(homeIntent);
                finish();
            }
        });

        // Continue Anyway Button -> Bypass for 5 minutes
        btnBypass.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (blockedPackage != null && !blockedPackage.isEmpty()) {
                    SharedPreferences prefs = getSharedPreferences("SavifyBlockerPrefs", Context.MODE_PRIVATE);
                    SharedPreferences.Editor editor = prefs.edit();
                    // 5 minutes bypass
                    long bypassUntil = System.currentTimeMillis() + (5 * 60 * 1000);
                    editor.putLong("bypass_until_" + blockedPackage, bypassUntil);
                    editor.apply();

                    // Explicitly re-launch the app they were trying to open
                    Intent launchIntent = getPackageManager().getLaunchIntentForPackage(blockedPackage);
                    if (launchIntent != null) {
                        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                        startActivity(launchIntent);
                    }
                    
                    finish();
                }
            }
        });
    }

    @Override
    public void onBackPressed() {
        // Prevent back button from escaping the block screen loosely
        Intent homeIntent = new Intent(Intent.ACTION_MAIN);
        homeIntent.addCategory(Intent.CATEGORY_HOME);
        homeIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(homeIntent);
        finish();
    }
}
