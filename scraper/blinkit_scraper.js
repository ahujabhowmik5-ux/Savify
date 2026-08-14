/**
 * SAVIFY BLINKIT LOCAL MULTI-CATEGORY SCRAPER
 * Run this locally to sync your college's dark store inventory to Supabase.
 * 
 * Usage:
 * 1. cd scraper
 * 2. npm install
 * 3. npm start
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../client/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// ✏️ EDIT THIS LIST TO ADD/REMOVE CATEGORIES
// ==========================================
const CATEGORY_URLS = [
    'https://blinkit.com/cn/chips-crisps/cid/1237/940',
    'https://blinkit.com/cn/chocolates/cid/9/944',
    'https://blinkit.com/cn/soft-drinks/cid/332/1102'
];
// ==========================================

// Helper to extract a readable category name from the Blinkit URL
function getCategoryNameFromUrl(url) {
    try {
        const parts = url.split('/');
        const cnIndex = parts.indexOf('cn');
        if (cnIndex !== -1 && parts[cnIndex + 1]) {
            return parts[cnIndex + 1].split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        }
    } catch (e) {}
    return 'Misc';
}

async function runScraper() {
    console.log('🚀 Starting Multi-Category Blinkit Scraper...');
    
    // Non-headless so you can set your location
    const browser = await chromium.launchPersistentContext('./user_data', { 
        headless: false, 
        viewport: { width: 1280, height: 800 } 
    });

    const page = await browser.newPage();
    
    // Step 1: Go to homepage to let user set location
    await page.goto('https://blinkit.com/');
    console.log('\n⏳ WAITING 20 SECONDS...');
    console.log('👉 ACTION REQUIRED: Ensure your location is set to IIT KGP right now in the browser window!');
    console.log('If you are already logged in and location is set, just wait.\n');
    await page.waitForTimeout(20000); 

    // Step 2: Loop through URLs
    let totalScraped = 0;

    for (const url of CATEGORY_URLS) {
        const categoryName = getCategoryNameFromUrl(url);
        console.log(`\n===========================================`);
        console.log(`🔎 Scraping Category: ${categoryName}`);
        console.log(`🔗 URL: ${url}`);
        
        await page.goto(url);
        await page.waitForTimeout(4000); // Wait for initial load

        // Scroll down multiple times to lazy-load products
        console.log(`⏬ Scrolling to load items...`);
        for (let i = 0; i < 12; i++) {
            await page.evaluate(() => window.scrollBy(0, 1000));
            await page.waitForTimeout(1000); // 1 second between scrolls to let images/data load
        }

        // Extract products using the robust visual heuristic
        console.log(`⛏️ Extracting data...`);
        const products = await page.evaluate((catName) => {
            const items = [];
            
            // Find all "ADD" buttons as anchors for product cards
            const addButtons = Array.from(document.querySelectorAll('div, button')).filter(el => el.innerText && el.innerText.trim() === 'ADD');
            
            const processedContainers = new Set();

            addButtons.forEach(btn => {
                // Traverse up to find the main product card container
                let container = btn.parentElement;
                for(let i=0; i<4; i++) {
                    if (container) container = container.parentElement;
                }

                if (container && !processedContainers.has(container)) {
                    processedContainers.add(container);
                    
                    const textContent = container.innerText.split('\n').map(t => t.trim()).filter(t => t);
                    
                    // Find Price (string containing ₹)
                    const priceText = textContent.find(t => t.includes('₹'));
                    let price = null;
                    if (priceText) {
                        const match = priceText.match(/₹\s*(\d+)/);
                        if (match) price = parseInt(match[1], 10);
                    }

                    // Find Name (first string that isn't a price, 'ADD', or a time estimate)
                    let name = null;
                    for (let text of textContent) {
                        if (!text.includes('₹') && text !== 'ADD' && text.length > 5 && !text.includes('MINS') && !text.includes('% OFF')) {
                            name = text;
                            break;
                        }
                    }

                    const imgEl = container.querySelector('img');
                    const imageUrl = imgEl ? imgEl.src : '';

                    if (name && price) {
                        items.push({
                            name: name,
                            price: price,
                            image_url: imageUrl,
                            category: catName,
                            in_stock: true
                        });
                    }
                }
            });
            return items;
        }, categoryName);

        console.log(`✅ Found ${products.length} products in ${categoryName}.`);

        if (products.length > 0) {
            console.log('💾 Saving to Supabase...');
            
            // Delete old products for this category to prevent stale data
            await supabase.from('products').delete().eq('category', categoryName);
            
            // Insert new ones
            const { error } = await supabase.from('products').insert(products);
            if (error) {
                console.error('❌ Supabase Error:', error.message);
            } else {
                console.log(`🎉 Successfully synced ${products.length} ${categoryName} to Savify!`);
                totalScraped += products.length;
            }
        }
        
        // Wait a bit before hitting the next URL to avoid rate limits
        await page.waitForTimeout(3000);
    }

    await browser.close();
    console.log(`\n===========================================`);
    console.log(`🏆 SCRAPER FINISHED! Total products synced: ${totalScraped}`);
    console.log(`===========================================`);
}

runScraper().catch(console.error);
