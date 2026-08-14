package com.savify.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

public class SavifyWidget extends AppWidgetProvider {

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager,
                                int appWidgetId) {

        // 1. Grab the layout for the widget
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.savify_widget);

        // 2. Point the Intent to PopupActivity (NOT MainActivity)
        // This ensures only the small popup opens when the widget is clicked.
        Intent intent = new Intent(context, PopupActivity.class);

        // FLAG_ACTIVITY_NEW_TASK is required when starting an activity from a widget
        // FLAG_ACTIVITY_CLEAR_TASK ensures the popup starts fresh every time
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);

        // 3. Wrap it in a PendingIntent
        // We use FLAG_IMMUTABLE for security on modern Android versions
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // 4. Attach the click listener to your green box (R.id.widget_box)
        views.setOnClickPendingIntent(R.id.widget_box, pendingIntent);

        // 5. Apply the update
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onEnabled(Context context) {
        // Run any logic needed when the widget is first added
    }

    @Override
    public void onDisabled(Context context) {
        // Clean up logic here
    }
}