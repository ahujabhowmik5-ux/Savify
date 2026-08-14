package com.savify.app;

import android.accessibilityservice.AccessibilityService;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;

import java.util.Arrays;
import java.util.Calendar;
import java.util.List;

public class AppBlockService extends AccessibilityService {
    private static final String TAG = "SavifyAppBlockService";

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event.getEventType() == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            if (event.getPackageName() != null) {
                String currentPackage = event.getPackageName().toString();
                checkIfShouldBlock(currentPackage);
            }
        }
    }

    @Override
    public void onInterrupt() {
        Log.d(TAG, "Service interrupted");
    }

    private void checkIfShouldBlock(String packageName) {
        SharedPreferences prefs = getSharedPreferences("SavifyBlockerPrefs", Context.MODE_PRIVATE);
        boolean isActive = prefs.getBoolean("is_active", false);

        Log.d(TAG, "Window changed to: " + packageName + " (active=" + isActive + ")");

        if (!isActive) return;

        // Never block ourselves
        if (packageName.equals(getPackageName())) return;

        String blockedStr = prefs.getString("blocked_packages", "");
        if (blockedStr.isEmpty()) return;

        List<String> blockedPackages = Arrays.asList(blockedStr.split(","));
        
        if (blockedPackages.contains(packageName)) {
            // It's a blocked app! Check schedule.
            String startStr = prefs.getString("start_time", "00:00");
            String endStr = prefs.getString("end_time", "00:00");

            if (isTimeWithinRange(startStr, endStr)) {
                // Check if recently bypassed
                long bypassTime = prefs.getLong("bypass_until_" + packageName, 0);
                if (System.currentTimeMillis() < bypassTime) {
                    Log.d(TAG, "App " + packageName + " is temporarily bypassed.");
                    return;
                }

                // Block it!
                Log.d(TAG, "Blocking app: " + packageName);
                Intent lockIntent = new Intent(this, BlockerActivity.class);
                lockIntent.putExtra("blocked_package", packageName);
                // NEW_TASK is crucial when launching from a Service
                lockIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                startActivity(lockIntent);
            }
        }
    }

    private boolean isTimeWithinRange(String start, String end) {
        try {
            String[] sParams = start.split(":");
            String[] eParams = end.split(":");
            int sH = Integer.parseInt(sParams[0]);
            int sM = Integer.parseInt(sParams[1]);
            int eH = Integer.parseInt(eParams[0]);
            int eM = Integer.parseInt(eParams[1]);

            Calendar now = Calendar.getInstance();
            int currentMin = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);
            int startMin = sH * 60 + sM;
            int endMin = eH * 60 + eM;

            if (startMin <= endMin) {
                return currentMin >= startMin && currentMin <= endMin;
            } else {
                // Spans midnight (e.g. 22:00 to 06:00)
                return currentMin >= startMin || currentMin <= endMin;
            }
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
}
