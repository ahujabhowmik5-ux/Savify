# WhatsApp hall-group broadcasts (WaSenderAPI)

When someone opens a quick-commerce pool (Blinkit, Zepto, Instamart, …), Savify
posts a join link into the WhatsApp group for the hall they ordered from. Start
a pool from LBS and the LBS group hears about it; start one from somewhere with
no hall mapping and it goes to the fallback group instead.

---

## What you need to supply

Two things, and only two:

1. **A WaSenderAPI key** for the WhatsApp session that will send the messages.
2. **The WhatsApp group JID for each hall** — the `120363…@g.us` identifier.

Everything else is already in the repo.

---

## Step 1 — Connect the sending number

In the WaSenderAPI dashboard, create a session and scan the QR with the phone
number that will post the messages.

Use a **dedicated number**, not a personal one. It must be a member of every
group it posts into, and WhatsApp treats a number that suddenly starts
broadcasting to twenty groups as suspicious. A number that only ever does this
job is much less likely to be limited.

Copy the API key from the dashboard.

## Step 2 — Set the environment variables

In Vercel (Settings → Environment Variables), and in `server/.env` for local runs:

```
WASENDER_API_KEY=<your key>
WASENDER_API_URL=https://www.wasenderapi.com
PUBLIC_APP_URL=https://savify.in
```

Without `WASENDER_API_KEY` the feature is simply inert — pools still work, the
broadcast is skipped.

## Step 3 — Run the migrations

In the Supabase SQL Editor, run both files from the repo root:

- `supabase_whatsapp_pool_groups.sql` — the location → group mapping table,
  pre-seeded with all 20 IIT Kharagpur halls plus a `MISC` fallback row.
- `supabase_pool_buffer_timer.sql` — the 15-minute window + 10-minute buffer.

Seeded rows have `group_jid = NULL` and `is_active = false`, so nothing sends
until you fill them in.

## Step 4 — Add the sending number to each hall group

The number from step 1 has to be a participant in every group it posts to. Ask
each hall's group admin to add it. (Admin rights are not needed — plain
membership is enough to send.)

## Step 5 — Collect the group JIDs

Once the number is in the groups, list them:

```bash
curl -H "Authorization: Bearer $WASENDER_API_KEY" https://www.wasenderapi.com/api/groups
```

Or, with the app deployed, hit the endpoint that also shows which groups are
already mapped:

```
GET https://savify.in/api/whatsapp/groups
```

```json
{
  "success": true,
  "groups": [
    { "jid": "120363123456789012@g.us", "name": "LBS Hall Official", "mapped_to": null, "is_active": false }
  ],
  "unmapped_locations": ["LBS", "RK", "Nehru", "..."]
}
```

## Step 6 — Map JIDs to halls

One `UPDATE` per hall in the Supabase SQL Editor:

```sql
UPDATE whatsapp_pool_groups
SET group_jid = '120363123456789012@g.us', is_active = true
WHERE location_key = 'LBS';
```

Location keys are the hall short codes:

| | | | |
|---|---|---|---|
| `MT` | `RLB` | `SN` | `SAM` |
| `SNVH` | `Azad` | `BCR` | `BRA` |
| `HBH` | `JCB` | `LLR` | `LBS` |
| `MMM` | `MS` | `Nehru` | `Patel` |
| `RK` | `RP` | `VS` | `GH` |

Plus `MISC` — the fallback for pools with no hall match.

A hall with more than one group gets an extra row per group; the pool is
announced in all of them.

## Step 7 — Verify

```sql
SELECT location_key, label, is_active,
       group_jid IS NOT NULL AS has_jid,
       hall_id   IS NOT NULL AS hall_linked
FROM whatsapp_pool_groups
ORDER BY is_fallback, location_key;
```

`hall_linked = false` means the seed did not find a matching `new_halls` row, so
pools from that hall fall through to `MISC`. Fix it by setting `hall_id`
manually.

Then start a real pool from a mapped hall and watch the group.

---

## What the group sees

```
🛒 *Blinkit pool just opened — Lalbahadur Sastry Hall*

Someone in Lalbahadur Sastry Hall started a shared Blinkit cart on Savify.
Add your items and the delivery fee gets split across everyone in the pool —
cross the free-delivery limit together and it drops to ₹0.

⏱️ *15 min* to join (plus 10 minutes of extra time after that)
👉 https://savify.in/dashboard

_Sent by Savify_
```

Edit the wording in `buildPoolMessage()` — `server/wasender.js` and the
identical `client/api/_wasender.js`.

---

## How the routing decides

`resolveTargetGroups()` in `server/wasender.js`, in order:

1. The pool's `hall_id` → that hall's active groups.
2. Otherwise the creator's profile `hall_id` → that hall's active groups.
3. Otherwise an explicit `location_key` in the request.
4. Otherwise every row with `is_fallback = true` (the `MISC` group).

A row only counts if it has a `group_jid` **and** `is_active = true`.

---

## Guard rails already in place

- **One broadcast per pool.** `group_carts.whatsapp_notified_at` is claimed with
  a conditional update before any message is sent, so a double tap or a retried
  request cannot double-post. If every send fails the claim is released so a
  later pool is not suppressed.
- **Sends are spaced.** 1.2 s between groups, so a hall with several groups does
  not trip WaSender's burst limit.
- **Failures are contained.** One group failing does not stop the rest, and the
  whole broadcast is fire-and-forget — the pool is already live before it runs.
- **No key, no problem.** With `WASENDER_API_KEY` unset the endpoint returns
  `{ sent: 0, skipped: 'wasender_not_configured' }` and pool creation is
  unaffected.

---

## Things worth deciding before you scale this up

- **Group admins will need to agree.** Twenty hall groups is twenty separate
  conversations, and an unannounced bot posting into a hall group tends to get
  removed. Worth asking first.
- **Volume.** One message per pool is fine. If pools start opening every few
  minutes in the same hall, the group will treat it as spam long before
  WhatsApp does. Consider a per-group cooldown (a `last_sent_at` column is
  already there for exactly this) before you turn it on campus-wide.
- **WhatsApp bans unofficial automation.** WaSenderAPI drives a real WhatsApp
  session, not the official Business API. The sending number can be restricted
  or banned. Keep it separate from anything you care about, and have a second
  number ready.
