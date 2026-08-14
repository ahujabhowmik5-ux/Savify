package com.savify.app;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Spinner;
import android.widget.TextView; // <-- Added this to handle the Close Button
import android.widget.Toast;

public class PopupActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.popup_expense);

        // 1. Setup the Close (X) Button
        TextView closeButton = findViewById(R.id.close_button);
        closeButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                // If the user clicks 'X', we just close the popup without saving anything
                finish();
            }
        });

        // 2. Setup the Dropdown (Spinner)
        Spinner categorySpinner = findViewById(R.id.category_spinner);
        String[] categories = {"Shopping", "Bills", "Entertainment", "Food", "Other"};

        ArrayAdapter<String> adapter = new ArrayAdapter<>(
                this, android.R.layout.simple_spinner_item, categories);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        categorySpinner.setAdapter(adapter);

        // 3. Setup Inputs
        EditText amountInput = findViewById(R.id.amount_input);
        Button saveButton = findViewById(R.id.save_button);

        saveButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String amount = amountInput.getText().toString();
                String category = categorySpinner.getSelectedItem().toString();

                // Validation: Prevent saving empty amounts
                if (amount.trim().isEmpty()) {
                    Toast.makeText(PopupActivity.this, "Please enter an amount", Toast.LENGTH_SHORT).show();
                    return;
                }

                /**
                 * 🚀 THE BRIDGE LOGIC
                 * We save to "CapacitorStorage". This is the specific file used by
                 * @capacitor/preferences. The keys MUST match exactly.
                 */
                SharedPreferences sharedPref = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
                SharedPreferences.Editor editor = sharedPref.edit();

                // Capacitor Preferences expects values as Strings
                editor.putString("last_amount", amount);
                editor.putString("last_category", category);
                editor.putString("has_new_data", "true");

                editor.apply();

                Toast.makeText(PopupActivity.this, "Saved: ₹" + amount + " (" + category + ")", Toast.LENGTH_SHORT).show();

                // Close the popup and return to the home screen
                finish();
            }
        });
    }
}