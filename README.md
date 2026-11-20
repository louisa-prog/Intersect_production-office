# INTERSECT Production Office

A single-page production management tool for planning events: festivals, conferences, corporate events, brand activations, pop-ups, immersive/art shows, hackathons, virtual/hybrid events, residencies, tours, community series and fundraisers.

Pick an event format and the tool builds a working plan from matching modules: brief and KPIs, a T-minus timeline, team, budget, sponsors, programme, registration, venue, vendors, run of show, risk register, post-event wrap and more. You can also build your own modules.

## Run it

It's one self-contained file. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Then go to http://localhost:8000.

## Data storage

The page was first built as a Claude artifact. When it runs there, it uses the artifact runtime (`window.claude`) for a shared event database, file uploads and downloads. Outside that runtime, it falls back to a **local mode**: it loads an example event and keeps changes in memory, so they are lost when you reload the page.

To keep data between sessions in a standalone deployment, swap the `db` layer in `boot()` for your own backend (for example Firestore, Supabase or `localStorage`).
