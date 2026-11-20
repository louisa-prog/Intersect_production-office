import QtQuick
import "../src/qml/templates.js" as T

// Drives Main.qml through its main flows. Context properties from harness.py:
// `probe` (report / shot / count / saves / stored / done), `previewRun`, and,
// unless previewRun, `logos` (the mock bridge).
Item {
    id: runner
    width: 1280
    height: 860

    Loader { id: loader; anchors.fill: parent; source: "../src/qml/Main.qml" }
    readonly property var app: loader.item

    property int i: 0
    property var steps: previewRun ? previewSteps : fullSteps
    property string firstId: ""

    function ok(name, cond, detail) { probe.report(name, !!cond, detail === undefined ? "" : String(detail)) }
    function stored() { return JSON.parse(probe.stored()) }

    // Each step runs, then the next waits for its delay (ms).
    readonly property var previewSteps: [
        [9000, function () {
            ok("preview: opens without a bridge", app.loaded && app.preview)
            ok("preview: example event shown", app.order.length === 1 && app.evNow().name.indexOf("Example") === 0)
            probe.shot("10-preview")
        }],
        [300, function () {
            app.setCell("risks", app.evNow().risks[0].id, "l", "5")
            ok("preview: edits work in memory", app.evNow().risks[0].l === "5")
        }],
        [1000, function () { ok("preview: nothing is sent anywhere", true) }]
    ]

    readonly property var fullSteps: [
        [600, function () {
            ok("loads from backend", app.loaded && !app.preview)
            ok("first run opens on Home", app.order.length === 0 && app.panel === "home")
            ok("Home carousel has the four portfolio videos", app.portfolio().length === 4 && String(app.portfolio()[0].url).indexOf("media/day1-recap.mp4") > 0)
            probe.shot("01-first-run")
        }],
        [100, function () { app.createEvent(T.exampleEvent()) }],
        [600, function () {
            ok("example event saved to backend", probe.count() === 1, probe.count())
            runner.firstId = app.cur
            var s = runner.stored()[app.cur]
            ok("stored event has all module tables", s && Array.isArray(s.tickets) && Array.isArray(s.journey) && Array.isArray(s.milestones))
            ok("overview shows at least 4 figures", T.overviewStats(app.evNow()).length >= 4)
            probe.shot("02-overview-festival")
        }],
        [100, function () { app.mod = "timeline" }],
        [400, function () { probe.shot("03-timeline") }],
        [100, function () { app.mod = "budget" }],
        [400, function () { probe.shot("04-budget") }],
        [100, function () {
            var before = app.rev, saves = probe.saves()
            app.setCell("costs", app.evNow().costs[0].id, "est", "30000")
            ok("typing a value does not rebuild the table", app.rev === before)
            runner.savesBefore = saves
        }],
        [1100, function () {
            ok("edit is debounced and saved", probe.saves() === runner.savesBefore + 1, probe.saves() - runner.savesBefore)
            ok("saved value reached the backend", String(runner.stored()[runner.firstId].costs[0].est) === "30000")
            probe.shot("05-budget-edited")
        }],
        [100, function () { app.mod = "risks" }],
        [300, function () {
            var r = app.evNow().risks[0]
            app.setCell("risks", r.id, "l", "5"); app.setCell("risks", r.id, "i", "5")
            ok("risk score recomputes", T.riskScore(app.rowById("risks", r.id)) === 25)
        }],
        [400, function () { probe.shot("06-risks") }],
        [100, function () {
            runner.rowsBefore = app.evNow().milestones.length
            app.mod = "timeline"
            app.addRow("milestones")
            ok("add row adds a milestone", app.evNow().milestones.length === runner.rowsBefore + 1)
        }],
        [200, function () {
            var id = app.evNow().milestones[app.evNow().milestones.length - 1].id
            app.deleteRow("milestones", id)
            ok("first delete click only arms", app.evNow().milestones.length === runner.rowsBefore + 1)
            app.deleteRow("milestones", id)
            ok("second delete click removes the row", app.evNow().milestones.length === runner.rowsBefore)
        }],
        [100, function () { app.creating = true }],
        [300, function () { probe.shot("07-new-event") }],
        [100, function () {
            app.createEvent(T.newEvent({ format: "conference", name: "Builders Summit", startDate: T.addDays(T.todayIso(), 70), city: "Berlin" }))
        }],
        [500, function () {
            var e = app.evNow()
            ok("conference gets its own modules", e.modules.indexOf("cfp") >= 0 && e.modules.indexOf("registration") >= 0 && e.modules.indexOf("expo") >= 0)
            ok("conference milestones include call for speakers", e.milestones.some(function (m) { return m.what.indexOf("Call for speakers") === 0 }))
            ok("two events in backend", probe.count() === 2)
            var t = e.tickets[1]
            app.setCell("tickets", t.id, "price", "250"); app.setCell("tickets", t.id, "sold", "120")
            app.mod = "registration"
        }],
        [500, function () {
            ok("ticket revenue computed", T.columnTotal(app.evNow(), "tickets", "revenue").value === 30000)
            probe.shot("08-conference-registration")
        }],
        [100, function () { app.mod = "overview" }],
        [400, function () { probe.shot("09-conference-overview") }],
        [100, function () {
            app.createEvent(T.newEvent({ format: "corporate", name: "Annual Partner Dinner", startDate: T.addDays(T.todayIso(), 40), city: "Lisbon" }))
            var e = app.evNow()
            e.guests.push({ id: "g1", name: "Ana Costa", company: "Example Co", group: "VIP", invited: true, rsvp: "Yes", dietary: "Vegetarian", table: "1", host: "", notes: "" })
            e.guests.push({ id: "g2", name: "Sam Lee", company: "Example Co", group: "Client", invited: true, rsvp: "Pending", dietary: "", table: "", host: "", notes: "" })
            app.touch(app.cur); app.bump()
            app.mod = "guests"
        }],
        [500, function () {
            ok("corporate has guests and approvals", app.evNow().modules.indexOf("guests") >= 0 && app.evNow().modules.indexOf("stakeholders") >= 0)
            probe.shot("11-corporate-guests")
        }],
        [100, function () {
            app.createEvent(T.newEvent({ format: "experience", name: "Pop-up Tour", startDate: T.addDays(T.todayIso(), 50), city: "Porto" }))
            app.mod = "journey"
        }],
        [500, function () {
            ok("experience has journey, staffing, tour", ["journey", "staffing", "tour", "measurement", "inventory"].every(function (m) { return app.evNow().modules.indexOf(m) >= 0 }))
            probe.shot("12-experience-journey")
        }],
        [100, function () { app.mod = "brief" }],
        [500, function () {
            probe.shot("13-brief")
            app.setEventField("format", "conference")
            ok("switching format adds that format's modules", app.evNow().modules.indexOf("cfp") >= 0 && app.evNow().modules.indexOf("journey") >= 0)
        }],
        [100, function () { app.hideModule("expo") }],
        [300, function () {
            ok("hide module removes it from the list", app.evNow().modules.indexOf("expo") < 0)
            app.addModule("expo")
            ok("add module puts it back", app.evNow().modules.indexOf("expo") >= 0)
        }],
        [100, function () { app.openBackup() }],
        [400, function () {
            ok("backup contains every event", app.backupText.indexOf("production-office/1") >= 0 && JSON.parse(app.backupText).events && Object.keys(JSON.parse(app.backupText).events).length === 4)
            probe.shot("14-backup")
            runner.backup = app.backupText
        }],
        [1100, function () {
            var id = app.cur
            app.deleteEvent(id)
        }],
        [400, function () {
            ok("delete event removes it from the backend", probe.count() === 3, probe.count())
            app.restore(runner.backup)
        }],
        [600, function () {
            ok("restore brings it back", probe.count() === 4, probe.count())
            app.load()
        }],
        [500, function () {
            ok("reload lists every stored event", app.order.length === 4, app.order.length)
            app.cur = runner.firstId; app.mod = "overview"; app.panel = ""; app.bump()
        }],
        [400, function () { probe.shot("15-reloaded-overview") }],

        // ── the six newer formats ──
        [100, function () { runner.newFormat("hackathon", "Frontier Hack", ["tracks", "teams", "judging", "prizes", "mentors"], "judging") }],
        [100, function () {
            var e = app.evNow()
            e.teams.push({ id: "t1", team: "Relay Ravens", members: "4", track: "Messaging", project: "p2p tickets", repo: "", status: "Submitted" })
            e.scores.push({ id: "s1", team: "Relay Ravens", judge: "Judge A", innovation: "5", technical: "4", impact: "4", presentation: "3", notes: "" })
            app.touch(app.cur); app.bump()
        }],
        [500, function () {
            ok("hackathon: score total computed", T.calcText(app.evNow(), T.tableOf(app.evNow(), "scores").cols[6], app.evNow().scores[0]) === "16")
            probe.shot("20-hackathon-judging")
        }],
        [100, function () { runner.newFormat("virtual", "Build the Parallel Online", ["streaming", "timezones", "engagement", "vod"], "timezones") }],
        [100, function () {
            app.evNow().tzSessions.push({ id: "z1", session: "Opening keynote", speaker: "Host", day: app.evNow().startDate, utc: "16:00", dur: "30" })
            app.touch(app.cur); app.bump()
        }],
        [500, function () {
            ok("virtual: local times computed", T.tzLine(app.evNow().tzSessions[0]).indexOf("NYC 11:00") >= 0)
            probe.shot("21-virtual-timezones")
        }],
        [100, function () { runner.newFormat("residency", "Village Residency", ["participants", "accommodation", "meals", "daily", "house"], "accommodation") }],
        [500, function () { probe.shot("22-residency-rooms") }],
        [100, function () { runner.newFormat("touring", "Camino Walk", ["route", "transport", "lodging", "roster", "crew"], "route") }],
        [100, function () {
            var e = app.evNow()
            e.stages.push({ id: "st1", day: e.startDate, stage: "1", from: "Porto", to: "Vila do Conde", km: "27", climb: "180", hours: "7", guide: "", status: "Not started" })
            e.stages.push({ id: "st2", day: T.addDays(e.startDate, 1), stage: "2", from: "Vila do Conde", to: "Esposende", km: "24", climb: "120", hours: "6", guide: "", status: "Not started" })
            e.roster.push({ id: "r1", name: "Walker One", role: "Walker", phone: "", emergencyName: "", emergencyPhone: "", notes: "", insured: false, waiver: false })
            app.touch(app.cur); app.bump()
        }],
        [500, function () {
            ok("touring: route total", T.columnTotal(app.evNow(), "stages", "km").value === 51)
            ok("touring: flags a missing emergency contact", T.overviewStats(app.evNow()).some(function (s) { return s.label === "On the roster" && s.bad }))
            probe.shot("23-touring-route")
        }],
        [100, function () { runner.newFormat("community", "Salon Series", ["sessions", "members", "venuePartners"], "sessions") }],
        [500, function () { probe.shot("24-community-sessions") }],
        [100, function () { runner.newFormat("fundraising", "Benefit Night", ["donors", "auction", "donations", "impact"], "donors") }],
        [100, function () {
            var e = app.evNow()
            e.donors.push({ id: "d1", donor: "Example Foundation", type: "Foundation", ask: "20000", pledged: "15000", received: "10000", stage: "Pledged", thanked: false, owner: "" })
            app.touch(app.cur); app.bump()
        }],
        [500, function () {
            ok("fundraising: raised figure", T.overviewStats(app.evNow()).some(function (s) { return s.label === "Raised" && s.value === "€10,000" }))
            probe.shot("25-fundraising-donors")
        }],

        // ── custom module builder ──
        [100, function () { app.openBuilder("") }],
        [400, function () {
            ok("builder opens with starter columns", app.panel === "builder" && app.builder.rows.length === 4)
            app.builder.title = "Volunteer shifts"
            app.builder.lead = "Who covers which shift"
            app.builderAddRow()
            app.builderSet(4, "label", "Hours", false); app.builderSet(4, "type", "num", true)
            app.builderAddRow()
            app.builderSet(5, "label", "Shirt size", false); app.builderSet(5, "type", "select", true); app.builderSet(5, "options", "S, M, L, XL", false)
        }],
        [400, function () { probe.shot("26-builder") }],
        [100, function () {
            app.saveBuilder()
            var e = app.evNow()
            runner.customId = app.mod
            ok("custom module saved and opened", T.isCustom(app.mod) && e.modules.indexOf(app.mod) >= 0 && T.customDef(e, app.mod).cols.length === 6)
            app.addRow(app.mod); app.addRow(app.mod)
            var rows = e[runner.customId]
            app.setCell(runner.customId, rows[0].id, "item", "Bar shift"); app.setCell(runner.customId, rows[0].id, "hours", "4")
            app.setCell(runner.customId, rows[1].id, "item", "Door shift"); app.setCell(runner.customId, rows[1].id, "hours", "3")
            app.setCell(runner.customId, rows[1].id, "status", "Done")
        }],
        [1100, function () {
            var e = app.evNow()
            ok("custom module totals its number column", T.columnTotal(e, runner.customId, "hours").value === 7)
            ok("custom module counts progress from status", T.modCount(e, runner.customId) === "1/2")
            ok("custom module and rows reach the backend", runner.stored()[app.cur] && runner.stored()[app.cur][runner.customId].length === 2 && runner.stored()[app.cur].custom.length === 1)
            probe.shot("27-custom-module")
            app.openBuilder(runner.customId)
        }],
        [300, function () {
            ok("editing loads the module's columns", app.builder.rows.length === 6 && app.builder.rows[5].options === "S, M, L, XL")
            app.builderAddRow(); app.builderSet(6, "label", "Notes", false); app.builderSet(6, "type", "long", true)
            app.saveBuilder()
            ok("edit adds a column and keeps rows", T.customDef(app.evNow(), runner.customId).cols.length === 7 && app.evNow()[runner.customId].length === 2)
        }],
        [300, function () {
            app.createEvent(T.newEvent({ format: "festival", name: "Second Festival", startDate: T.addDays(T.todayIso(), 120) }))
            var lib = T.customLibrary(app.events, app.evNow())
            ok("other events offer the custom module", lib.length === 1 && lib[0].title === "Volunteer shifts")
            app.copyLibraryModule(lib[0])
            ok("copying brings its columns, not its rows", T.isCustom(app.mod) && app.evNow()[app.mod].length === 0 && T.customDef(app.evNow(), app.mod).cols.length === 7)
            app.mod = "overview"
        }],
        [500, function () { probe.shot("28-overview-with-custom") }],
        [100, function () {
            var e = app.evNow(), id = e.custom[0].id
            app.openBuilder(id)
            app.deleteCustomModule(id)
            ok("first delete click only arms", T.customDef(app.evNow(), id) !== null)
            app.deleteCustomModule(id)
            ok("second delete click removes the custom module", T.customDef(app.evNow(), id) === null && app.evNow().modules.indexOf(id) < 0)
        }],
        [1100, function () { ok("all events still stored", probe.count() === 11, probe.count()) }],

        // ── Intersect Archive + showreel ──
        [100, function () {
            app.cur = runner.firstId; app.panel = ""; app.mod = "vendors"; app.bump()
            app.addFiles([probe.fixture("tech-rider.pdf"), probe.fixture("site-plan.png")], "vendors")
        }],
        [500, function () {
            ok("archive: files added through the backend", app.archive.length === 2 && app.archiveFor("vendors").length === 2, app.archive.length)
            ok("archive: first add connects Logos Storage", app.storageState === 2)
            probe.shot("30-vendors-files")
            app.addFiles([probe.fixture("recap.mp4")], "programme")
        }],
        [500, function () {
            ok("archive: stored on Logos Storage after connecting", app.archive.filter(function (x) { return x.name === "recap.mp4" })[0].cid !== "")
            app.mod = "archive"
        }],
        [500, function () {
            ok("archive: grouped by module", T.archiveGroups(app.evNow(), app.eventArchive()).length === 2)
            probe.shot("31-archive")
            var f = app.archive[0]
            app.updateFile(f.id, "general", "Signed copy")
        }],
        [400, function () {
            ok("archive: refile and note saved", app.archive[0].module === "general" && app.archive[0].note === "Signed copy")
            app.mod = "showreel"
        }],
        [500, function () {
            ok("showreel: archived video in the carousel", app.eventVideos().length === 1)
            probe.shot("32-showreel")
            var id = app.archive[1].id
            app.removeFile(id)
            ok("archive: first delete click only arms", app.archive.length === 3)
            app.removeFile(id)
        }],
        [400, function () {
            ok("archive: second click deletes", app.archive.length === 2)
            app.goHome()
        }],
        [600, function () {
            ok("home: back on Home", app.panel === "home")
            probe.shot("33-home")
        }],
        [100, function () { app.deleteEvent(runner.firstId) }],
        [500, function () { ok("deleting an event removes its files", app.archive.filter(function (x) { return x.eventId === runner.firstId }).length === 0) }]
    ]
    property string customId: ""
    function newFormat(fmt, name, mods, open) {
        app.createEvent(T.newEvent({ format: fmt, name: name, startDate: T.addDays(T.todayIso(), 60), city: "Lisbon" }))
        var e = app.evNow()
        ok(fmt + ": has its modules", mods.every(function (m) { return e.modules.indexOf(m) >= 0 }), mods.filter(function (m) { return e.modules.indexOf(m) < 0 }).join(","))
        ok(fmt + ": has its own milestones", e.milestones.some(function (m) { return m.applies.split(" ").indexOf(fmt) >= 0 }))
        app.mod = open
    }
    property int savesBefore: 0
    property int rowsBefore: 0
    property string backup: ""

    Timer {
        id: tick
        interval: runner.steps[0][0]
        running: runner.app !== null
        onTriggered: {
            if (runner.i >= runner.steps.length) { probe.done(); return }
            var s = runner.steps[runner.i]
            runner.i++
            try { s[1]() } catch (e) { runner.ok("step " + runner.i + " ran", false, e) }
            interval = runner.i < runner.steps.length ? runner.steps[runner.i][0] : 200
            restart()
        }
    }
}
