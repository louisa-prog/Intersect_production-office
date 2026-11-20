.pragma library
// Production Office — event schema, module definitions and the template
// generator. Shared by Main.qml. The C++ backend stores each event as an
// opaque JSON document, so formats and modules can grow here without any
// backend change.

var ST = ["Not started", "In progress", "Blocked", "Done"];

var FORMATS = {
    festival:   { label: "Festival", blurb: "Multi-day, multi-stage, ticketed" },
    conference: { label: "Conference", blurb: "Summit, talks, workshops, expo" },
    corporate:  { label: "Corporate event", blurb: "Offsites, launches, galas, client and team events" },
    activation: { label: "Brand activation", blurb: "A brand's experience inside or beside someone else's event" },
    experience: { label: "Brand experience / pop-up", blurb: "Standalone launches, pop-ups, tours and brand worlds" },
    immersive:  { label: "Immersive / art / cultural", blurb: "Installations, exhibitions, performance" },
    hackathon:  { label: "Hackathon / developer event", blurb: "Tracks, teams, judging, prizes and mentors" },
    virtual:    { label: "Virtual / hybrid event", blurb: "Streamed or hybrid, across time zones" },
    residency:  { label: "Pop-up village / residency", blurb: "People living and working together for days or weeks" },
    touring:    { label: "Travel / walking / touring", blurb: "Moving group: route, stages, lodging, crew" },
    community:  { label: "Community meetup / salon series", blurb: "Recurring sessions with rotating hosts" },
    fundraising:{ label: "Fundraising / benefit event", blurb: "Donors, pledges, auctions and impact" }
};
var FORMAT_ORDER = ["festival", "conference", "corporate", "activation", "experience", "immersive",
                    "hackathon", "virtual", "residency", "touring", "community", "fundraising"];

var MODULES = {
    overview:     { t: "Overview" },
    brief:        { t: "Event brief", s: ["brief", "kpis"] },
    timeline:     { t: "Timeline", s: ["milestones"] },
    team:         { t: "Team & roles", s: ["team"] },
    budget:       { t: "Budget", s: ["budgetSummary", "income", "costs"] },
    sponsors:     { t: "Sponsors & activations", s: ["sponsors", "deliverables"] },
    programme:    { t: "Programme & curation", s: ["programme", "talent"] },
    cfp:          { t: "Call for speakers", s: ["cfp", "rooms"] },
    registration: { t: "Registration & tickets", s: ["tickets", "regChecks"] },
    expo:         { t: "Exhibitors & expo", s: ["exhibitors"] },
    stakeholders: { t: "Stakeholders & approvals", s: ["approvals", "materials"] },
    guests:       { t: "Guest list & RSVPs", s: ["guests"] },
    travel:       { t: "Travel & accommodation", s: ["travel"] },
    journey:      { t: "Experience design", s: ["journey", "brandAssets"] },
    staffing:     { t: "Staffing & ambassadors", s: ["staffing"] },
    measurement:  { t: "Data & measurement", s: ["metrics", "dataChecks"] },
    inventory:    { t: "Samples & inventory", s: ["inventory"] },
    tour:         { t: "Tour & locations", s: ["tourStops"] },
    tracks:       { t: "Tracks & challenges", s: ["tracks"] },
    teams:        { t: "Teams & registrations", s: ["teams", "hackers"] },
    judging:      { t: "Judging & scoring", s: ["criteria", "scores"] },
    prizes:       { t: "Prizes & bounties", s: ["prizes"] },
    mentors:      { t: "Mentor schedule", s: ["mentors"] },
    streaming:    { t: "Streaming & platform", s: ["platform", "techChecks"] },
    timezones:    { t: "Time-zone schedule", s: ["tzSessions"] },
    engagement:   { t: "Online engagement", s: ["engagement"] },
    vod:          { t: "Recording & VOD", s: ["recordings"] },
    participants: { t: "Participants & applications", s: ["applications"] },
    accommodation:{ t: "Accommodation & rooms", s: ["roomAlloc"] },
    meals:        { t: "Meals & dietary", s: ["meals", "dietary"] },
    daily:        { t: "Daily programme", s: ["dailyProg"] },
    house:        { t: "House rules & arrivals", s: ["arrivals", "houseRules"] },
    route:        { t: "Route & stages", s: ["stages"] },
    transport:    { t: "Transport", s: ["transport"] },
    lodging:      { t: "Lodging per stop", s: ["stopLodging"] },
    roster:       { t: "Participant roster", s: ["roster"] },
    crew:         { t: "Film & content crew", s: ["shots"] },
    sessions:     { t: "Session calendar", s: ["sessions", "hostRotation"] },
    members:      { t: "Members & attendance", s: ["members"] },
    venuePartners:{ t: "Venue partners", s: ["venuePartners"] },
    donors:       { t: "Donors & pledges", s: ["donors"] },
    auction:      { t: "Auction & raffle", s: ["auctionItems"] },
    donations:    { t: "Donation channels", s: ["donationChannels"] },
    impact:       { t: "Impact reporting", s: ["impact"] },
    showreel:     { t: "Showreel", s: ["showreel"] },
    archive:      { t: "Intersect Archive", s: ["archive"] },
    art:          { t: "Immersive & art", s: ["works", "artChecks"] },
    venue:        { t: "Venue & operations", s: ["venueChecks", "permits"] },
    comms:        { t: "Marketing & comms", s: ["comms", "channels"] },
    vendors:      { t: "Vendors", s: ["vendors"] },
    ros:          { t: "Run of show", s: ["ros"] },
    risks:        { t: "Risk register", s: ["risks"] },
    wrap:         { t: "Post-event wrap", s: ["wrap", "debrief"] }
};
var MOD_ORDER = Object.keys(MODULES);

var FORMAT_MODULES = {
    festival:   ["overview", "brief", "timeline", "team", "budget", "sponsors", "programme", "art", "venue", "comms", "vendors", "ros", "risks", "showreel", "archive", "wrap"],
    conference: ["overview", "brief", "timeline", "team", "budget", "sponsors", "programme", "cfp", "registration", "expo", "venue", "comms", "vendors", "travel", "ros", "risks", "archive", "wrap"],
    corporate:  ["overview", "brief", "timeline", "team", "budget", "stakeholders", "guests", "travel", "programme", "venue", "vendors", "ros", "risks", "archive", "wrap"],
    activation: ["overview", "brief", "timeline", "team", "budget", "sponsors", "journey", "art", "staffing", "measurement", "inventory", "venue", "comms", "vendors", "ros", "risks", "showreel", "archive", "wrap"],
    experience: ["overview", "brief", "timeline", "team", "budget", "stakeholders", "journey", "art", "staffing", "measurement", "inventory", "tour", "venue", "comms", "vendors", "ros", "risks", "showreel", "archive", "wrap"],
    immersive:  ["overview", "brief", "timeline", "team", "budget", "programme", "art", "venue", "comms", "vendors", "ros", "risks", "showreel", "archive", "wrap"],
    hackathon:  ["overview", "brief", "timeline", "team", "budget", "sponsors", "tracks", "teams", "judging", "prizes", "mentors", "venue", "comms", "vendors", "ros", "risks", "archive", "wrap"],
    virtual:    ["overview", "brief", "timeline", "team", "budget", "sponsors", "programme", "registration", "streaming", "timezones", "engagement", "vod", "comms", "ros", "risks", "archive", "wrap"],
    residency:  ["overview", "brief", "timeline", "team", "budget", "participants", "accommodation", "meals", "daily", "house", "venue", "comms", "risks", "archive", "wrap"],
    touring:    ["overview", "brief", "timeline", "team", "budget", "route", "transport", "lodging", "roster", "crew", "comms", "risks", "showreel", "archive", "wrap"],
    community:  ["overview", "brief", "timeline", "team", "budget", "sessions", "members", "venuePartners", "comms", "archive", "wrap"],
    fundraising:["overview", "brief", "timeline", "team", "budget", "donors", "auction", "donations", "impact", "guests", "programme", "venue", "comms", "vendors", "ros", "risks", "archive", "wrap"]
};
// Display order for modules, custom modules last.
function modSort(a, b) {
    var ia = MOD_ORDER.indexOf(a), ib = MOD_ORDER.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
}

// ---------- helpers ----------
function num(v) {
    var n = parseFloat(String(v === undefined || v === null ? "" : v).replace(/[^0-9.\-]/g, ""));
    return isNaN(n) ? 0 : n;
}
var SYMBOLS = { EUR: "€", GBP: "£", USD: "$", CHF: "CHF ", INR: "₹", HKD: "HK$" };
function group(n) {
    var s = String(Math.round(Math.abs(n)));
    var out = "";
    while (s.length > 3) { out = "," + s.slice(s.length - 3) + out; s = s.slice(0, s.length - 3); }
    return s + out;
}
function money(v, cur) {
    var n = Number(v) || 0;
    var sym = SYMBOLS[cur || "EUR"];
    if (sym === undefined) sym = (cur || "") + " ";
    return (n < 0 ? "−" : "") + sym + group(n);
}
function count(n) { return (n < 0 ? "−" : "") + group(n); }
function utcDay(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return NaN;
    return Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
}
function dayDiff(iso) {
    var t = utcDay(iso);
    if (isNaN(t)) return null;
    var now = new Date();
    var today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((t - today) / 864e5);
}
function addDays(iso, d) {
    var t = utcDay(iso);
    if (isNaN(t)) return "";
    return new Date(t + d * 864e5).toISOString().slice(0, 10);
}
var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDate(iso) {
    if (isNaN(utcDay(iso))) return iso || "";
    return Number(iso.slice(8, 10)) + " " + MON[Number(iso.slice(5, 7)) - 1] + " " + iso.slice(0, 4);
}
function shortDate(iso) {
    if (isNaN(utcDay(iso))) return "";
    return Number(iso.slice(8, 10)) + " " + MON[Number(iso.slice(5, 7)) - 1];
}
function tlabel(t) { t = Number(t) || 0; return t >= 0 ? "T-" + t : "T+" + (-t); }
function rid() { return Math.random().toString(36).slice(2, 10); }
function todayIso() {
    var d = new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
}

function rowPrice(r) { return num(r.price) * num(r.sold); }
function scoreTotal(r) { return num(r.innovation) + num(r.technical) + num(r.impact) + num(r.presentation); }
// Standard-time offsets; adjust by an hour where daylight saving applies.
var ZONES = [["SF", -8], ["NYC", -5], ["LIS", 0], ["BER", 1], ["DXB", 4], ["SGP", 8]];
function tzLine(r) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(r.utc || ""));
    if (!m) return "Set a UTC start time";
    var mins = Number(m[1]) * 60 + Number(m[2]);
    return ZONES.map(function (z) {
        var t = mins + z[1] * 60, day = "";
        if (t < 0) { t += 1440; day = " −1"; } else if (t >= 1440) { t -= 1440; day = " +1"; }
        var h = Math.floor(t / 60), mm = t % 60;
        return z[0] + " " + (h < 10 ? "0" : "") + h + ":" + (mm < 10 ? "0" : "") + mm + day;
    }).join(" · ");
}
function riskScore(r) { return (Number(r.l) || 0) * (Number(r.i) || 0); }

// ---------- table schemas ----------
// Column: [key, label, type, options-or-function]
// Types: text, long, num, money, date, time, select, check, score, calc, tminus
var TABLES = {
    kpis: { t: "Objectives and KPIs", lead: "Three objectives at most, each with a number you can measure on the night.",
        cols: [["objective", "Objective", "text"], ["kpi", "KPI", "text"], ["target", "Target", "text"], ["measure", "How measured", "text"], ["actual", "Actual", "text"]] },
    milestones: { t: "Milestones", lead: "Weeks before show day. Due dates move when you change the show date.",
        cols: [["t", "T-minus", "tminus"], ["what", "Milestone", "long"], ["applies", "Applies to", "text"], ["owner", "Owner", "text"], ["status", "Status", "select", ST]],
        sort: function (a, b) { return (Number(b.t) || 0) - (Number(a.t) || 0); } },
    team: { t: "Team and contacts", lead: "One named person per workstream, with a way to reach them on show day.",
        cols: [["role", "Role", "text"], ["name", "Name", "text"], ["work", "Workstream", "select", ["Direction", "Production", "Programme", "Partnerships", "Marketing", "Operations", "Finance"]], ["phone", "Phone", "text"], ["email", "Email", "text"], ["onsite", "On site", "check"]] },
    income: { t: "Income", lead: "Record in-kind at value, but keep it out of cash.",
        cols: [["line", "Line", "text"], ["est", "Estimate", "money"], ["committed", "Committed", "money"], ["actual", "Actual", "money"], ["notes", "Notes", "text"]], totals: ["est", "committed", "actual"] },
    costs: { t: "Costs", lead: "Hold 10% contingency, 15% for outdoor or first editions.",
        cols: [["category", "Category", "text"], ["lines", "Typical lines", "long"], ["est", "Estimate", "money"], ["committed", "Committed", "money"], ["actual", "Actual", "money"]], totals: ["est", "committed", "actual"] },
    sponsors: { t: "Sponsor and client pipeline", lead: "Sell outcomes, not logos. Each partner gets a tier, a fee and a big idea.",
        cols: [["name", "Partner", "text"], ["tier", "Tier", "select", ["Title", "Programme partner", "Experience partner", "Supporter", "In-kind"]], ["fee", "Fee", "money"], ["stage", "Stage", "select", ["Prospect", "Pitched", "Negotiating", "Signed", "Paid", "Lost"]], ["objective", "Their objective", "select", ["Awareness", "Leads", "Product trial", "Community", "Content"]], ["idea", "Activation idea", "long"], ["owner", "Owner", "text"]], totals: ["fee"] },
    deliverables: { t: "Partner deliverables", lead: "Every promise in a contract, with proof attached once delivered.",
        cols: [["sponsor", "Partner", "text"], ["item", "Deliverable", "text"], ["due", "Due", "date"], ["owner", "Owner", "text"], ["status", "Status", "select", ST], ["proof", "Proof link", "text"]] },
    programme: { t: "Programme grid", lead: "Headliners or keynotes by T-16, full line-up by T-10, running order by T-3.",
        cols: [["day", "Day", "date"], ["stage", "Stage / room", "text"], ["start", "Start", "time"], ["end", "End", "time"], ["act", "Act / session", "text"], ["format", "Format", "select", ["DJ set", "Live", "Talk", "Panel", "Workshop", "Performance", "Screening", "Installation", "Keynote", "Dinner", "Networking"]], ["curator", "Curator / host", "text"], ["confirmed", "Confirmed", "check"]],
        sort: function (a, b) { return ((a.day || "") + (a.start || "")).localeCompare((b.day || "") + (b.start || "")); } },
    talent: { t: "Artists and speakers", lead: "Contract, rider, travel and assets — tick each one off.",
        cols: [["name", "Name", "text"], ["role", "Role", "select", ["Headliner", "Artist", "Speaker", "Moderator", "Performer", "Curator", "Host"]], ["fee", "Fee", "money"], ["contract", "Contract", "check"], ["rider", "Rider", "check"], ["travel", "Travel", "check"], ["assets", "Bio & photo", "check"], ["liaison", "Liaison", "text"]], totals: ["fee"] },
    cfp: { t: "Speaker submissions", lead: "Score each proposal 1–5 against the theme; accept by T-12 so speakers can book travel.",
        cols: [["title", "Talk title", "long"], ["speaker", "Speaker", "text"], ["org", "Organisation", "text"], ["track", "Track", "text"], ["format", "Format", "select", ["Keynote", "Talk", "Panel", "Workshop", "Lightning", "Fireside"]], ["score", "Score", "select", ["1", "2", "3", "4", "5"]], ["status", "Status", "select", ["Submitted", "Shortlisted", "Accepted", "Waitlist", "Rejected"]]] },
    rooms: { t: "Tracks and rooms", lead: "One chair per track; check room capacity against expected demand.",
        cols: [["track", "Track", "text"], ["room", "Room", "text"], ["capacity", "Capacity", "num"], ["chair", "Track chair", "text"], ["av", "Layout", "select", ["Theatre", "Classroom", "Boardroom", "Cabaret", "Workshop"]], ["stream", "Streamed", "check"]], totals: ["capacity"] },
    tickets: { t: "Ticket types", lead: "Revenue is price × sold. Release tiers in waves to create urgency.",
        cols: [["tier", "Ticket type", "text"], ["price", "Price", "money"], ["cap", "Allocation", "num"], ["sold", "Sold", "num"], ["revenue", "Revenue", "calc", rowPrice, "money"], ["opens", "On sale", "date"], ["closes", "Closes", "date"], ["status", "Status", "select", ["Not started", "On sale", "Sold out", "Closed"]]], totals: ["cap", "sold", "revenue"] },
    regChecks: { t: "Registration checklist", cols: [["item", "Item", "long"], ["owner", "Owner", "text"], ["done", "Done", "check"]] },
    exhibitors: { t: "Exhibitors and booths", lead: "Floor plan first, then sell booths by size and position.",
        cols: [["company", "Company", "text"], ["booth", "Booth no.", "text"], ["size", "Size (m²)", "num"], ["package", "Package", "select", ["Shell scheme", "Space only", "Table top", "Startup pod", "Premium island"]], ["fee", "Fee", "money"], ["contact", "Contact", "text"], ["contract", "Contract", "check"], ["status", "Status", "select", ["Prospect", "Negotiating", "Signed", "Paid", "Lost"]]], totals: ["fee", "size"] },
    approvals: { t: "Approvals", lead: "Who must say yes, by when. Nothing goes to print or to suppliers without sign-off.",
        cols: [["item", "Item", "text"], ["approver", "Approver", "text"], ["dept", "Department", "select", ["Leadership", "Finance", "Legal", "Brand", "HR", "IT / security", "Procurement"]], ["due", "Due", "date"], ["status", "Status", "select", ["Pending", "Approved", "Changes requested"]], ["notes", "Notes", "text"]] },
    materials: { t: "Materials and branding", lead: "Decks, signage, gifts and printed matter, each with an owner and a deadline.",
        cols: [["item", "Item", "text"], ["type", "Type", "select", ["Presentation", "Signage", "Print", "Gifts", "Video", "Digital", "Name badges"]], ["owner", "Owner", "text"], ["due", "Due", "date"], ["qty", "Qty", "num"], ["status", "Status", "select", ST]] },
    guests: { t: "Guest list", lead: "Invitations, replies, VIP handling and seating in one place.",
        cols: [["name", "Name", "text"], ["company", "Company", "text"], ["group", "Group", "select", ["VIP", "Client", "Partner", "Staff", "Speaker", "Press"]], ["invited", "Invited", "check"], ["rsvp", "RSVP", "select", ["Pending", "Yes", "No", "Maybe"]], ["dietary", "Dietary needs", "text"], ["table", "Table / seat", "text"], ["host", "Host", "text"], ["notes", "Notes", "text"]] },
    travel: { t: "Travel and accommodation", lead: "Arrivals, departures and rooms for speakers, guests and staff.",
        cols: [["name", "Traveller", "text"], ["role", "Role", "select", ["Speaker", "Guest", "Staff", "Artist", "Client"]], ["arrive", "Arrives", "date"], ["inbound", "Inbound flight / train", "text"], ["depart", "Departs", "date"], ["hotel", "Hotel", "text"], ["nights", "Nights", "num"], ["transfer", "Transfer", "check"], ["cost", "Cost", "money"], ["booked", "Booked", "check"]], totals: ["nights", "cost"] },
    journey: { t: "Guest journey", lead: "Design the experience stage by stage: what the guest does, what they feel, where the brand shows up.",
        cols: [["stage", "Stage", "text"], ["touchpoint", "Touchpoint", "text"], ["does", "Guest does", "long"], ["feels", "Guest feels", "text"], ["moment", "Brand moment", "long"], ["tech", "Tech / build", "text"], ["owner", "Owner", "text"]] },
    brandAssets: { t: "Brand assets and sign-off", lead: "Every branded element with its spec, supplier and client approval.",
        cols: [["asset", "Asset", "text"], ["spec", "Spec / size", "text"], ["supplier", "Supplier", "text"], ["owner", "Owner", "text"], ["due", "Due", "date"], ["status", "Client approval", "select", ["Pending", "Approved", "Changes requested"]]] },
    staffing: { t: "Staffing and brand ambassadors", lead: "Shifts, briefings and uniforms. Brief every ambassador on the key messages before doors.",
        cols: [["role", "Role", "select", ["Brand ambassador", "Host", "Team lead", "Promoter", "Technician", "Photographer", "Security"]], ["name", "Name", "text"], ["day", "Shift day", "date"], ["start", "Start", "time"], ["end", "End", "time"], ["rate", "Rate", "money"], ["briefed", "Briefed", "check"], ["uniform", "Uniform", "check"], ["agency", "Agency", "text"]], totals: ["rate"],
        sort: function (a, b) { return ((a.day || "") + (a.start || "")).localeCompare((b.day || "") + (b.start || "")); } },
    metrics: { t: "Activation metrics", lead: "Agree targets and methods with the client before the build, then fill actuals each day.",
        cols: [["metric", "Metric", "text"], ["target", "Target", "num"], ["actual", "Actual", "num"], ["method", "How measured", "text"], ["source", "Data source", "text"], ["owner", "Owner", "text"]] },
    dataChecks: { t: "Data capture and privacy", lead: "Collecting emails or photos means consent, a privacy notice and an agreed retention period.",
        cols: [["item", "Item", "long"], ["owner", "Owner", "text"], ["done", "Done", "check"]] },
    inventory: { t: "Samples, merch and giveaways", lead: "What ships in, what goes out, and when to reorder.",
        cols: [["item", "Item", "text"], ["type", "Type", "select", ["Sample", "Merch", "Giveaway", "Consumable", "Print", "Equipment"]], ["planned", "Planned", "num"], ["onsite", "On site", "num"], ["used", "Used", "num"], ["unitCost", "Unit cost", "money"], ["storage", "Storage", "text"], ["reorder", "Reorder", "check"]], totals: ["planned", "onsite", "used"] },
    tourStops: { t: "Tour stops", lead: "One row per city or location, each with its own build, live days and crew lead.",
        cols: [["city", "City", "text"], ["venue", "Venue / site", "text"], ["build", "Build day", "date"], ["live", "First live day", "date"], ["days", "Live days", "num"], ["derig", "De-rig", "date"], ["lead", "Crew lead", "text"], ["permit", "Permit", "check"], ["status", "Status", "select", ST]],
        sort: function (a, b) { return (a.live || "9").localeCompare(b.live || "9"); } },
    works: { t: "Works and installations", lead: "Each piece gets a rider, a site visit and a test night before doors.",
        cols: [["title", "Work", "text"], ["artist", "Artist", "text"], ["medium", "Medium", "select", ["Projection mapping", "Light", "Sound", "Interactive", "Sculpture", "Performance", "XR"]], ["location", "Zone", "text"], ["power", "Power", "text"], ["install", "Install", "date"], ["test", "Test night", "date"], ["status", "Status", "select", ST]] },
    artChecks: { t: "Production checklist", cols: [["item", "Item", "long"], ["owner", "Owner", "text"], ["done", "Done", "check"]] },
    venueChecks: { t: "Venue checklist", lead: "Confirm what the venue already holds before you design anything.",
        cols: [["item", "Item", "long"], ["owner", "Owner", "text"], ["done", "Done", "check"]] },
    permits: { t: "Licensing and compliance",
        cols: [["item", "Item", "text"], ["authority", "Authority", "text"], ["lead", "Lead time", "text"], ["owner", "Owner", "text"], ["submitted", "Submitted", "date"], ["status", "Status", "select", ["Not started", "Submitted", "Approved", "Refused"]]] },
    comms: { t: "Comms waves", lead: "Four waves, each with one message and one call to action.",
        cols: [["wave", "Wave", "text"], ["when", "When", "text"], ["message", "Message", "text"], ["actions", "Key actions", "long"], ["cta", "CTA", "text"], ["owner", "Owner", "text"], ["status", "Status", "select", ST]] },
    channels: { t: "Channels and owners",
        cols: [["channel", "Channel", "text"], ["owner", "Owner", "text"], ["freq", "Frequency", "text"], ["assets", "Assets needed", "text"]] },
    vendors: { t: "Vendors and suppliers", lead: "Three quotes above 2,000; no more than 50% before delivery.",
        cols: [["category", "Category", "text"], ["supplier", "Supplier", "text"], ["contact", "Contact", "text"], ["quote", "Quote", "money"], ["deposit", "Deposit paid", "check"], ["balance", "Balance due", "date"], ["contract", "Contract", "check"], ["loadin", "Load-in", "text"], ["status", "Status", "select", ["Not started", "Quoting", "Booked", "Paid"]]], totals: ["quote"] },
    ros: { t: "Run of show", lead: "Minute by minute, per stage per day. Share with crew leads 48 hours before doors.",
        cols: [["day", "Day", "date"], ["time", "Time", "time"], ["dur", "Mins", "num"], ["item", "Item", "text"], ["location", "Location", "text"], ["lead", "Lead", "text"], ["cue", "Cue", "text"], ["notes", "Notes", "text"]],
        sort: function (a, b) { return ((a.day || "") + (a.time || "")).localeCompare((b.day || "") + (b.time || "")); } },
    risks: { t: "Risk register", lead: "Likelihood × impact. Anything 12 or above needs an owner and a written fallback.",
        cols: [["risk", "Risk", "text"], ["l", "Likelihood", "select", ["1", "2", "3", "4", "5"]], ["i", "Impact", "select", ["1", "2", "3", "4", "5"]], ["score", "Score", "score"], ["mitigation", "Mitigation", "long"], ["fallback", "Fallback", "text"], ["owner", "Owner", "text"]] },
    wrap: { t: "Wrap tasks", lead: "Close every event within four weeks of show day.",
        cols: [["task", "Task", "long"], ["due", "Due", "date"], ["owner", "Owner", "text"], ["done", "Done", "check"]] },

    // hackathon / developer event
    tracks: { t: "Tracks and challenges", lead: "One problem statement per track, with the sponsor, the judge and the resources hackers need.",
        cols: [["track", "Track", "text"], ["sponsor", "Sponsor", "text"], ["challenge", "Challenge", "long"], ["pool", "Prize pool", "money"], ["judge", "Lead judge", "text"], ["resources", "Docs / APIs link", "text"], ["status", "Status", "select", ST]], totals: ["pool"] },
    teams: { t: "Teams", lead: "Every team, its track and its submission. Check repos before judging starts.",
        cols: [["team", "Team", "text"], ["members", "Members", "num"], ["track", "Track", "text"], ["project", "Project", "text"], ["repo", "Repo / demo link", "text"], ["status", "Status", "select", ["Registered", "Building", "Submitted", "Disqualified"]]], totals: ["members"] },
    hackers: { t: "Registrations", lead: "Individual sign-ups; match solo hackers to teams at kickoff.",
        cols: [["name", "Name", "text"], ["role", "Role", "select", ["Developer", "Designer", "Product", "Researcher", "Student"]], ["skills", "Skills", "text"], ["team", "Team", "text"], ["checkedIn", "Checked in", "check"], ["contact", "Contact", "text"]] },
    criteria: { t: "Judging criteria", lead: "Publish these with the challenges so teams build for them.",
        cols: [["criterion", "Criterion", "text"], ["weight", "Weight %", "num"], ["guidance", "What judges look for", "long"]], totals: ["weight"] },
    scores: { t: "Scores", lead: "One row per judge per team, each criterion scored 1–5.",
        cols: [["team", "Team", "text"], ["judge", "Judge", "text"], ["innovation", "Innovation", "select", ["1", "2", "3", "4", "5"]], ["technical", "Technical", "select", ["1", "2", "3", "4", "5"]], ["impact", "Impact", "select", ["1", "2", "3", "4", "5"]], ["presentation", "Presentation", "select", ["1", "2", "3", "4", "5"]], ["total", "Total /20", "calc", scoreTotal, "count"], ["notes", "Notes", "text"]],
        sort: function (a, b) { return String(a.team || "").localeCompare(String(b.team || "")); } },
    prizes: { t: "Prizes and bounties", lead: "Who pays, how, and to whom. Collect payout details before the ceremony.",
        cols: [["prize", "Prize / bounty", "text"], ["sponsor", "Sponsor", "text"], ["track", "Track", "text"], ["amount", "Amount", "money"], ["method", "Payout", "select", ["Fiat transfer", "Crypto", "In-kind", "Grant"]], ["winner", "Winner", "text"], ["paid", "Paid", "check"]], totals: ["amount"] },
    mentors: { t: "Mentor schedule", lead: "Office hours by day and place, so teams know when help is around.",
        cols: [["name", "Mentor", "text"], ["expertise", "Expertise", "text"], ["day", "Day", "date"], ["start", "From", "time"], ["end", "To", "time"], ["where", "Table / channel", "text"], ["confirmed", "Confirmed", "check"]],
        sort: function (a, b) { return ((a.day || "") + (a.start || "")).localeCompare((b.day || "") + (b.start || "")); } },

    // virtual / hybrid
    platform: { t: "Streaming and platform setup", lead: "Every piece of the broadcast chain, with an owner and a backup.",
        cols: [["item", "Item", "text"], ["provider", "Provider / tool", "text"], ["owner", "Owner", "text"], ["backup", "Backup plan", "text"], ["status", "Status", "select", ST]] },
    techChecks: { t: "Speaker tech checks", lead: "Fifteen minutes per speaker on the real platform: camera, mic, connection and slides.",
        cols: [["speaker", "Speaker", "text"], ["day", "Check date", "date"], ["time", "Time (UTC)", "time"], ["av", "Camera & mic", "check"], ["net", "Connection", "check"], ["slides", "Slides in", "check"], ["status", "Status", "select", ST]] },
    tzSessions: { t: "Sessions across time zones", lead: "Enter start times in UTC. Local times use standard time; add an hour where daylight saving applies.",
        cols: [["session", "Session", "text"], ["speaker", "Speaker", "text"], ["day", "Day", "date"], ["utc", "UTC start", "time"], ["dur", "Mins", "num"], ["zones", "Local times", "calc", tzLine, "text"]],
        sort: function (a, b) { return ((a.day || "") + (a.utc || "")).localeCompare((b.day || "") + (b.utc || "")); } },
    engagement: { t: "Online engagement", lead: "Agree targets with partners up front; pull actuals from the platform after each day.",
        cols: [["metric", "Metric", "text"], ["target", "Target", "num"], ["actual", "Actual", "num"], ["source", "Source", "text"], ["owner", "Owner", "text"]] },
    recordings: { t: "Recordings and VOD", lead: "Every session from raw recording to published replay.",
        cols: [["session", "Session", "text"], ["recorded", "Recorded", "check"], ["edited", "Edited", "check"], ["captions", "Captions", "check"], ["published", "Published", "check"], ["link", "Replay link", "text"], ["owner", "Owner", "text"], ["due", "Due", "date"]] },

    // pop-up village / residency
    applications: { t: "Participants and applications", lead: "Everyone who applied, what they bring, and when they're on site.",
        cols: [["name", "Name", "text"], ["from", "Based in", "text"], ["focus", "Focus / discipline", "text"], ["arrive", "Arrives", "date"], ["depart", "Departs", "date"], ["support", "Fee / scholarship", "money"], ["status", "Status", "select", ["Applied", "Shortlisted", "Accepted", "Waitlist", "Declined"]], ["contact", "Contact", "text"]] },
    roomAlloc: { t: "Rooms and beds", lead: "One row per room or unit. List who sleeps where and for which nights.",
        cols: [["room", "Room / unit", "text"], ["building", "Building", "text"], ["beds", "Beds", "num"], ["occupants", "Occupants", "long"], ["from", "From", "date"], ["to", "To", "date"], ["ready", "Made up", "check"], ["cost", "Cost", "money"]], totals: ["beds", "cost"] },
    meals: { t: "Meal plan", lead: "Headcounts by meal, so the kitchen orders the right amount.",
        cols: [["day", "Day", "date"], ["meal", "Meal", "select", ["Breakfast", "Lunch", "Dinner", "Snacks", "Special"]], ["menu", "Menu", "long"], ["headcount", "Headcount", "num"], ["kitchen", "Cook / caterer", "text"], ["cost", "Cost", "money"]], totals: ["cost"],
        sort: function (a, b) { return (a.day || "").localeCompare(b.day || ""); } },
    dietary: { t: "Dietary needs", lead: "Share with the kitchen before the first meal. Mark allergies clearly.",
        cols: [["person", "Person", "text"], ["need", "Need", "select", ["Vegetarian", "Vegan", "Gluten-free", "Dairy-free", "Halal", "Kosher", "Allergy", "Other"]], ["detail", "Detail", "text"], ["kitchenTold", "Kitchen told", "check"]] },
    dailyProg: { t: "Daily programme", lead: "The rhythm of each day: work, sessions, meals, rest.",
        cols: [["day", "Day", "date"], ["time", "Time", "time"], ["session", "Session", "text"], ["type", "Type", "select", ["Workshop", "Talk", "Co-working", "Excursion", "Meal", "Social", "Rest"]], ["host", "Host", "text"], ["where", "Where", "text"]],
        sort: function (a, b) { return ((a.day || "") + (a.time || "")).localeCompare((b.day || "") + (b.time || "")); } },
    arrivals: { t: "Arrivals", lead: "Who lands when, and who picks them up.",
        cols: [["name", "Name", "text"], ["day", "Arrives", "date"], ["time", "Time", "time"], ["mode", "Travel", "select", ["Flight", "Train", "Bus", "Car", "Other"]], ["ref", "Flight / ref", "text"], ["pickup", "Pickup", "check"], ["welcome", "Welcome pack", "check"]],
        sort: function (a, b) { return ((a.day || "") + (a.time || "")).localeCompare((b.day || "") + (b.time || "")); } },
    houseRules: { t: "House rules", lead: "Shared before arrival and posted on site.",
        cols: [["rule", "Rule", "long"], ["owner", "Owner", "text"], ["shared", "Shared", "check"]] },

    // travel / walking / touring
    stages: { t: "Route and daily stages", lead: "One row per day on the move. Totals show the full route.",
        cols: [["day", "Day", "date"], ["stage", "Stage", "num"], ["from", "From", "text"], ["to", "To", "text"], ["km", "Distance (km)", "num"], ["climb", "Ascent (m)", "num"], ["hours", "Hours", "num"], ["guide", "Guide", "text"], ["status", "Status", "select", ST]], totals: ["km", "climb", "hours"],
        sort: function (a, b) { return (Number(a.stage) || 0) - (Number(b.stage) || 0); } },
    transport: { t: "Transport", lead: "Every move of people and bags, including the support vehicle.",
        cols: [["day", "Day", "date"], ["from", "From", "text"], ["to", "To", "text"], ["mode", "Mode", "select", ["Coach", "Van", "Train", "Ferry", "Flight", "Luggage transfer", "Support vehicle"]], ["supplier", "Supplier", "text"], ["seats", "Seats", "num"], ["cost", "Cost", "money"], ["booked", "Booked", "check"]], totals: ["cost"],
        sort: function (a, b) { return (a.day || "").localeCompare(b.day || ""); } },
    stopLodging: { t: "Lodging per stop", lead: "Where everyone sleeps each night, and who to call.",
        cols: [["night", "Night", "date"], ["place", "Town / stop", "text"], ["stay", "Accommodation", "text"], ["rooms", "Rooms", "num"], ["beds", "Beds", "num"], ["contact", "Contact", "text"], ["cost", "Cost", "money"], ["confirmed", "Confirmed", "check"]], totals: ["rooms", "cost"],
        sort: function (a, b) { return (a.night || "").localeCompare(b.night || ""); } },
    roster: { t: "Participant roster", lead: "Nobody walks without an emergency contact and a signed waiver.",
        cols: [["name", "Name", "text"], ["role", "Role", "select", ["Walker", "Guide", "Crew", "Medic", "Driver", "Guest"]], ["phone", "Phone", "text"], ["emergencyName", "Emergency contact", "text"], ["emergencyPhone", "Emergency phone", "text"], ["notes", "Notes for the medic", "text"], ["insured", "Insured", "check"], ["waiver", "Waiver", "check"]] },
    shots: { t: "Content and film plan", lead: "What to capture on each day, by whom, and what it becomes.",
        cols: [["day", "Day", "date"], ["where", "Location", "text"], ["beat", "Shot / story beat", "long"], ["format", "Format", "select", ["Video", "Photo", "Interview", "Drone", "Social", "Audio"]], ["lead", "Crew lead", "text"], ["kit", "Kit", "text"], ["status", "Status", "select", ST]],
        sort: function (a, b) { return (a.day || "").localeCompare(b.day || ""); } },

    // community meetup / salon series
    sessions: { t: "Session calendar", lead: "The whole season in one list, with RSVPs and who actually came.",
        cols: [["date", "Date", "date"], ["time", "Time", "time"], ["theme", "Theme / title", "text"], ["host", "Host", "text"], ["venue", "Venue", "text"], ["capacity", "Capacity", "num"], ["rsvps", "RSVPs", "num"], ["attended", "Attended", "num"], ["status", "Status", "select", ["Planned", "Confirmed", "Done", "Cancelled"]]], totals: ["rsvps", "attended"],
        sort: function (a, b) { return ((a.date || "9") + (a.time || "")).localeCompare((b.date || "9") + (b.time || "")); } },
    hostRotation: { t: "Host rotation", lead: "Share the load: who hosts next, and how often each person has hosted.",
        cols: [["host", "Host", "text"], ["hosted", "Sessions hosted", "num"], ["next", "Next session", "date"], ["contact", "Contact", "text"], ["notes", "Notes", "text"]] },
    members: { t: "Members and attendance", lead: "The regulars, how often they come, and who to invite back.",
        cols: [["name", "Name", "text"], ["contact", "Contact", "text"], ["attended", "Sessions attended", "num"], ["last", "Last came", "date"], ["newsletter", "Newsletter", "check"], ["notes", "Notes", "text"]] },
    venuePartners: { t: "Venue partners", lead: "Spaces that host the series, their terms and their availability.",
        cols: [["venue", "Venue", "text"], ["contact", "Contact", "text"], ["capacity", "Capacity", "num"], ["terms", "Cost / terms", "text"], ["availability", "Availability", "text"], ["av", "AV", "check"], ["status", "Status", "select", ["Prospect", "Confirmed", "Paused"]]] },

    // fundraising / benefit
    donors: { t: "Donors and pledges", lead: "Every ask from prospect to received, with the thank-you tracked.",
        cols: [["donor", "Donor", "text"], ["type", "Type", "select", ["Individual", "Foundation", "Corporate", "Crypto", "Other"]], ["ask", "Ask", "money"], ["pledged", "Pledged", "money"], ["received", "Received", "money"], ["stage", "Stage", "select", ["Prospect", "Asked", "Pledged", "Received", "Declined"]], ["thanked", "Thanked", "check"], ["owner", "Owner", "text"]], totals: ["ask", "pledged", "received"] },
    auctionItems: { t: "Auction and raffle items", lead: "Lots, who gave them, and what they raised.",
        cols: [["item", "Item / lot", "text"], ["donatedBy", "Donated by", "text"], ["type", "Type", "select", ["Live auction", "Silent auction", "Raffle prize"]], ["value", "Est. value", "money"], ["reserve", "Reserve", "money"], ["result", "Winning bid", "money"], ["winner", "Winner", "text"], ["paid", "Paid", "check"]], totals: ["value", "result"] },
    donationChannels: { t: "Donation channels", lead: "Every way to give, tested before doors, with fees noted.",
        cols: [["channel", "Channel", "select", ["Bank transfer", "Card / online", "QR code", "Crypto wallet", "Text-to-give", "Cash"]], ["provider", "Provider", "text"], ["link", "Link / address", "text"], ["fees", "Fees %", "num"], ["raised", "Raised", "money"], ["owner", "Owner", "text"], ["live", "Tested & live", "check"]], totals: ["raised"] },
    impact: { t: "Impact reporting", lead: "What the money did, in numbers and stories, ready for the donor report.",
        cols: [["outcome", "Outcome", "text"], ["metric", "Measure", "text"], ["target", "Target", "num"], ["actual", "Actual", "num"], ["evidence", "Story / evidence", "long"], ["owner", "Owner", "text"], ["reported", "Reported", "check"]] }
};

var BRIEF_FIELDS = [
    ["concept", "Concept in one sentence", "area", true], ["theme", "Curatorial or editorial theme", "text"], ["audience", "Primary audience", "text"],
    ["secondary", "Secondary audiences", "text"], ["ticketing", "Ticketing model", "select", ["Free", "RSVP", "Paid tiers", "Invite-only", "Mixed"]],
    ["envelope", "Budget envelope", "money"], ["contPct", "Contingency %", "num"], ["decision", "Decision-maker", "text"], ["approved", "Brief approved on", "date"],
    ["revenue", "Revenue sources", "text"], ["nonneg", "Non-negotiables (brand, ethics, sustainability, access)", "area", true],
    ["constraints", "Known constraints (curfews, noise, load-in)", "area", true]
];
var EVENT_FIELDS = [
    ["name", "Event name", "text"], ["format", "Format", "format"], ["startDate", "Show day (first)", "date"], ["endDate", "Last show day", "date"],
    ["city", "City", "text"], ["venue", "Venue", "text"], ["capacity", "Capacity", "num"], ["currency", "Currency", "select", ["EUR", "GBP", "USD", "CHF", "INR", "HKD"]]
];

// Values that count as "done" for module progress.
var DONE_VALUES = ["Done", "Paid", "Signed", "Approved", "Booked", "Accepted", "Yes", "Sold out", "Closed", "Submitted", "Received", "Confirmed"];

// Status pill colour family for a select value: good | info | warn | bad | none
function pillKind(v) {
    if (["Done", "Signed", "Paid", "Approved", "Booked", "Accepted", "Yes", "On sale", "Received", "Confirmed"].indexOf(v) >= 0) return "good";
    if (["In progress", "Negotiating", "Pitched", "Submitted", "Quoting", "Shortlisted", "Maybe", "Waitlist", "Building", "Asked", "Pledged", "Applied", "Registered", "Planned"].indexOf(v) >= 0) return "info";
    if (["Changes requested", "Sold out", "Paused"].indexOf(v) >= 0) return "warn";
    if (["Blocked", "Lost", "Refused", "Rejected", "No", "Disqualified", "Declined", "Cancelled"].indexOf(v) >= 0) return "bad";
    return "none";
}
function isPillCol(key) { return key === "status" || key === "stage" || key === "rsvp"; }
// A select column renders as a status pill when its key says so or it was built as a status column.
function isPill(col) { return !!col && col[2] === "select" && (isPillCol(col[0]) || col[4] === "pill"); }

// ---------- lookups that understand custom modules ----------
function customDef(ev, id) {
    var list = ev && Array.isArray(ev.custom) ? ev.custom : [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
}
function isCustom(m) { return String(m).indexOf("cm-") === 0; }
function moduleDef(ev, m) {
    if (MODULES[m]) return MODULES[m];
    var c = customDef(ev, m);
    return c ? { t: c.title || "Custom module", s: [c.id], custom: true } : null;
}
function moduleTitle(ev, m) { var d = moduleDef(ev, m); return d ? d.t : ""; }
function tableOf(ev, key) {
    if (TABLES[key]) return TABLES[key];
    var c = customDef(ev, key);
    return c ? { t: c.title || "Custom module", lead: c.lead || "", cols: c.cols || [], totals: customTotals(c), custom: true } : null;
}
function customTotals(c) {
    var t = (c.cols || []).filter(function (col) { return col[2] === "money" || col[2] === "num"; }).map(function (col) { return col[0]; });
    return t.length ? t : undefined;
}
function sections(ev, mod) { var m = moduleDef(ev, mod); return m && m.s ? m.s.slice() : []; }
function eventModules(ev) { return ev ? ev.modules.filter(function (m) { return !!moduleDef(ev, m); }) : []; }

function sortedRows(ev, key) {
    var t = tableOf(ev, key);
    var rs = (ev && ev[key] ? ev[key] : []).slice();
    if (t && t.sort) rs.sort(t.sort);
    return rs;
}

function columnTotal(ev, key, field) {
    var t = tableOf(ev, key);
    var col = null;
    for (var i = 0; i < t.cols.length; i++) if (t.cols[i][0] === field) col = t.cols[i];
    var rs = ev[key] || [];
    var s = 0;
    for (var j = 0; j < rs.length; j++) s += (col[2] === "calc" ? Number(calcFn(col)(rs[j])) || 0 : num(rs[j][field]));
    return { label: col[1], value: s, isMoney: col[2] === "money" || (col[2] === "calc" && col[4] === "money") };
}
// Display text for a computed cell.
// Computed columns by key. Columns that pass through QML can arrive without
// their function, so look it up here rather than trusting col[3].
var CALC_FNS = { revenue: rowPrice, total: scoreTotal, zones: tzLine };
function calcFn(col) {
    if (col && typeof col[3] === "function") return col[3];
    return CALC_FNS[col && col[0]] || function () { return ""; };
}
function calcText(ev, col, r) {
    if (!col || !r) return "";
    var v = calcFn(col)(r);
    if (col[4] === "text") return String(v);
    if (col[4] === "money") return money(v, ev && ev.currency);
    return count(Number(v) || 0);
}

var PROGRESS_KEYS = ["status", "done", "stage", "rsvp", "booked", "confirmed", "paid", "published", "checkedIn", "kitchenTold", "shared", "waiver", "reported", "live", "thanked"];
function modCount(ev, m) {
    if (!ev) return "";
    var spec = moduleDef(ev, m);
    if (!spec || !spec.s) return "";
    var done = 0, tot = 0;
    spec.s.forEach(function (k) {
        var tbl = tableOf(ev, k), rs = ev[k];
        if (!tbl || !Array.isArray(rs)) return;
        var sc = null;
        for (var p = 0; p < PROGRESS_KEYS.length && !sc; p++)
            for (var i = 0; i < tbl.cols.length && !sc; i++)
                if (tbl.cols[i][0] === PROGRESS_KEYS[p]) sc = PROGRESS_KEYS[p];
        if (!sc) for (var q = 0; q < tbl.cols.length && !sc; q++) if (isPill(tbl.cols[q]) || tbl.cols[q][2] === "check") sc = tbl.cols[q][0];
        if (!sc) return;
        rs.forEach(function (r) { tot++; var v = r[sc]; if (v === true || DONE_VALUES.indexOf(v) >= 0) done++; });
    });
    return tot ? done + "/" + tot : "";
}

function blankRow(key, ev) {
    var t = tableOf(ev, key), r = { id: rid() };
    t.cols.forEach(function (c) {
        if (c[2] === "check") r[c[0]] = false;
        else if (isPill(c)) r[c[0]] = c[3][0];
        else if (c[2] !== "calc" && c[2] !== "score") r[c[0]] = "";
    });
    if (["ros", "programme", "staffing", "mentors", "meals", "dailyProg", "arrivals", "stages", "transport", "shots", "tzSessions"].indexOf(key) >= 0 && ev) r.day = ev.startDate || "";
    if (key === "stopLodging" && ev) r.night = ev.startDate || "";
    if (key === "sessions" && ev) r.date = ev.startDate || "";
    if (key === "milestones") r.t = 4;
    if (key === "risks") { r.l = "2"; r.i = "3"; }
    return r;
}

// ---------- template generator ----------
function rows(list, keys, extra) {
    return list.map(function (v) {
        var o = { id: rid() };
        keys.forEach(function (k, i) { o[k] = v[i] === undefined ? "" : v[i]; });
        if (extra) for (var k in extra) if (o[k] === undefined) o[k] = extra[k];
        return o;
    });
}

var MILESTONES = [
    [26, "Brief signed off, budget envelope set", "all"],
    [24, "Venue shortlisted and held", "festival conference immersive corporate experience"],
    [22, "Call for speakers opens", "conference"],
    [20, "Venue contracted, permits scoped", "all"],
    [20, "Sponsorship and exhibitor deck out to prospects", "festival conference"],
    [16, "Headliners or keynotes confirmed; art commissions agreed", "festival conference immersive"],
    [16, "Announce wave; tickets or registration live", "festival conference immersive experience"],
    [14, "Call for speakers closes; review panel scores", "conference"],
    [12, "Permits submitted; title sponsor signed", "festival conference immersive activation experience"],
    [12, "Activation brief approved by the brand", "activation experience"],
    [12, "Stakeholder sign-off on objectives, agenda and budget", "corporate experience"],
    [12, "Speakers accepted and notified", "conference"],
    [10, "Full line-up or agenda published", "festival conference"],
    [10, "Experience concept and guest journey approved", "activation experience"],
    [8, "Production suppliers contracted; site plan v1", "all"],
    [8, "Invitations sent; speaker and guest travel booking opens", "corporate"],
    [8, "Floor plan and booth sales live", "conference"],
    [6, "Fabrication starts; risk assessment complete", "immersive activation experience"],
    [6, "Staffing plan set; ambassador recruitment", "activation experience"],
    [4, "Go / no-go: sales, budget, permits reviewed", "all"],
    [4, "RSVP deadline; travel and rooms confirmed", "corporate conference"],
    [3, "Running order and run of show v1", "all"],
    [3, "Brand assets signed off; data capture tested", "activation experience corporate"],
    [2, "Crew and volunteer briefing pack; access info live", "all"],
    [2, "Final numbers to venue and caterer; seating plan", "corporate conference"],
    [1, "Final tech specs; test night for installations", "all"],
    [1, "Ambassador training and dress rehearsal", "activation experience"],
    [20, "Sponsor tracks and bounties confirmed", "hackathon"],
    [12, "Hacker registration opens; judging criteria published", "hackathon"],
    [6, "Mentor schedule filled; starter kits and APIs tested", "hackathon"],
    [1, "Judges briefed; submission form tested", "hackathon"],
    [12, "Platform chosen; streaming run-sheet drafted", "virtual"],
    [4, "Speaker tech checks booked", "virtual"],
    [1, "Full rehearsal on the live platform", "virtual"],
    [-2, "Recordings edited, captioned and published", "virtual"],
    [20, "Applications open", "residency"],
    [12, "Applications close; participants selected", "residency"],
    [8, "Rooms allocated; arrivals form sent", "residency"],
    [2, "Meal plan and dietary list to the kitchen", "residency"],
    [20, "Route walked or scouted; stages fixed", "touring"],
    [12, "Lodging booked for every stop", "touring"],
    [6, "Roster, waivers and emergency contacts complete", "touring"],
    [2, "Content plan and crew kit list final", "touring"],
    [8, "Season of sessions scheduled; hosts confirmed", "community"],
    [4, "Venue partners confirmed for the season", "community"],
    [1, "RSVP reminder sent", "community"],
    [16, "Fundraising target and case for support agreed", "fundraising"],
    [10, "Major donor asks made", "fundraising"],
    [6, "Auction and raffle items secured", "fundraising"],
    [1, "Donation channels tested end to end", "fundraising"],
    [-3, "Impact report sent to donors", "fundraising"],
    [0, "Build, show, de-rig", "all"],
    [-4, "Wrap complete: settled, reported, debriefed", "all"]
];

function newEvent(o) {
    var f = FORMATS[o.format] ? o.format : "festival";
    var now = new Date().toISOString();
    var sponsorish = f === "activation" || f === "experience" || f === "festival" || f === "conference";
    var ms = MILESTONES.filter(function (m) { return m[2] === "all" || m[2].split(" ").indexOf(f) >= 0; })
        .map(function (m) { return { id: rid(), t: m[0], what: m[1], applies: m[2] === "all" ? "All" : m[2], owner: "", status: "Not started" }; });
    var start = o.startDate || "";
    return {
        name: o.name || "Untitled event", format: f, startDate: start, endDate: o.endDate || start,
        city: o.city || "", venue: o.venue || "", capacity: o.capacity || "", currency: "EUR",
        modules: FORMAT_MODULES[f].slice(),
        brief: { concept: "", theme: "", audience: "", secondary: "",
            ticketing: (f === "activation" || f === "experience" || f === "community") ? "Free"
                     : (f === "corporate" || f === "residency" || f === "touring") ? "Invite-only"
                     : (f === "hackathon" || f === "virtual") ? "RSVP" : "Paid tiers",
            envelope: "", contPct: (f === "immersive" || f === "festival") ? 15 : 10, decision: "", approved: "", revenue: "", nonneg: "", constraints: "" },
        kpis: rows([
            ["Grow community", "Attendees · new signups", "", "Ticketing data · CRM", ""],
            sponsorish ? ["Deliver partner value", "Leads · dwell time", "", "Lead scans · counters", ""]
                       : (f === "corporate" ? ["Engage attendees", "Survey score · attendance", "", "Post-event survey", ""]
                                            : ["Cultural impact", "Press pieces · commissions", "", "Clippings · programme", ""])
        ], ["objective", "kpi", "target", "measure", "actual"]),
        milestones: ms,
        team: rows([["Event director", "", "Direction", "", "", true], ["Producer / production manager", "", "Production", "", "", true],
            ["Curator / programme lead", "", "Programme", "", "", true], ["Partner or client manager", "", "Partnerships", "", "", true],
            ["Marketing lead", "", "Marketing", "", "", false], ["Safety officer", "", "Operations", "", "", true], ["Finance", "", "Finance", "", "", false]],
            ["role", "name", "work", "phone", "email", "onsite"]),
        income: rows([["Ticket sales (net of fees)"], ["Headline / title sponsor or client fee"], ["Supporting sponsors and partners"], ["Grants and cultural funding"],
            ["Bar, F&B and concessions"], ["Merch"], ["In-kind (value, not cash)"]], ["line"], { est: "", committed: "", actual: "", notes: "" }),
        costs: rows([["Venue and site", "Hire, power, toilets, fencing, cleaning, waste"], ["Production", "Staging, rigging, sound, lighting, video"],
            ["Immersive and art", "Commissions, fabrication, install"], ["Talent", "Fees, travel, hotels, per diems, hospitality"],
            ["Staff and crew", "Production team, crew, freelancers"], ["Safety and security", "Security, stewards, medics"],
            ["Licensing and insurance", "Permits, music rights, liability"], ["Marketing", "Design, paid media, print, PR, photo and video"],
            ["Ticketing and tech", "Platform fees, scanners, wifi"], ["Partner delivery", "Activation build, branding, lead capture"],
            ["Logistics", "Transport, storage, radios"], ["Admin", "Accounting, legal, bank fees"]], ["category", "lines"], { est: "", committed: "", actual: "" }),
        sponsors: [], deliverables: [], programme: [], talent: [], works: [],
        artChecks: rows([["Artist contract with fee, IP and documentation rights"], ["Technical rider received and costed"], ["Structural or electrical sign-off"],
            ["Strobe and sensory warnings on signage and ticketing"], ["Test night completed and snags logged"], ["Condition report on arrival and departure"]], ["item"], { owner: "", done: false }),
        venueChecks: rows([["Capacity per zone and fire-certified maximum"], ["Existing licences: alcohol, music, late hours"], ["Power supply, generators, water, waste"],
            ["Load-in access, vehicle sizes, curfew and noise limits"], ["Wifi capacity for attendees, scanning and streaming"], ["Toilets ratio and accessible toilets"],
            ["Green rooms, production office, storage"], ["Weather plan for outdoor areas"], ["Step-free routes, quiet room, captioning"],
            ["Sustainability: reusable cups, refill points, waste separation"]], ["item"], { owner: "", done: false }),
        permits: rows([["Event or public-space permit", "Municipality", "8–12 weeks"], ["Music rights", "Collecting society", "4 weeks"], ["Alcohol or F&B licence", "", "6 weeks"],
            ["Noise exemption", "", "6 weeks"], ["Temporary structures sign-off", "", "4 weeks"], ["Public liability insurance", "Insurer", "2 weeks"]],
            ["item", "authority", "lead"], { owner: "", submitted: "", status: "Not started" }),
        comms: rows([["Announce", "T-16 to T-12", "Save the date, concept, first names", "Website live, launch post, partner co-announce, press release", "Join the list / early-bird"],
            ["Line-up", "T-12 to T-6", "Who and what", "Line-up drops, artist content, partner reveals", "Buy tickets / register"],
            ["Urgency", "T-6 to T-1", "Last chance, what to expect", "Paid push, schedule, map, FAQs, press invites", "Final tickets"],
            ["Live and after", "Show week to T+4", "Being there", "Live social, photo and video, thank-yous, recap film", "Next edition sign-up"]],
            ["wave", "when", "message", "actions", "cta"], { owner: "", status: "Not started" }),
        channels: rows([["Website / event page"], ["Instagram"], ["X / LinkedIn / Farcaster"], ["Newsletter"], ["Press and media partners"],
            ["Community channels (Telegram, Discord, Status)"], ["Partner channels"]], ["channel"], { owner: "", freq: "", assets: "" }),
        vendors: rows([["Sound and lighting"], ["Staging and rigging"], ["Video and projection"], ["Power and generators"], ["Fabrication and set build"],
            ["Catering and bar"], ["Security and stewarding"], ["Medical"], ["Toilets, waste, cleaning"], ["Ticketing platform"], ["Photo and video"], ["Print and signage"]],
            ["category"], { supplier: "", contact: "", quote: "", deposit: false, balance: "", contract: false, loadin: "", status: "Not started" }),
        ros: rows([[start, "07:00", "60", "Crew call, safety briefing", "Production office", "Producer", "", "Radios and channel plan out"],
            [start, "09:00", "120", "Sound check / tech run", "Main stage", "Stage manager", "", ""],
            [start, "12:30", "", "Doors / registration open", "Entrance", "Front of house", "Walk-in music", "Scanners tested"]],
            ["day", "time", "dur", "item", "location", "lead", "cue", "notes"]),
        risks: rows([["Headliner or keynote cancels", "2", "4", "Standby act, cancellation clause", "Swap slot, comms script"],
            ["Ticket sales or RSVPs below target", "3", "4", "Early-bird targets, partner pushes", "Cut costs, scale down zones"],
            ["Sponsor or client withdraws or pays late", "2", "4", "Staged payments, signed contracts", "Reduce activation, backfill"],
            ["Permit delayed or refused", "2", "5", "Apply early, pre-meet authority", "Alternate venue or format"],
            ["Bad weather (outdoor)", "3", "3", "Covered areas, wind limits", "Move indoors, delay"],
            ["Power or tech failure", "2", "4", "Backup generator, spare kit", "Acoustic set, manual cues"],
            ["Overcrowding at a zone", "2", "5", "Capacity counts, one-way flow", "Hold entry, open overflow"],
            ["Installation or build damaged", "2", "3", "Barriers, invigilation, insurance", "Close piece, repair"]],
            ["risk", "l", "i", "mitigation", "fallback"], { owner: "" }),
        wrap: rows([["Thank-you messages to artists, speakers, crew, partners"], ["Team debrief: what worked, what broke, what to change"], ["Attendee survey sent"],
            ["Photo and video delivered and credited"], ["Supplier invoices checked and paid"], ["Partner and client reports delivered"],
            ["Final settlement and P&L"], ["Recap content and next-edition announce"]], ["task"], { due: "", owner: "", done: false }),
        cfp: [],
        rooms: rows([["Main track", "Main hall", "", "", "Theatre", true], ["Breakouts", "Room 2", "", "", "Classroom", false], ["Workshops", "Studio", "", "", "Workshop", false]],
            ["track", "room", "capacity", "chair", "av", "stream"]),
        tickets: rows([["Early bird", "", "", "0"], ["Standard", "", "", "0"], ["Late / door", "", "", "0"], ["Speaker / guest comp", "0", "", "0"]],
            ["tier", "price", "cap", "sold"], { opens: "", closes: "", status: "Not started" }),
        regChecks: rows([["Registration form: name, company, role, dietary and access needs"], ["Confirmation and reminder emails scheduled"], ["Badge design and print run"],
            ["Check-in desk, scanners and staff"], ["Speaker and VIP fast-track"], ["No-show and waitlist policy"]], ["item"], { owner: "", done: false }),
        exhibitors: [],
        approvals: rows([["Objectives and success measures", "", "Leadership"], ["Budget", "", "Finance"], ["Venue and supplier contracts", "", "Procurement"],
            ["Agenda and speakers", "", "Leadership"], ["Brand and creative", "", "Brand"], ["Guest data and privacy", "", "Legal"]],
            ["item", "approver", "dept"], { due: "", status: "Pending", notes: "" }),
        materials: [], guests: [], travel: [],
        journey: rows([["Discover", "Invite / social / street presence"], ["Arrive", "Entrance and welcome"], ["Explore", "Main space"], ["Interact", "Hero moment"],
            ["Share", "Photo or content point"], ["Leave", "Exit and take-away"], ["Follow-up", "Email, community, offer"]],
            ["stage", "touchpoint"], { does: "", feels: "", moment: "", tech: "", owner: "" }),
        brandAssets: [], staffing: [],
        metrics: rows([["Footfall"], ["Average dwell time (mins)"], ["Interactions / trials"], ["Leads or signups"], ["Social reach and UGC posts"], ["Sentiment score"]],
            ["metric"], { target: "", actual: "", method: "", source: "", owner: "" }),
        dataChecks: rows([["Consent wording on every capture point"], ["Privacy notice visible on site and online"], ["Data processor agreement with the brand"],
            ["Retention period and deletion date agreed"], ["Photo and filming notice at entrances"], ["Secure transfer of lead data to the client"]],
            ["item"], { owner: "", done: false }),
        inventory: [], tourStops: [],
        tracks: [], teams: [], hackers: [], scores: [], prizes: [], mentors: [],
        criteria: rows([["Innovation", "25", "Is the idea new, or a fresh take on an old problem?"], ["Technical", "25", "Does it work, and is it well built?"],
            ["Impact", "25", "Would people use it? Does it fit the track's challenge?"], ["Presentation", "25", "Is the demo clear inside the time limit?"]],
            ["criterion", "weight", "guidance"]),
        platform: rows([["Streaming platform"], ["Stream keys and encoder (OBS / vMix)"], ["Backup stream"], ["Live captions"], ["Chat and Q&A moderation"],
            ["On-site cameras and audio feed"]], ["item"], { provider: "", owner: "", backup: "", status: "Not started" }),
        techChecks: [], tzSessions: [],
        engagement: rows([["Registrations"], ["Peak concurrent viewers"], ["Average watch time (mins)"], ["Chat messages"], ["Poll responses"], ["Q&A questions"], ["Replay views (30 days)"]],
            ["metric"], { target: "", actual: "", source: "", owner: "" }),
        recordings: [],
        applications: [], roomAlloc: [], meals: [], dietary: [], dailyProg: [], arrivals: [],
        houseRules: rows([["Quiet hours and shared spaces"], ["Kitchen, cleaning and chore rota"], ["Guests and visitors"], ["Consent, safety and who to talk to"],
            ["Photos and filming"], ["Arrival, keys and check-out"]], ["rule"], { owner: "", shared: false }),
        stages: [], transport: [], stopLodging: [], roster: [], shots: [],
        sessions: [], hostRotation: [], members: [], venuePartners: [],
        donors: [], auctionItems: [],
        donationChannels: rows([["Card / online"], ["Bank transfer"], ["QR code"], ["Crypto wallet"]], ["channel"], { provider: "", link: "", fees: "", raised: "", owner: "", live: false }),
        impact: [],
        custom: [],
        archive: [],
        debrief: "",
        createdAt: now, updatedAt: now
    };
}

// A clearly marked example so a new install opens on a working view.
function exampleEvent() {
    var iso = addDays(todayIso(), 16 * 7);
    var e = newEvent({ format: "festival", name: "Example: Harbour Lights Festival", startDate: iso, endDate: addDays(iso, 2),
        city: "Lisbon", venue: "Riverside warehouse site", capacity: 3000 });
    e.brief.concept = "Example only — a three-day art, music and technology festival on the river.";
    e.milestones.forEach(function (m) { if (m.t > 16) m.status = "Done"; else if (m.t === 16) m.status = "In progress"; });
    e.income[0].est = 90000; e.income[1].est = 40000; e.income[2].est = 25000; e.income[4].est = 30000;
    var costs = [22000, 38000, 15000, 30000, 18000, 9000, 6000, 12000, 4000, 5000, 4000, 2500];
    e.costs.forEach(function (c, i) { c.est = costs[i]; });
    e.sponsors = rows([["Example Partner A", "Title", "40000", "Negotiating", "Awareness", "Branded light tunnel at the main entrance", ""],
        ["Example Partner B", "Experience partner", "12000", "Pitched", "Product trial", "Interactive sound lounge", ""]],
        ["name", "tier", "fee", "stage", "objective", "idea", "owner"]);
    return e;
}

// Fill in any arrays or fields an older saved event is missing.
function normalise(e) {
    if (!e || typeof e !== "object") return e;
    if (!Array.isArray(e.modules)) e.modules = (FORMAT_MODULES[e.format] || MOD_ORDER).slice();
    if (!e.brief || typeof e.brief !== "object") e.brief = {};
    for (var k in TABLES) if (!Array.isArray(e[k])) e[k] = [];
    if (!Array.isArray(e.custom)) e.custom = [];
    if (!Array.isArray(e.archive)) e.archive = [];
    // Every event has an archive, including events made before it existed.
    if (e.modules.indexOf("archive") < 0) {
        var w = e.modules.indexOf("wrap");
        if (w < 0) e.modules.push("archive"); else e.modules.splice(w, 0, "archive");
    }
    e.custom.forEach(function (c) { if (!Array.isArray(e[c.id])) e[c.id] = []; });
    if (e.debrief === undefined) e.debrief = "";
    if (!e.currency) e.currency = "EUR";
    return e;
}

// ---------- overview figures ----------
function sumCol(ev, key, field) {
    var rs = ev[key] || [], s = 0;
    for (var i = 0; i < rs.length; i++) s += num(rs[i][field]);
    return s;
}
function dueOf(ev, m) { return ev.startDate ? addDays(ev.startDate, -7 * (Number(m.t) || 0)) : ""; }

function overviewStats(ev) {
    var cur = ev.currency, out = [];
    var ms = ev.milestones || [];
    var done = ms.filter(function (m) { return m.status === "Done"; }).length;
    var late = ms.filter(function (m) { var d = dueOf(ev, m); return m.status !== "Done" && d && dayDiff(d) < 0; }).length;
    out.push({ label: "Milestones", value: done + " / " + ms.length, sub: late ? late + " overdue" : "None overdue", bad: late > 0, bar: ms.length ? done / ms.length : 0 });
    var cont = (num(ev.brief && ev.brief.contPct) || 0) / 100;
    var inc = sumCol(ev, "income", "est"), cost = sumCol(ev, "costs", "est") * (1 + cont);
    out.push({ label: "Projected result", value: money(inc - cost, cur), sub: money(inc, cur) + " in · " + money(cost, cur) + " out incl. contingency", bad: inc - cost < 0 });
    var on = function (m) { return ev.modules.indexOf(m) >= 0; };
    if (on("sponsors")) {
        var sp = (ev.sponsors || []).filter(function (s) { return s.stage === "Signed" || s.stage === "Paid"; });
        out.push({ label: "Partners signed", value: String(sp.length), sub: money(sp.reduce(function (s, x) { return s + num(x.fee); }, 0), cur) + " committed of " + (ev.sponsors || []).length + " in pipeline" });
    }
    var hi = (ev.risks || []).filter(function (r) { return riskScore(r) >= 12; }).length;
    out.push({ label: "High risks", value: String(hi), sub: "Scored 12 or above", bad: hi > 0 });
    if (on("registration")) {
        var tk = ev.tickets || [], sold = sumCol(ev, "tickets", "sold"), cap = sumCol(ev, "tickets", "cap");
        out.push({ label: "Tickets sold", value: count(sold) + (cap ? " / " + count(cap) : ""), sub: money(tk.reduce(function (s, r) { return s + rowPrice(r); }, 0), cur) + " ticket revenue", bar: cap ? Math.min(1, sold / cap) : -1 });
    }
    if (on("guests")) {
        var g = ev.guests || [];
        var yes = g.filter(function (x) { return x.rsvp === "Yes"; }).length, inv = g.filter(function (x) { return x.invited; }).length;
        var pend = g.filter(function (x) { return x.invited && (!x.rsvp || x.rsvp === "Pending"); }).length;
        out.push({ label: "Guests confirmed", value: yes + " / " + inv, sub: pend + " invited and awaiting reply" });
    }
    if (on("cfp")) {
        var cf = ev.cfp || [];
        out.push({ label: "Speakers accepted", value: String(cf.filter(function (x) { return x.status === "Accepted"; }).length), sub: "from " + cf.length + " submissions" });
    }
    if (on("stakeholders")) {
        var ap = ev.approvals || [], pa = ap.filter(function (x) { return x.status !== "Approved"; }).length;
        out.push({ label: "Approvals open", value: String(pa), sub: (ap.length - pa) + " of " + ap.length + " signed off" });
    }
    if (on("measurement")) {
        var withT = (ev.metrics || []).filter(function (x) { return num(x.target) > 0; });
        var hit = withT.filter(function (x) { return num(x.actual) >= num(x.target); }).length;
        out.push({ label: "Metrics on target", value: hit + " / " + withT.length, sub: withT.length ? "Metrics with a target set" : "Set targets in Data & measurement" });
    }
    if (on("staffing")) {
        var sf = ev.staffing || [];
        out.push({ label: "Crew briefed", value: sf.filter(function (x) { return x.briefed; }).length + " / " + sf.length, sub: "Shifts in the staffing plan" });
    }
    if (on("teams")) {
        var tm = ev.teams || [], sub = tm.filter(function (x) { return x.status === "Submitted"; }).length;
        out.push({ label: "Teams", value: String(tm.length), sub: sub + " submitted · " + (ev.hackers || []).length + " registrations" });
    }
    if (on("prizes")) {
        var pz = ev.prizes || [], paid = pz.filter(function (x) { return x.paid; }).length;
        out.push({ label: "Prize pool", value: money(sumCol(ev, "prizes", "amount"), cur), sub: paid + " of " + pz.length + " paid out" });
    }
    if (on("streaming")) {
        var tc = ev.techChecks || [];
        out.push({ label: "Speaker tech checks", value: tc.filter(function (x) { return x.status === "Done"; }).length + " / " + tc.length, sub: "Checked on the live platform" });
    }
    if (on("vod")) {
        var rc = ev.recordings || [];
        out.push({ label: "Replays published", value: rc.filter(function (x) { return x.published; }).length + " / " + rc.length, sub: rc.filter(function (x) { return x.recorded && !x.published; }).length + " recorded, waiting to publish" });
    }
    if (on("participants")) {
        var ap2 = ev.applications || [];
        out.push({ label: "Participants accepted", value: ap2.filter(function (x) { return x.status === "Accepted"; }).length + " / " + ap2.length, sub: ap2.filter(function (x) { return x.status === "Applied"; }).length + " applications to review" });
    }
    if (on("accommodation")) {
        var rm = ev.roomAlloc || [];
        out.push({ label: "Beds", value: count(sumCol(ev, "roomAlloc", "beds")), sub: rm.filter(function (x) { return !String(x.occupants || "").trim(); }).length + " of " + rm.length + " rooms still unassigned" });
    }
    if (on("route")) {
        out.push({ label: "Route", value: count(sumCol(ev, "stages", "km")) + " km", sub: (ev.stages || []).length + " stages · " + count(sumCol(ev, "stages", "climb")) + " m ascent" });
    }
    if (on("roster")) {
        var ro = ev.roster || [], noEm = ro.filter(function (x) { return !String(x.emergencyPhone || "").trim(); }).length;
        out.push({ label: "On the roster", value: String(ro.length), sub: noEm ? noEm + " without an emergency contact" : "Everyone has an emergency contact", bad: noEm > 0 });
    }
    if (on("sessions")) {
        var ss = ev.sessions || [], held = ss.filter(function (x) { return x.status === "Done"; });
        var avg = held.length ? Math.round(held.reduce(function (s, x) { return s + num(x.attended); }, 0) / held.length) : 0;
        out.push({ label: "Sessions held", value: held.length + " / " + ss.length, sub: held.length ? "Average attendance " + avg : "None held yet" });
    }
    if (on("donors")) {
        var ask = sumCol(ev, "donors", "ask"), rec = sumCol(ev, "donors", "received") + sumCol(ev, "auctionItems", "result") * (on("auction") ? 1 : 0);
        out.push({ label: "Raised", value: money(rec, cur), sub: money(sumCol(ev, "donors", "pledged"), cur) + " pledged · " + money(ask, cur) + " asked", bar: ask ? Math.min(1, rec / ask) : -1 });
    }
    return out;
}

function budgetStats(ev) {
    var cur = ev.currency, out = [];
    var contPct = num(ev.brief && ev.brief.contPct) || 0;
    var inc = sumCol(ev, "income", "est"), cost = sumCol(ev, "costs", "est"), cont = cost * contPct / 100;
    var ia = sumCol(ev, "income", "actual"), ca = sumCol(ev, "costs", "actual");
    out.push({ label: "Income estimate", value: money(inc, cur), sub: "Committed " + money(sumCol(ev, "income", "committed"), cur) });
    out.push({ label: "Cost estimate", value: money(cost, cur), sub: "+ " + money(cont, cur) + " contingency (" + contPct + "%)" });
    out.push({ label: "Projected result", value: money(inc - cost - cont, cur), sub: "Income − costs − contingency", bad: inc - cost - cont < 0 });
    out.push({ label: "Actuals to date", value: money(ia - ca, cur), sub: money(ia, cur) + " in · " + money(ca, cur) + " out", bad: ia - ca < 0 });
    var env = num(ev.brief && ev.brief.envelope);
    if (env) out.push({ label: "Against envelope", value: Math.round((cost + cont) / env * 100) + "%", sub: money(env, cur) + " envelope", bad: cost + cont > env, bar: Math.min(1, (cost + cont) / env) });
    return out;
}

function nextMilestones(ev, n) {
    return (ev.milestones || []).filter(function (m) { return m.status !== "Done"; })
        .sort(function (a, b) { return (Number(b.t) || 0) - (Number(a.t) || 0); })
        .slice(0, n)
        .map(function (m) { var d = dueOf(ev, m); var dd = d ? dayDiff(d) : null;
            return { t: tlabel(m.t), what: m.what, owner: m.owner || "", due: d ? (dd < 0 ? "Overdue · " : "") + shortDate(d) : m.status, late: dd !== null && dd < 0, soon: dd !== null && dd >= 0 && dd <= 14 }; });
}

function topRisks(ev, n) {
    return (ev.risks || []).map(function (r) { return { s: riskScore(r), risk: r.risk, fallback: r.fallback || "", owner: r.owner || "" }; })
        .sort(function (a, b) { return b.s - a.s; }).slice(0, n);
}

function countdown(ev) {
    var d = dayDiff(ev.startDate);
    if (d === null) return "";
    return d > 0 ? "T-" + d + " days" : d === 0 ? "Show day" : "T+" + (-d) + " days";
}
function subtitle(ev) {
    var when = ev.startDate ? fmtDate(ev.startDate) + (ev.endDate && ev.endDate !== ev.startDate ? " – " + fmtDate(ev.endDate) : "") : "No show day yet";
    return [when, ev.venue, ev.city].filter(function (x) { return !!x; }).join(" · ");
}


// ---------- custom modules ----------
// A custom module lives on the event: its definition in ev.custom and its rows
// in ev[<id>]. Columns use the same shape as built-in tables.
var CUSTOM_TYPES = [["text", "Text"], ["long", "Long text"], ["num", "Number"], ["money", "Money"], ["date", "Date"],
                    ["time", "Time"], ["status", "Status"], ["check", "Checkbox"], ["select", "Choice list"]];
function slug(s) {
    var k = String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 32);
    return k || "col";
}
// Builder rows → table columns. Each row: {label, type, options, key?}
function buildColumns(rowsIn) {
    var used = { id: 1 }, out = [];
    rowsIn.forEach(function (r) {
        var label = String(r.label || "").trim();
        if (!label) return;
        var key = r.key || slug(label), base = key, n = 2;
        while (used[key]) key = base + "_" + (n++);
        used[key] = 1;
        if (r.type === "status") out.push([key, label, "select", ST.slice(), "pill"]);
        else if (r.type === "select") {
            var opts = String(r.options || "").split(",").map(function (x) { return x.trim(); }).filter(function (x) { return !!x; });
            out.push([key, label, "select", opts.length ? opts : ["Yes", "No"]]);
        } else out.push([key, label, r.type || "text"]);
    });
    return out;
}
// Table columns → builder rows (for editing an existing module).
function builderRows(cols) {
    return (cols || []).map(function (c) {
        var type = c[2] === "select" ? (c[4] === "pill" ? "status" : "select") : c[2];
        return { key: c[0], label: c[1], type: type, options: c[2] === "select" && c[4] !== "pill" ? c[3].join(", ") : "" };
    });
}
function addCustomModule(ev, title, lead, rowsIn) {
    var id = "cm-" + rid();
    var def = { id: id, title: String(title || "").trim() || "Custom module", lead: String(lead || "").trim(), cols: buildColumns(rowsIn), createdAt: new Date().toISOString() };
    if (!Array.isArray(ev.custom)) ev.custom = [];
    ev.custom.push(def);
    ev[id] = [];
    if (ev.modules.indexOf(id) < 0) ev.modules.push(id);
    return id;
}
function updateCustomModule(ev, id, title, lead, rowsIn) {
    var def = customDef(ev, id);
    if (!def) return false;
    def.title = String(title || "").trim() || def.title;
    def.lead = String(lead || "").trim();
    def.cols = buildColumns(rowsIn);
    return true;
}
function removeCustomModule(ev, id) {
    ev.custom = (ev.custom || []).filter(function (c) { return c.id !== id; });
    ev.modules = ev.modules.filter(function (m) { return m !== id; });
    delete ev[id];
}
// Custom modules made in other events that this event doesn't have yet (by title).
function customLibrary(events, ev) {
    var have = {}, out = [];
    (ev.custom || []).forEach(function (c) { have[c.title] = 1; });
    for (var k in events) {
        var other = events[k];
        if (!other || other === ev) continue;
        (other.custom || []).forEach(function (c) {
            if (have[c.title]) return;
            have[c.title] = 1;
            out.push({ title: c.title, lead: c.lead || "", cols: c.cols, from: other.name });
        });
    }
    return out;
}
// Copy a custom module's columns (not its rows) into another event.
function copyCustomModule(ev, lib) {
    return addCustomModule(ev, lib.title, lib.lead, builderRows(lib.cols));
}


// ---------- Intersect ----------
var BRAND = {
    name: "INTERSECT",
    byline: "Events at the edge",
    lead: "Culture-first production, run like infrastructure.",
    paragraphs: [
        "Our team has designed and produced events where art, technology, community and culture stop being separate categories.",
        "Events built as campaigns, not one-off spend: typically run as 2–12 month arcs across pre-launch, activation and follow-through.",
        "We have designed, curated and delivered festivals, art exhibitions, immersive full-scale art installations, brand experiences, conferences, residencies and hybrid events, working with brands including Red Bull, Vans, Accenture, KEF and Shangri-La."
    ],
    open: "This tool is open source, private and free, and open to anyone at any level of event production, curation or event management experience. It holds lessons learnt over 20-plus years, across geographies and event formats.",
    clients: ["Red Bull", "Vans", "Accenture", "KEF", "Shangri-La"],
    site: "intersectlive.io"
};

// Portfolio videos shown in the Home carousel. `file` and `poster` are the
// bundled names; the web version maps them to uploaded asset URLs.
var SHOWCASE = [
    { key: "parallel-society", title: "Parallel Society Lisbon", caption: "Day 1 recap · festival and unconference", file: "day1-recap.mp4", poster: "day1-recap.jpg", ratio: "4:5" },
    { key: "secret-walls-hk", title: "Secret Walls × HK Walls", caption: "Live art battle, Hong Kong", file: "secret-walls-hk-walls.mp4", poster: "secret-walls-hk-walls.jpg", ratio: "16:9" },
    { key: "delta", title: "Delta", caption: "Art projection", file: "delta-art-projection.mp4", poster: "delta-art-projection.jpg", ratio: "16:9" },
    { key: "secret-walls-final", title: "Secret Walls Series 4", caption: "Grand Final", file: "secret-walls-grand-final.mp4", poster: "secret-walls-grand-final.jpg", ratio: "16:9" }
];

// ---------- archive ----------
// Archive items: { id, module, name, size, type, addedAt, note, ... } plus a
// storage pointer (cid in Basecamp, assetId/url on the web).
var SPECIAL_SECTIONS = ["brief", "budgetSummary", "debrief", "archive", "showreel"];
function isSpecialSection(k) { return SPECIAL_SECTIONS.indexOf(k) >= 0; }
function humanSize(n) {
    n = Number(n) || 0;
    if (n < 1024) return n + " B";
    if (n < 1048576) return Math.round(n / 1024) + " KB";
    if (n < 1073741824) return (n / 1048576).toFixed(n < 10485760 ? 1 : 0) + " MB";
    return (n / 1073741824).toFixed(1) + " GB";
}
var FILE_KINDS = {
    video: ["mp4", "mov", "m4v", "webm", "avi", "mkv"],
    image: ["jpg", "jpeg", "png", "gif", "webp", "heic", "svg", "tif", "tiff"],
    audio: ["mp3", "wav", "m4a", "aac", "flac", "ogg"],
    pdf: ["pdf"],
    doc: ["doc", "docx", "odt", "rtf", "txt", "md", "pages"],
    sheet: ["xls", "xlsx", "csv", "ods", "numbers"],
    deck: ["ppt", "pptx", "key", "odp"],
    archive: ["zip", "rar", "7z", "tar", "gz"]
};
var KIND_LABELS = { video: "Video", image: "Image", audio: "Audio", pdf: "PDF", doc: "Document", sheet: "Spreadsheet", deck: "Deck", archive: "Archive", other: "File" };
function fileKind(name, mime) {
    var m = String(mime || "");
    if (m.indexOf("video/") === 0) return "video";
    if (m.indexOf("image/") === 0) return "image";
    if (m.indexOf("audio/") === 0) return "audio";
    if (m === "application/pdf") return "pdf";
    var ext = String(name || "").toLowerCase().split(".").pop();
    for (var k in FILE_KINDS) if (FILE_KINDS[k].indexOf(ext) >= 0) return k;
    return "other";
}
// Modules a file can be filed under, in display order (everything but the
// overview and the archive itself).
function archiveTargets(ev) {
    return eventModules(ev).filter(function (m) { return m !== "overview" && m !== "archive"; });
}
function archiveFor(items, mod) {
    return (items || []).filter(function (x) { return !mod || x.module === mod; })
        .sort(function (a, b) { return String(b.addedAt || "").localeCompare(String(a.addedAt || "")); });
}
// Archive grouped by module for the Intersect Archive page.
function archiveGroups(ev, items) {
    var out = [], seen = {};
    archiveTargets(ev).concat(["general"]).forEach(function (m) {
        var list = archiveFor(items, m);
        if (list.length) { out.push({ module: m, title: m === "general" ? "General" : moduleTitle(ev, m), items: list }); seen[m] = 1; }
    });
    // Files filed under a module that has since been hidden or removed.
    var rest = (items || []).filter(function (x) { return !seen[x.module]; });
    if (rest.length) out.push({ module: "", title: "Other modules", items: archiveFor(rest, "") });
    return out;
}
function archiveStats(items) {
    var size = 0, kinds = {};
    (items || []).forEach(function (x) { size += Number(x.size) || 0; var k = fileKind(x.name, x.type); kinds[k] = (kinds[k] || 0) + 1; });
    return { count: (items || []).length, size: size, kinds: kinds };
}
function archiveVideos(items) {
    return archiveFor(items, "").filter(function (x) { return fileKind(x.name, x.type) === "video"; });
}
