# INTERSECT Production Office

**Events at the edge.** An open-source, private and free production management tool for planning events: festivals, conferences, corporate events, brand activations, pop-ups, immersive/art shows, hackathons, virtual/hybrid events, residencies, tours, community series and fundraisers.

Pick an event format and the tool builds a working plan from matching modules: brief and KPIs, a T-minus timeline, team, budget, sponsors, programme, registration, venue, vendors, run of show, risk register, post-event wrap and more. You can also build your own modules.

This repo holds two versions:

| Folder | What it is |
| --- | --- |
| `/` (`index.html`) | The web app: one self-contained page |
| [`basecamp/`](basecamp/) | The [Logos Basecamp](https://logos.co/basecamp) module (v0.3.0): the same tool with a private Intersect Archive on Logos Storage and a portfolio showreel |

## Web app

It's one self-contained file. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Then go to http://localhost:8000.

The page was first built as a Claude artifact. When it runs there, it uses the artifact runtime (`window.claude`) for a shared event database, file uploads and downloads. Outside that runtime, it falls back to a **local mode**: it loads an example event and keeps changes in memory, so they are lost when you reload the page.

To keep data between sessions in a standalone deployment, swap the `db` layer in `boot()` for your own backend (for example Firestore, Supabase or `localStorage`).

## Logos Basecamp module

Needs [Nix](https://nixos.org/download/) with flakes enabled and [Logos Basecamp](https://github.com/logos-co/logos-basecamp/releases).

```bash
cd basecamp
nix flake update                                        # first time only
nix run .                                               # opens it in Basecamp's standalone mode
nix build '.#lgx-portable' --out-link result-portable   # package it for Basecamp
```

Then in Basecamp, open the Package Manager, choose **Install Local Package** and pick `result-portable/*.lgx`.

Full details, including tests, are in [`basecamp/README.md`](basecamp/README.md).

> **Not yet compiled.** The module's C++ backend, including the Logos Storage archive code, was written in an environment that could not fetch Qt or the Logos SDK, so it has not been built yet. The QML view passes its headless tests. If the first `nix build` fails, look at `basecamp/src/production_office_archive.cpp` and the storage wrapper's exact Qt types first.
