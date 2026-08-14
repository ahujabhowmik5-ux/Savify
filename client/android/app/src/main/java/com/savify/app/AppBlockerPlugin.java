package com.savify.app;

import android.app.AppOpsManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "AppBlocker")
public class AppBlockerPlugin extends Plugin {

    private static final String TAG = "AppBlockerPlugin";

    @PluginMethod
    public void setSchedule(PluginCall call) {
        JSArray appsArray = call.getArray("apps");
        String startTime = call.getString("startTime", "");
        String endTime = call.getString("endTime", "");
        boolean active = call.getBoolean("active", false);

        List<String> appPackages = new ArrayList<>();
        if (appsArray != null) {
            for (int i = 0; i < appsArray.length(); i++) {
                try {
                    String appName = appsArray.getString(i).toLowerCase();
                    String pkg = mapAppToPackage(appName);
                    if (!pkg.isEmpty()) {
                        appPackages.add(pkg);
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                }
            }
        }

        // Save to SharedPreferences so the FocusMonitorService can read it
        SharedPreferences prefs = getContext().getSharedPreferences("SavifyBlockerPrefs", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        
        StringBuilder pkgString = new StringBuilder();
        for (String p : appPackages) {
            pkgString.append(p).append(",");
        }

        editor.putString("blocked_packages", pkgString.toString());
        editor.putString("start_time", startTime);
        editor.putString("end_time", endTime);
        editor.putBoolean("is_active", active);
        editor.apply();

        // Start or stop the FocusMonitorService
        Intent serviceIntent = new Intent(getContext(), FocusMonitorService.class);
        if (active && !appPackages.isEmpty()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(serviceIntent);
            } else {
                getContext().startService(serviceIntent);
            }
            Log.d(TAG, "Started FocusMonitorService");
        } else {
            try {
                getContext().stopService(serviceIntent);
                Log.d(TAG, "Stopped FocusMonitorService");
            } catch (Exception e) {
                Log.w(TAG, "Service was not running");
            }
        }

        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("mapped_packages", appPackages.size());
        call.resolve(ret);
    }

    /**
     * Opens the Usage Access settings screen (much less scary than Accessibility).
     * The user simply toggles "Allow usage tracking" for Savify.
     */
    @PluginMethod
    public void requestUsageStatsPermission(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to open usage access settings", e);
        }
    }

    /**
     * Checks if usage stats permission is already granted.
     */
    @PluginMethod
    public void hasUsageStatsPermission(PluginCall call) {
        boolean granted = checkUsageStatsPermission();
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    /**
     * Opens the "Draw Over Other Apps" settings screen.
     */
    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.setData(android.net.Uri.parse("package:" + getContext().getPackageName()));
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to open overlay settings", e);
        }
    }

    /**
     * Legacy method name — now redirects to UsageStats instead of Accessibility.
     */
    @PluginMethod
    public void requestAccessibilityPermission(PluginCall call) {
        requestUsageStatsPermission(call);
    }

    private boolean checkUsageStatsPermission() {
        try {
            AppOpsManager appOps = (AppOpsManager) getContext().getSystemService(Context.APP_OPS_SERVICE);
            int mode = appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                getContext().getPackageName()
            );
            return mode == AppOpsManager.MODE_ALLOWED;
        } catch (Exception e) {
            return false;
        }
    }

    private String mapAppToPackage(String appName) {
        switch (appName) {
            case "youtube": return "com.google.android.youtube";
            case "paytm": return "net.one97.paytm";
            case "phonepe": return "com.phonepe.app";
            case "gpay": return "com.google.android.apps.nbu.paisa.user";
            case "cred": return "com.dreamplug.androidapp";
            case "amazon": return "in.amazon.mShop.android.shopping";
            case "flipkart": return "com.flipkart.android";
            case "myntra": return "com.myntra.android";
            case "meesho": return "com.meesho.supply";
            case "zomato": return "com.application.zomato";
            case "swiggy": return "in.swiggy.android";
            case "blinkit": return "com.grofers.customerapp";
            case "zepto": return "com.zepto";
            default: return "";
        }
    }
}
