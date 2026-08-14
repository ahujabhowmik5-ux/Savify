package com.savify.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import java.util.Arrays;
import java.util.Calendar;
import java.util.List;
import java.util.SortedMap;
import java.util.TreeMap;

/**
 * FocusMonitorService — Replaces the old AccessibilityService approach.
 * Uses UsageStatsManager to poll the foreground app every 1.5 seconds.
 * If a blocked app is detected during the scheduled time, it launches BlockerActivity.
 */
public class FocusMonitorService extends Service {

    private static final String TAG = "SavifyFocusMonitor";
    private static final String CHANNEL_ID = "savify_focus_channel";
    private static final int NOTIFICATION_ID = 9001;
    private static final long POLL_INTERVAL_MS = 1500; // 1.5 seconds

    private Handler handler;
    private Runnable pollRunnable;
    private boolean isRunning = false;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        handler = new Handler(Looper.getMainLooper());
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Notification notification = buildNotification();
        startForeground(NOTIFICATION_ID, notification);

        if (!isRunning) {
            isRunning = true;
            startPolling();
            Log.d(TAG, "Focus Monitor started");
        }

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        isRunning = false;
        if (handler != null && pollRunnable != null) {
            handler.removeCallbacks(pollRunnable);
        }
        Log.d(TAG, "Focus Monitor stopped");
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void startPolling() {
        pollRunnable = new Runnable() {
            @Override
            public void run() {
                if (!isRunning) return;

                String foregroundApp = getForegroundApp();
                if (foregroundApp != null) {
                    checkIfShouldBlock(foregroundApp);
                }

                handler.postDelayed(this, POLL_INTERVAL_MS);
            }
        };
        handler.post(pollRunnable);
    }

    /**
     * Uses UsageStatsManager to detect the current foreground app.
     */
    private String getForegroundApp() {
        try {
            UsageStatsManager usm = (UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
            if (usm == null) return null;

            long now = System.currentTimeMillis();
            // Query usage stats for the last 5 seconds
            List<UsageStats> stats = usm.queryUsageStats(
                UsageStatsManager.INTERVAL_BEST, now - 5000, now
            );

            if (stats == null || stats.isEmpty()) return null;

            // Find the app with the most recent lastTimeUsed
            SortedMap<Long, UsageStats> sortedMap = new TreeMap<>();
            for (UsageStats stat : stats) {
                if (stat.getLastTimeUsed() > 0) {
                    sortedMap.put(stat.getLastTimeUsed(), stat);
                }
            }

            if (!sortedMap.isEmpty()) {
                return sortedMap.get(sortedMap.lastKey()).getPackageName();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error getting foreground app", e);
        }
        return null;
    }

    /**
     * Checks if the detected foreground app should be blocked based on schedule.
     */
    private void checkIfShouldBlock(String packageName) {
        SharedPreferences prefs = getSharedPreferences("SavifyBlockerPrefs", Context.MODE_PRIVATE);
        boolean isActive = prefs.getBoolean("is_active", false);

        if (!isActive) return;

        // Never block ourselves
        if (packageName.equals(getPackageName())) return;

        String blockedStr = prefs.getString("blocked_packages", "");
        if (blockedStr.isEmpty()) return;

        List<String> blockedPackages = Arrays.asList(blockedStr.split(","));

        if (blockedPackages.contains(packageName)) {
            String startStr = prefs.getString("start_time", "00:00");
            String endStr = prefs.getString("end_time", "00:00");

            if (isTimeWithinRange(startStr, endStr)) {
                // Check if recently bypassed
                long bypassTime = prefs.getLong("bypass_until_" + packageName, 0);
                if (System.currentTimeMillis() < bypassTime) {
                    return; // Temporarily bypassed
                }

                // Block it!
                Log.d(TAG, "Blocking app: " + packageName);
                Intent lockIntent = new Intent(this, BlockerActivity.class);
                lockIntent.putExtra("blocked_package", packageName);
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
                return currentMin >= startMin || currentMin <= endMin;
            }
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Focus Schedule",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Monitors apps during your focus schedule");
            channel.setShowBadge(false);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification() {
        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }

        return builder
            .setContentTitle("Focus Mode Active")
            .setContentText("Savify is monitoring blocked apps")
            .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
            .setOngoing(true)
            .build();
    }
}
