package com.savify.app;

import android.app.Activity;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.ArrayAdapter;
import android.widget.EditText;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class WidgetExpenseActivity extends Activity {

    private static final String SUPABASE_URL = "https://zipowqnjznngzyxdtxwm.supabase.co";
    private static final String SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppcG93cW5qem5uZ3p5eGR0eHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NzEyNTQsImV4cCI6MjA4MzI0NzI1NH0.6OKydmyzpbtyWG7GzTSnXwudwBABsFVWiNfX4G7II3g";

    private static final String[] CATEGORIES = {
            "Food", "Transport", "Shopping", "Entertainment", "Bills", "Education"
    };

    private EditText amountInput;
    private Spinner categorySpinner;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Make the activity look like a dialog popup
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        setContentView(R.layout.popup_expense);

        // Make background translucent
        getWindow().setLayout(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT);
        getWindow().setBackgroundDrawableResource(android.R.color.transparent);

        // Initialize views
        amountInput = findViewById(R.id.amount_input);
        categorySpinner = findViewById(R.id.category_spinner);

        // Set up category spinner
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this,
                R.layout.spinner_item, CATEGORIES);
        adapter.setDropDownViewResource(R.layout.spinner_dropdown_item);
        categorySpinner.setAdapter(adapter);

        // Close button
        TextView closeButton = findViewById(R.id.close_button);
        closeButton.setOnClickListener(v -> finish());

        // Save button
        View saveButton = findViewById(R.id.save_button);
        saveButton.setOnClickListener(v -> saveExpense());
    }

    private void saveExpense() {
        String amountStr = amountInput.getText().toString().trim();
        if (amountStr.isEmpty()) {
            Toast.makeText(this, "Please enter an amount", Toast.LENGTH_SHORT).show();
            return;
        }

        double amount;
        try {
            amount = Double.parseDouble(amountStr);
            if (amount <= 0) {
                Toast.makeText(this, "Amount must be greater than 0", Toast.LENGTH_SHORT).show();
                return;
            }
        } catch (NumberFormatException e) {
            Toast.makeText(this, "Invalid amount", Toast.LENGTH_SHORT).show();
            return;
        }

        String category = categorySpinner.getSelectedItem().toString();

        // Get user_id from SharedPreferences (stored by Capacitor Preferences plugin)
        SharedPreferences prefs = getSharedPreferences("CapacitorStorage", MODE_PRIVATE);
        String userId = prefs.getString("savify_user_id", null);

        if (userId == null || userId.isEmpty()) {
            Toast.makeText(this, "Please open the app and sign in first", Toast.LENGTH_LONG).show();
            return;
        }

        // Disable button while saving
        findViewById(R.id.save_button).setEnabled(false);

        // Send to Supabase in background thread
        new Thread(() -> {
            boolean success = false;
            try {
                URL url = new URL(SUPABASE_URL + "/rest/v1/expenses");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("apikey", SUPABASE_ANON_KEY);
                conn.setRequestProperty("Authorization", "Bearer " + SUPABASE_ANON_KEY);
                conn.setRequestProperty("Prefer", "return=minimal");
                conn.setDoOutput(true);

                String json = "{\"user_id\":\"" + userId + "\","
                        + "\"amount\":" + amount + ","
                        + "\"category\":\"" + category + "\","
                        + "\"description\":\"Widget Quick Add\"}";

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(json.getBytes(StandardCharsets.UTF_8));
                }

                int responseCode = conn.getResponseCode();
                success = (responseCode == 200 || responseCode == 201);
                conn.disconnect();
            } catch (Exception e) {
                e.printStackTrace();
            }

            boolean finalSuccess = success;
            runOnUiThread(() -> {
                if (finalSuccess) {
                    Toast.makeText(this, "✅ ₹" + amountStr + " added to " + category, Toast.LENGTH_SHORT).show();
                    finish();
                } else {
                    Toast.makeText(this, "❌ Failed to save. Check internet connection.", Toast.LENGTH_SHORT).show();
                    findViewById(R.id.save_button).setEnabled(true);
                }
            });
        }).start();
    }
}
