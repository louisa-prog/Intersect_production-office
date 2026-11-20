import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "templates.js" as T

// INTERSECT production office — the Basecamp view.
//
// All event logic and schemas live in templates.js. This file renders them and
// talks to the C++ backend (production_office.rep) through the typed replica:
// listEvents / saveEvent / deleteEvent / exportAll / importAll.
//
// Re-render model: `rev` bumps on structural changes (event switched, row added
// or deleted, module toggled) and rebuilds table rows; `calc` bumps on every
// value change and refreshes only computed figures (totals, scores, overview),
// so typing in a cell never rebuilds the field you are typing in.
Item {
    id: root
    implicitWidth: 1200
    implicitHeight: 800

    // ── palette: production office, dark; gaffa-tape yellow marks attention ──
    // ── INTERSECT palette: White ECE9E9 · Black 1D2121 · Grey CECECE, with
    //    Volt for action, Lean for selection, Heat only for alarms ──
    readonly property color cBg: "#FFFFFF"
    readonly property color cSurface: "#FFFFFF"
    readonly property color cSide: "#ECE9E9"
    readonly property color cSunk: "#F6F4F4"
    readonly property color cInk: "#1D2121"
    readonly property color cMuted: "#5C6262"
    readonly property color cLine: "#CECECE"
    readonly property color cRule: "#E4E2E2"
    readonly property color cVolt: "#B9ED00"
    readonly property color cVoltSoft: "#EFFAC7"
    readonly property color cLean: "#7182CB"
    readonly property color cGaffa: cLean            // focus and selection
    readonly property color cGaffaSoft: "#E7EAF7"
    readonly property color cGood: "#3E5200"
    readonly property color cGoodSoft: "#EFFAC7"
    readonly property color cWarn: "#1D2121"
    readonly property color cWarnSoft: "#ECE9E9"
    readonly property color cBad: "#B5420A"
    readonly property color cBadSoft: "#FFE8DC"
    readonly property color cHeat: "#FF6716"
    readonly property color cInfo: "#3A4994"
    readonly property color cInfoSoft: "#E7EAF7"
    // ── type: Space Grotesk and Space Mono, bundled in fonts/ ──
    FontLoader { id: fG4; source: "fonts/SpaceGrotesk_400Regular.ttf" }
    FontLoader { id: fG5; source: "fonts/SpaceGrotesk_500Medium.ttf" }
    FontLoader { id: fG6; source: "fonts/SpaceGrotesk_600SemiBold.ttf" }
    FontLoader { id: fG7; source: "fonts/SpaceGrotesk_700Bold.ttf" }
    FontLoader { id: fM4; source: "fonts/SpaceMono_400Regular.ttf" }
    FontLoader { id: fM7; source: "fonts/SpaceMono_700Bold.ttf" }
    readonly property string uiFont: fG4.status === FontLoader.Ready ? fG4.name : "Helvetica"
    readonly property string monoFont: fM4.status === FontLoader.Ready ? fM4.name : (Qt.platform.os === "osx" ? "Menlo" : "monospace")

    // ── backend bridge ──
    readonly property bool hasBridge: typeof logos !== "undefined" && logos !== null
    readonly property var backend: hasBridge && logos.module ? logos.module("production_office") : null
    property bool ready: false
    property bool loaded: false
    property bool preview: false
    readonly property string backendStatus: backend && ready ? String(backend.status) : ""
    readonly property string storagePath: backend && ready ? String(backend.storagePath) : ""

    // ── state ──
    property var events: ({})
    property var order: []
    property string cur: ""
    property string mod: "overview"
    property bool creating: false
    property string panel: "home"
    property int rev: 0
    property int calc: 0
    property string newFmt: "festival"
    property string armed: ""
    property var dirty: ({})
    property string note: ""
    property string backupText: ""
    property var builder: ({ id: "", title: "", lead: "", rows: [] })
    property int builderRev: 0
    // ── Intersect Archive + showreels ──
    property var archive: []
    property var reelIdx: ({})
    property string archMod: "general"
    property string addPath: ""
    readonly property int storageState: backend && ready ? Number(backend.storageState) : 0
    readonly property string storageNote: backend && ready ? String(backend.storageNote) : ""

    Rectangle { anchors.fill: parent; color: root.cBg }

    Connections {
        target: root.backend
        ignoreUnknownSignals: true
        function onArchiveRevisionChanged() { root.loadArchive() }
    }
    Loader {
        id: picker
        source: "FilePicker.qml"
        onLoaded: {
            item.picked.connect(function (urls) { root.addFiles(urls, root.pickMod, root.pickEvent) })
            item.savePicked.connect(function (u) {
                if (root.preview || !root.ready) return
                watch(backend.archiveExport(root.exportId, String(u)), function (ok) { root.note = ok ? "Saved a copy." : root.backendStatus })
            })
        }
    }
    property string pickMod: "general"
    property string pickEvent: ""
    function pickFiles(mod, eventId) {
        root.pickMod = mod; root.pickEvent = eventId || root.cur
        if (picker.item) picker.item.open()
        else root.note = "Paste a file path into the field and press Add."
    }

    Connections {
        target: root.hasBridge ? logos : null
        ignoreUnknownSignals: true
        function onViewModuleReadyChanged(moduleName, isReady) {
            if (moduleName === "production_office")
                root.ready = isReady && root.backend !== null
        }
    }
    Component.onCompleted: {
        root.ready = root.backend !== null && root.hasBridge && logos.isViewModuleReady
                     && logos.isViewModuleReady("production_office")
        previewTimer.start()
    }
    onReadyChanged: if (ready) load()

    // If no backend answers, open a preview with an example so the view still works.
    Timer {
        id: previewTimer
        interval: 8000
        onTriggered: if (!root.loaded) root.startPreview()
    }
    // Success notes clear themselves; errors stay until dismissed.
    onNoteChanged: if (note !== "" && note.indexOf("Not saved") !== 0 && note.indexOf("Couldn") !== 0) noteTimer.restart()
    Timer { id: noteTimer; interval: 6000; onTriggered: root.note = "" }
    Timer {
        id: saveTimer
        interval: 700
        onTriggered: root.flush()
    }

    // ── data plumbing ──
    function parse(v) {
        if (typeof v !== "string") return v
        try {
            var x = JSON.parse(v)
            if (typeof x === "string") x = JSON.parse(x)
            return x
        } catch (e) { return null }
    }
    function watch(pending, ok, fail) {
        logos.watch(pending, function (v) { if (ok) ok(v) },
                    function (e) { if (fail) fail(e); else root.note = "Backend error: " + e })
    }
    function goHome() { root.panel = "home"; root.creating = false; root.armed = ""; mainFlick.contentY = 0 }

    // ── archive ──
    function archiveFor(mod) { return T.archiveFor(root.archive.filter(function (x) { return x.eventId === root.cur }), mod) }
    function eventArchive() { return root.archive.filter(function (x) { return x.eventId === root.cur }) }
    function portfolio() {
        var built = T.SHOWCASE.map(function (d) { return { title: d.title, caption: d.caption, url: Qt.resolvedUrl("media/" + d.file), poster: Qt.resolvedUrl("media/" + d.poster) } })
        var added = T.archiveVideos(root.archive.filter(function (x) { return x.eventId === "_portfolio" }))
            .map(function (v) { return { title: v.name.replace(/\.[^.]+$/, ""), caption: v.note || "Added from the archive", url: v.url, poster: "" } })
        return built.concat(added)
    }
    function eventVideos() {
        var e = evNow()
        return T.archiveVideos(eventArchive()).map(function (v) {
            return { title: v.name.replace(/\.[^.]+$/, ""), caption: (v.note ? v.note + " · " : "") + (v.module === "general" ? "General" : T.moduleTitle(e, v.module)), url: v.url, poster: "" }
        })
    }
    function loadArchive() {
        if (root.preview || !root.ready) return
        watch(backend.archiveList(""), function (v) { root.archive = parse(v) || [] })
    }
    function addFiles(urls, mod, eventId) {
        var list = (typeof urls === "string") ? [urls] : urls
        var ev = eventId || root.cur
        for (var i = 0; i < list.length; i++) {
            var u = String(list[i]).trim()
            if (!u) continue
            if (root.preview || !root.ready) {
                var name = decodeURIComponent(u.split("/").pop())
                var a = root.archive.slice()
                a.push({ id: T.rid(), eventId: ev, module: mod, name: name, size: 0, type: "", addedAt: new Date().toISOString(), note: "", url: u.indexOf("file:") === 0 ? u : "file://" + u, cid: "" })
                root.archive = a
                continue
            }
            watch(backend.archiveAdd(ev, mod, u, ""), function (item) {
                if (!item) root.note = "Not added. " + root.backendStatus
            })
        }
        if (!root.preview && root.ready && root.storageState === 0) backend.storageConnect()
    }
    function updateFile(id, mod, note) {
        if (root.preview || !root.ready) {
            root.archive = root.archive.map(function (x) { if (x.id === id) { x.module = mod; x.note = note } return x })
            return
        }
        backend.archiveUpdate(id, mod, note)
    }
    function removeFile(id) {
        if (root.armed !== "f" + id) { root.armed = "f" + id; return }
        root.armed = ""
        if (root.preview || !root.ready) { root.archive = root.archive.filter(function (x) { return x.id !== id }); return }
        watch(backend.archiveRemove(id), null)
    }
    function openFile(f) { if (f.url) Qt.openUrlExternally(f.url) }
    property string exportId: ""
    function exportFile(f) {
        root.exportId = f.id
        if (picker.item) picker.item.saveAs(f.name)
        else root.note = "Saving needs Qt's file dialogs. The file is in your archive folder: " + root.storagePath.replace("events.json", "archive")
    }

    function load() {
        watch(backend.listEvents(), function (v) {
            var arr = parse(v) || []
            var evs = {}, ord = []
            for (var i = 0; i < arr.length; i++) {
                if (!arr[i] || !arr[i].id || !arr[i].data) continue
                evs[arr[i].id] = T.normalise(arr[i].data)
                ord.push(arr[i].id)
            }
            root.events = evs
            root.order = ord
            root.loaded = true
            root.loadArchive()
            root.preview = false
            if (!evs[root.cur]) { var s = sortedIds(); root.cur = s.length ? s[0] : "" }
            bump()
        }, function (e) { root.note = "Couldn't load events: " + e })
    }
    function startPreview() {
        var e = T.exampleEvent()
        var evs = {}
        evs["ev-preview"] = e
        root.events = evs
        root.order = ["ev-preview"]
        root.cur = "ev-preview"
        root.preview = true
        root.loaded = true
        bump()
    }
    function evNow() { return root.cur && root.events[root.cur] ? root.events[root.cur] : null }
    function sortedIds() {
        var evs = root.events
        return root.order.slice().sort(function (a, b) {
            return ((evs[a] && evs[a].startDate) || "9").localeCompare((evs[b] && evs[b].startDate) || "9")
        })
    }
    function bump() {
        var y = mainFlick.contentY
        root.rev++
        root.calc++
        Qt.callLater(function () {
            mainFlick.contentY = Math.max(0, Math.min(y, mainFlick.contentHeight - mainFlick.height))
        })
    }
    function touch(id) {
        var d = root.dirty
        d[id] = true
        root.dirty = d
        if (root.events[id]) root.events[id].updatedAt = new Date().toISOString()
        root.calc++
        saveTimer.restart()
    }
    function flush() {
        var d = root.dirty
        root.dirty = ({})
        if (root.preview || !root.ready) return
        for (var id in d) {
            var e = root.events[id]
            if (e) saveOne(id, JSON.stringify(e))
        }
    }

    function saveOne(eid, json) {
        watch(backend.saveEvent(eid, json), function (ok) {
            if (ok === false) root.note = "Not saved. " + root.backendStatus
            else if (root.note.indexOf("Not saved") === 0) root.note = ""
        }, function (err) { root.note = "Not saved: " + err })
    }

    // ── edits ──
    function rowIndex(key, rowId) {
        var e = evNow()
        if (!e || !e[key]) return -1
        for (var i = 0; i < e[key].length; i++) if (e[key][i].id === rowId) return i
        return -1
    }
    function rowById(key, rowId) {
        var i = rowIndex(key, rowId)
        return i < 0 ? null : evNow()[key][i]
    }
    function setCell(key, rowId, col, val) {
        var i = rowIndex(key, rowId)
        if (i < 0) return
        evNow()[key][i][col] = val
        touch(root.cur)
    }
    function setEventField(k, v) {
        var e = evNow()
        if (!e) return
        e[k] = v
        if (k === "format" && T.FORMAT_MODULES[v]) {
            var mods = e.modules.slice()
            T.FORMAT_MODULES[v].forEach(function (m) { if (mods.indexOf(m) < 0) mods.push(m) })
            mods.sort(T.modSort)
            e.modules = mods
            touch(root.cur)
            bump()
            return
        }
        touch(root.cur)
    }
    function setBriefField(k, v) {
        var e = evNow()
        if (!e) return
        e.brief[k] = v
        touch(root.cur)
    }
    function addRow(key) {
        var e = evNow()
        e[key].push(T.blankRow(key, e))
        touch(root.cur)
        bump()
    }
    function deleteRow(key, rowId) {
        if (root.armed !== key + rowId) { root.armed = key + rowId; return }
        root.armed = ""
        var e = evNow()
        e[key] = e[key].filter(function (r) { return r.id !== rowId })
        touch(root.cur)
        bump()
    }
    function addModule(m) {
        var e = evNow()
        var mods = e.modules.concat([m])
        mods.sort(T.modSort)
        e.modules = mods
        root.mod = m
        touch(root.cur)
        bump()
    }
    function hideModule(m) {
        var e = evNow()
        e.modules = e.modules.filter(function (x) { return x !== m })
        root.mod = "overview"
        touch(root.cur)
        bump()
        root.note = "Module hidden. Its data is kept; add it back from the Overview."
    }
    function createEvent(data) {
        var id = "ev-" + T.rid()
        var evs = root.events
        evs[id] = data
        root.events = evs
        root.order = root.order.concat([id])
        root.cur = id
        root.mod = "overview"
        root.creating = false
        root.panel = ""
        touch(id)
        flush()
        bump()
    }
    function deleteEvent(id) {
        root.armed = ""
        // Files belong to the event: remove them from the vault and Logos Storage too.
        if (!root.preview && root.ready) backend.archiveRemoveEvent(id)
        else root.archive = root.archive.filter(function (x) { return x.eventId !== id })
        if (!root.preview && root.ready)
            watch(backend.deleteEvent(id), null, function (e) { root.note = "Couldn't delete: " + e })
        var evs = root.events
        delete evs[id]
        root.events = evs
        root.order = root.order.filter(function (x) { return x !== id })
        var s = sortedIds()
        root.cur = s.length ? s[0] : ""
        root.mod = "overview"
        bump()
        root.note = "Event deleted."
    }
    // ── custom modules ──
    function openBuilder(id) {
        var e = evNow()
        var def = id ? T.customDef(e, id) : null
        root.builder = def ? { id: id, title: def.title, lead: def.lead || "", rows: T.builderRows(def.cols) }
                           : { id: "", title: "", lead: "", rows: [{ label: "Item", type: "text" }, { label: "Owner", type: "text" },
                                                                   { label: "Due", type: "date" }, { label: "Status", type: "status" }] }
        root.armed = ""
        root.builderRev++
        root.panel = "builder"
        mainFlick.contentY = 0
    }
    function builderSet(i, field, value, structural) {
        root.builder.rows[i][field] = value
        if (structural) root.builderRev++
    }
    function builderAddRow() { root.builder.rows.push({ label: "", type: "text", options: "" }); root.builderRev++ }
    function builderRemoveRow(i) { root.builder.rows.splice(i, 1); root.builderRev++ }
    function builderMove(i, d) {
        var r = root.builder.rows, j = i + d
        if (j < 0 || j >= r.length) return
        var t = r[i]; r[i] = r[j]; r[j] = t
        root.builderRev++
    }
    function saveBuilder() {
        var b = root.builder, e = evNow()
        if (!String(b.title || "").trim()) { root.note = "Give the module a name first."; return }
        if (!b.rows.some(function (r) { return String(r.label || "").trim() })) { root.note = "Add at least one column with a name."; return }
        var id = b.id
        if (id) T.updateCustomModule(e, id, b.title, b.lead, b.rows)
        else id = T.addCustomModule(e, b.title, b.lead, b.rows)
        root.panel = ""
        root.mod = id
        root.note = b.id ? "Module updated." : "Module added. It's saved with this event, and you can add it to other events from their Overview."
        touch(root.cur)
        bump()
    }
    function deleteCustomModule(id) {
        if (root.armed !== "cm" + id) { root.armed = "cm" + id; return }
        root.armed = ""
        T.removeCustomModule(evNow(), id)
        root.panel = ""
        root.mod = "overview"
        touch(root.cur)
        bump()
        root.note = "Custom module deleted with its rows."
    }
    function copyLibraryModule(lib) {
        var id = T.copyCustomModule(evNow(), lib)
        root.mod = id
        touch(root.cur)
        bump()
    }

    function openBackup() {
        root.panel = "backup"
        root.creating = false
        if (root.preview || !root.ready) {
            var obj = { format: "production-office/1", events: root.events }
            root.backupText = JSON.stringify(obj, null, 2)
            return
        }
        watch(backend.exportAll(), function (v) {
            var p = parse(v)
            root.backupText = (p && typeof p === "object") ? JSON.stringify(p, null, 2) : String(v)
        })
    }
    function restore(text) {
        if (root.preview || !root.ready) { root.note = "Restoring needs the INTERSECT backend."; return }
        watch(backend.importAll(text), function (n) {
            root.note = Number(n) > 0 ? "Restored " + n + " event" + (Number(n) === 1 ? "" : "s") + "." : "No events found in that backup."
            if (Number(n) > 0) { root.panel = ""; load() }
        })
    }
    function colW(c) {
        var type = typeof c === "string" ? c : c[2]
        if (type === "calc" && typeof c !== "string" && c[4] === "text") return 440
        switch (type) {
        case "long": return 260
        case "text": return 170
        case "select": return 158
        case "money": return 112
        case "calc": return 112
        case "num": return 104
        case "date": return 118
        case "time": return 84
        case "check": return 78
        case "score": return 74
        case "tminus": return 150
        }
        return 160
    }
    function pillBg(v) {
        var k = T.pillKind(v)
        return k === "good" ? cGoodSoft : k === "info" ? cInfoSoft : k === "warn" ? cWarnSoft : k === "bad" ? cBadSoft : cSunk
    }
    function pillFg(v) {
        var k = T.pillKind(v)
        return k === "good" ? cGood : k === "info" ? cInfo : k === "warn" ? cWarn : k === "bad" ? cBad : cInk
    }
    function scoreBg(s) { return s >= 12 ? cBadSoft : s >= 6 ? cInfoSoft : cGoodSoft }
    function scoreFg(s) { return s >= 12 ? cBad : s >= 6 ? cInfo : cGood }

    // ═════════════════════════ reusable pieces ═════════════════════════

    component Btn: Rectangle {
        id: b
        property string label: ""
        property string kind: "plain"   // plain | primary | tape | danger
        property bool small: false
        signal clicked()
        implicitWidth: bt.implicitWidth + (small ? 18 : 26)
        implicitHeight: small ? 26 : 32
        radius: 2
        color: kind === "primary" ? root.cInk : kind === "tape" ? root.cVolt
             : (bma.containsMouse || activeFocus) ? root.cSunk : "transparent"
        border.width: kind === "primary" || kind === "tape" ? 0 : 1
        border.color: kind === "danger" ? root.cHeat : activeFocus ? root.cGaffa : root.cLine
        activeFocusOnTab: true
        Accessible.role: Accessible.Button
        Accessible.name: label
        Keys.onReturnPressed: clicked()
        Keys.onSpacePressed: clicked()
        Text { font.family: root.uiFont;
            id: bt
            anchors.centerIn: parent
            text: b.label
            color: b.kind === "primary" ? root.cBg : b.kind === "tape" ? "#15181B" : b.kind === "danger" ? root.cBad : root.cInk
            font.pixelSize: b.small ? 12 : 13
            font.weight: Font.Medium
        }
        MouseArea {
            id: bma
            anchors.fill: parent
            hoverEnabled: true
            cursorShape: Qt.PointingHandCursor
            onClicked: b.clicked()
        }
    }

    component Label2: Text {
        font.family: root.monoFont
        color: root.cMuted
        font.pixelSize: 11
        font.weight: Font.DemiBold
        font.letterSpacing: 0.8
        font.capitalization: Font.AllUppercase
    }

    component CellField: TextField { font.family: root.uiFont;
        id: tf
        property bool boxed: false
        color: root.cInk
        placeholderTextColor: Qt.rgba(0.6, 0.64, 0.66, 0.55)
        selectionColor: root.cGaffa
        selectedTextColor: "#FFFFFF"
        selectByMouse: true
        font.pixelSize: 13
        leftPadding: 7; rightPadding: 7; topPadding: 6; bottomPadding: 6
        // Show the start of long values when the field isn't being edited.
        Component.onCompleted: cursorPosition = 0
        onTextChanged: if (!activeFocus) cursorPosition = 0
        onActiveFocusChanged: if (!activeFocus) cursorPosition = 0
        background: Rectangle {
            radius: 2
            color: tf.activeFocus ? root.cSurface : (tf.boxed ? root.cBg : "transparent")
            border.width: 1
            border.color: tf.activeFocus ? root.cGaffa : (tf.boxed || tf.hovered) ? root.cLine : "transparent"
        }
    }

    component CellArea: TextArea { font.family: root.uiFont;
        id: ta
        property bool boxed: false
        color: root.cInk
        placeholderTextColor: Qt.rgba(0.6, 0.64, 0.66, 0.55)
        selectionColor: root.cGaffa
        selectedTextColor: "#FFFFFF"
        selectByMouse: true
        wrapMode: TextEdit.Wrap
        font.pixelSize: 13
        leftPadding: 7; rightPadding: 7; topPadding: 6; bottomPadding: 6
        background: Rectangle {
            radius: 2
            color: ta.activeFocus ? root.cSurface : (ta.boxed ? root.cBg : "transparent")
            border.width: 1
            border.color: ta.activeFocus ? root.cGaffa : (ta.boxed || ta.hovered) ? root.cLine : "transparent"
        }
    }

    component Combo: ComboBox {
        id: cb
        property bool pill: false
        property bool boxed: false
        font.pixelSize: 12
        implicitHeight: 30
        background: Rectangle {
            radius: cb.pill ? 15 : 4
            color: cb.pill ? root.pillBg(cb.currentText) : (cb.boxed ? root.cBg : (cb.hovered ? root.cSunk : "transparent"))
            border.width: 1
            border.color: cb.activeFocus ? root.cGaffa : (cb.boxed || cb.hovered) && !cb.pill ? root.cLine : "transparent"
        }
        contentItem: Text { font.family: root.uiFont;
            leftPadding: 9
            rightPadding: 22
            text: cb.displayText
            color: cb.pill ? root.pillFg(cb.currentText) : root.cInk
            font.pixelSize: 12
            font.weight: cb.pill ? Font.DemiBold : Font.Normal
            verticalAlignment: Text.AlignVCenter
            elide: Text.ElideRight
        }
        indicator: Text { font.family: root.uiFont;
            x: cb.width - width - 8
            anchors.verticalCenter: parent.verticalCenter
            text: "▾"
            color: root.cMuted
            font.pixelSize: 11
        }
        delegate: ItemDelegate {
            width: cb.width
            highlighted: cb.highlightedIndex === index
            contentItem: Text { font.family: root.uiFont;
                text: modelData
                color: root.cInk
                font.pixelSize: 12
                verticalAlignment: Text.AlignVCenter
            }
            background: Rectangle { color: highlighted ? root.cSunk : root.cSurface }
        }
        popup.background: Rectangle { color: root.cSurface; border.color: root.cLine; radius: 2 }
    }

    component Tile: Rectangle {
        id: tile
        property var s: ({})
        width: 212
        height: tcol.implicitHeight + 26
        radius: 2
        color: root.cSurface
        border.color: root.cLine
        ColumnLayout {
            id: tcol
            anchors { left: parent.left; right: parent.right; top: parent.top; margins: 14 }
            spacing: 6
            Label2 { text: tile.s.label || "" }
            Text { font.family: root.uiFont;
                text: tile.s.value || ""
                color: tile.s.bad ? root.cBad : root.cInk
                font.pixelSize: 24
                font.weight: Font.DemiBold
                Layout.fillWidth: true
                elide: Text.ElideRight
            }
            Rectangle {
                visible: tile.s.bar !== undefined && tile.s.bar >= 0
                Layout.fillWidth: true
                height: 6
                radius: 0
                color: root.cSunk
                Rectangle {
                    width: parent.width * Math.max(0, Math.min(1, tile.s.bar || 0))
                    height: parent.height
                    radius: 0
                    color: tile.s.bad && tile.s.label === "Against envelope" ? root.cHeat : root.cVolt
                }
            }
            Text { font.family: root.uiFont;
                text: tile.s.sub || ""
                color: tile.s.bad && tile.s.label === "Milestones" ? root.cBad : root.cMuted
                font.pixelSize: 12
                wrapMode: Text.WordWrap
                Layout.fillWidth: true
            }
        }
    }

    component Block: Rectangle {
        id: blk
        default property alias content: bcol.data
        property string title: ""
        property string lead: ""
        property string chip: ""
        property alias headerExtra: hx.data
        Layout.fillWidth: true
        implicitHeight: (blk.title !== "" ? hdr.implicitHeight + 28 : 0) + bcol.implicitHeight + 6
        radius: 2
        color: root.cSurface
        border.color: root.cLine
        RowLayout {
            id: hdr
            anchors { left: parent.left; right: parent.right; top: parent.top; margins: 16 }
            visible: blk.title !== ""
            height: visible ? implicitHeight : 0
            spacing: 12
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 3
                Text { font.family: root.uiFont; text: blk.title; color: root.cInk; font.pixelSize: 17; font.weight: Font.DemiBold; Layout.fillWidth: true }
                Text { font.family: root.uiFont;
                    visible: blk.lead !== ""
                    text: blk.lead
                    color: root.cMuted
                    font.pixelSize: 13
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }
            }
            Row { id: hx; spacing: 8 }
            Rectangle {
                visible: blk.chip !== ""
                radius: 10
                color: root.cSunk
                implicitWidth: chipT.implicitWidth + 16
                implicitHeight: 20
                Text { font.family: root.uiFont; id: chipT; anchors.centerIn: parent; text: blk.chip; color: root.cMuted; font.pixelSize: 11; font.weight: Font.DemiBold }
            }
        }
        ColumnLayout {
            id: bcol
            anchors { left: parent.left; right: parent.right; top: hdr.bottom; topMargin: blk.title !== "" ? 12 : 0 }
            spacing: 0
        }
    }

    // ═════════════════════════ table cells ═════════════════════════
    // Each cell Loader carries tkey / rowId / col / val; the loaded item reads them via `parent`.

    Component {
        id: cellText
        CellField {
            id: cf
            readonly property var cl: parent
            text: cl ? String(cl.val === undefined || cl.val === null ? "" : cl.val) : ""
            horizontalAlignment: cl && (cl.col[2] === "num" || cl.col[2] === "money") ? TextInput.AlignRight : TextInput.AlignLeft
            font.family: cl && (cl.col[2] === "num" || cl.col[2] === "money" || cl.col[2] === "date" || cl.col[2] === "time") ? root.monoFont : root.uiFont
            placeholderText: cl ? (cl.col[2] === "date" ? "YYYY-MM-DD" : cl.col[2] === "time" ? "HH:MM" : "") : ""
            inputMethodHints: cl && (cl.col[2] === "num" || cl.col[2] === "money") ? Qt.ImhFormattedNumbersOnly : Qt.ImhNone
            validator: RegularExpressionValidator {
                regularExpression: !cf.cl ? /.*/
                    : cf.cl.col[2] === "date" ? /^\d{0,4}(-\d{0,2}(-\d{0,2})?)?$/
                    : cf.cl.col[2] === "time" ? /^\d{0,2}(:\d{0,2})?$/
                    : (cf.cl.col[2] === "num" || cf.cl.col[2] === "money") ? /^-?[\d,]*\.?\d*$/
                    : /.*/
            }
            Accessible.name: cl ? cl.col[1] : ""
            onTextEdited: if (cl) root.setCell(cl.tkey, cl.rowId, cl.col[0], text)
        }
    }
    Component {
        id: cellLong
        CellArea {
            readonly property var cl: parent
            text: cl ? String(cl.val === undefined || cl.val === null ? "" : cl.val) : ""
            Accessible.name: cl ? cl.col[1] : ""
            onTextChanged: if (cl && activeFocus) root.setCell(cl.tkey, cl.rowId, cl.col[0], text)
        }
    }
    Component {
        id: cellSelect
        Combo {
            readonly property var cl: parent
            model: cl ? cl.col[3] : []
            pill: cl ? T.isPill(cl.col) : false
            currentIndex: cl ? cl.col[3].indexOf(String(cl.val)) : -1
            displayText: currentIndex < 0 ? "—" : currentText
            Accessible.name: cl ? cl.col[1] : ""
            onActivated: if (cl) root.setCell(cl.tkey, cl.rowId, cl.col[0], currentText)
        }
    }
    Component {
        id: cellCheck
        Item {
            readonly property var cl: parent
            implicitHeight: 30
            CheckBox {
                id: chk
                anchors.centerIn: parent
                checked: parent.cl ? !!parent.cl.val : false
                Accessible.name: parent.cl ? parent.cl.col[1] : ""
                indicator: Rectangle {
                    implicitWidth: 18; implicitHeight: 18
                    x: chk.leftPadding
                    y: (chk.height - height) / 2
                    radius: 2
                    color: chk.checked ? root.cInk : "transparent"
                    border.color: chk.checked ? root.cInk : chk.activeFocus ? root.cGaffa : root.cMuted
                    Text { font.family: root.uiFont; anchors.centerIn: parent; text: "✓"; visible: chk.checked; color: root.cBg; font.pixelSize: 12; font.weight: Font.Bold }
                }
                onToggled: if (parent.cl) root.setCell(parent.cl.tkey, parent.cl.rowId, parent.cl.col[0], checked)
            }
        }
    }
    Component {
        id: cellScore
        Item {
            readonly property var cl: parent
            implicitHeight: 30
            readonly property int s: { root.calc; var r = cl ? root.rowById(cl.tkey, cl.rowId) : null; return r ? T.riskScore(r) : 0 }
            Rectangle {
                anchors.centerIn: parent
                width: 44; height: 24; radius: 2
                color: root.scoreBg(parent.s)
                Text { anchors.centerIn: parent; text: parent.parent.s || "–"; color: root.scoreFg(parent.parent.s); font.family: root.monoFont; font.pixelSize: 13; font.weight: Font.DemiBold }
            }
        }
    }
    Component {
        id: cellCalc
        Item {
            readonly property var cl: parent
            implicitHeight: 30
            Text {
                readonly property bool isText: parent.cl && parent.cl.col[4] === "text"
                anchors.verticalCenter: parent.verticalCenter
                x: isText ? 7 : parent.width - width - 8
                text: { root.calc; var e = root.evNow(); var r = parent.cl ? root.rowById(parent.cl.tkey, parent.cl.rowId) : null; return r && e ? T.calcText(e, parent.cl.col, r) : "" }
                color: root.cInk
                font.family: root.monoFont
                font.pixelSize: 13
            }
        }
    }
    Component {
        id: cellTminus
        RowLayout {
            readonly property var cl: parent
            spacing: 4
            Text { text: "T"; color: root.cMuted; font.family: root.monoFont; font.pixelSize: 12 }
            CellField {
                Layout.preferredWidth: 52
                text: parent.cl ? String(parent.cl.val) : ""
                horizontalAlignment: TextInput.AlignRight
                font.family: root.monoFont
                validator: RegularExpressionValidator { regularExpression: /^-?\d{0,3}$/ }
                ToolTip.visible: hovered
                ToolTip.text: "Weeks before show day; negative for after"
                Accessible.name: "Weeks before show day"
                onTextEdited: if (parent.cl) root.setCell(parent.cl.tkey, parent.cl.rowId, "t", text === "" || text === "-" ? 0 : Number(text))
            }
            Text {
                readonly property var info: {
                    root.calc
                    var e = root.evNow(), r = parent.cl ? root.rowById(parent.cl.tkey, parent.cl.rowId) : null
                    if (!e || !r || !e.startDate) return { t: "", late: false }
                    var d = T.dueOf(e, r)
                    return { t: T.shortDate(d), late: T.dayDiff(d) < 0 && r.status !== "Done" }
                }
                text: info.t
                color: info.late ? root.cBad : root.cMuted
                font.family: root.monoFont
                font.pixelSize: 12
            }
        }
    }

    // ═════════════════════════ section components ═════════════════════════

    Component {
        id: tableSection
        Block {
            id: tb
            property string tkey: ""
            readonly property var spec: { root.rev; return T.tableOf(root.evNow(), tkey) || ({ t: "", lead: "", cols: [] }) }
            readonly property var rowsList: { root.rev; return T.sortedRows(root.evNow(), tkey) }
            readonly property int tableWidth: {
                var w = 44
                for (var i = 0; i < spec.cols.length; i++) w += root.colW(spec.cols[i])
                return w
            }
            title: spec.t
            lead: spec.lead || ""
            chip: rowsList.length + (rowsList.length === 1 ? " row" : " rows")

            Rectangle { Layout.fillWidth: true; height: 1; color: root.cLine }
            Flickable {
                id: hflick
                Layout.fillWidth: true
                Layout.preferredHeight: tcolumn.implicitHeight + (hbar.visible ? 10 : 0)
                contentWidth: Math.max(width, tb.tableWidth)
                contentHeight: tcolumn.implicitHeight
                flickableDirection: Flickable.HorizontalFlick
                boundsBehavior: Flickable.StopAtBounds
                interactive: contentWidth > width
                clip: true
                ScrollBar.horizontal: ScrollBar { id: hbar; policy: hflick.contentWidth > hflick.width ? ScrollBar.AlwaysOn : ScrollBar.AlwaysOff }

                Column {
                    id: tcolumn
                    width: hflick.contentWidth
                    Rectangle {
                        width: parent.width
                        height: 32
                        color: root.cSunk
                        Row {
                            x: 6
                            anchors.verticalCenter: parent.verticalCenter
                            Repeater {
                                model: tb.spec.cols
                                Label2 {
                                    width: root.colW(modelData)
                                    leftPadding: 7
                                    text: modelData[1]
                                    horizontalAlignment: modelData[2] === "num" || modelData[2] === "money" || modelData[2] === "calc" ? Text.AlignRight : Text.AlignLeft
                                    rightPadding: 8
                                    elide: Text.ElideRight
                                }
                            }
                        }
                    }
                    Text { font.family: root.uiFont;
                        visible: tb.rowsList.length === 0
                        width: hflick.width
                        padding: 14
                        text: "Nothing here yet. Add the first row below."
                        color: root.cMuted
                        font.pixelSize: 13
                    }
                    Repeater {
                        model: tb.rowsList
                        delegate: Rectangle {
                            id: rowItem
                            property var rowData: modelData
                            width: tcolumn.width
                            height: Math.max(40, cellsRow.implicitHeight + 6)
                            color: "transparent"
                            Rectangle { anchors.bottom: parent.bottom; width: parent.width; height: 1; color: root.cLine }
                            Row {
                                id: cellsRow
                                x: 6
                                anchors.verticalCenter: parent.verticalCenter
                                Repeater {
                                    model: tb.spec.cols
                                    delegate: Loader {
                                        property string tkey: tb.tkey
                                        property string rowId: rowItem.rowData.id
                                        property var col: modelData
                                        property var val: rowItem.rowData[modelData[0]]
                                        width: root.colW(modelData)
                                        height: item ? item.implicitHeight : 30
                                        sourceComponent: {
                                            switch (modelData[2]) {
                                            case "long": return cellLong
                                            case "select": return cellSelect
                                            case "check": return cellCheck
                                            case "score": return cellScore
                                            case "calc": return cellCalc
                                            case "tminus": return cellTminus
                                            }
                                            return cellText
                                        }
                                        onLoaded: item.width = Qt.binding(function () { return width - 4 })
                                    }
                                }
                                Item {
                                    width: 40
                                    height: 30
                                    Btn {
                                        anchors.centerIn: parent
                                        small: true
                                        kind: root.armed === tb.tkey + rowItem.rowData.id ? "danger" : "plain"
                                        label: root.armed === tb.tkey + rowItem.rowData.id ? "Delete" : "×"
                                        border.color: root.armed === tb.tkey + rowItem.rowData.id ? root.cBad : "transparent"
                                        Accessible.name: "Delete row"
                                        onClicked: root.deleteRow(tb.tkey, rowItem.rowData.id)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            Rectangle { Layout.fillWidth: true; height: 1; color: root.cLine }
            RowLayout {
                Layout.fillWidth: true
                Layout.margins: 10
                spacing: 12
                Btn { small: true; label: "+ Add row"; onClicked: root.addRow(tb.tkey) }
                Item { Layout.fillWidth: true }
                Text {
                    visible: !!tb.spec.totals
                    text: {
                        root.calc
                        var e = root.evNow()
                        if (!e || !tb.spec.totals) return ""
                        return tb.spec.totals.map(function (f) {
                            var t = T.columnTotal(e, tb.tkey, f)
                            return t.label + ": " + (t.isMoney ? T.money(t.value, e.currency) : T.count(t.value))
                        }).join("   ·   ")
                    }
                    color: root.cInk
                    font.family: root.monoFont
                    font.pixelSize: 12
                }
            }
        }
    }

    Component {
        id: formField
        ColumnLayout {
            id: ff
            property string scope: ""    // ev | brief
            property var def: []
            spacing: 5
            readonly property var current: {
                root.rev
                var e = root.evNow()
                if (!e) return ""
                var v = ff.scope === "brief" ? e.brief[def[0]] : e[def[0]]
                return v === undefined || v === null ? "" : v
            }
            function commit(v) { if (ff.scope === "brief") root.setBriefField(def[0], v); else root.setEventField(def[0], v) }
            Text { font.family: root.uiFont; text: ff.def[1] || ""; color: root.cMuted; font.pixelSize: 12; font.weight: Font.Medium }
            Loader {
                Layout.fillWidth: true
                sourceComponent: ff.def[2] === "area" ? fArea : (ff.def[2] === "select" || ff.def[2] === "format") ? fSelect : fText
            }
            Component {
                id: fText
                CellField {
                    boxed: true
                    text: String(ff.current)
                    placeholderText: ff.def[2] === "date" ? "YYYY-MM-DD" : ""
                    font.family: ff.def[2] === "date" || ff.def[2] === "num" || ff.def[2] === "money" ? root.monoFont : root.uiFont
                    validator: RegularExpressionValidator {
                        regularExpression: ff.def[2] === "date" ? /^\d{0,4}(-\d{0,2}(-\d{0,2})?)?$/
                            : (ff.def[2] === "num" || ff.def[2] === "money") ? /^-?[\d,]*\.?\d*$/ : /.*/
                    }
                    Accessible.name: ff.def[1] || ""
                    onTextEdited: ff.commit(text)
                    onEditingFinished: if (ff.def[0] === "name" || ff.def[0] === "startDate" || ff.def[0] === "endDate") root.bump()
                }
            }
            Component {
                id: fArea
                CellArea {
                    boxed: true
                    text: String(ff.current)
                    implicitHeight: Math.max(72, contentHeight + 14)
                    Accessible.name: ff.def[1] || ""
                    onTextChanged: if (activeFocus) ff.commit(text)
                }
            }
            Component {
                id: fSelect
                Combo {
                    boxed: true
                    readonly property var keys: ff.def[2] === "format" ? T.FORMAT_ORDER : ff.def[3]
                    model: ff.def[2] === "format" ? T.FORMAT_ORDER.map(function (k) { return T.FORMATS[k].label }) : ff.def[3]
                    currentIndex: keys.indexOf(String(ff.current))
                    implicitHeight: 34
                    Accessible.name: ff.def[1] || ""
                    onActivated: ff.commit(keys[currentIndex])
                }
            }
        }
    }

    Component {
        id: briefSection
        ColumnLayout {
            spacing: 18
            Block {
                title: "Event details"
                lead: "No supplier is booked until this page is signed off."
                GridLayout {
                    Layout.fillWidth: true
                    Layout.margins: 16
                    columns: width > 860 ? 4 : 2
                    columnSpacing: 16
                    rowSpacing: 14
                    Repeater {
                        model: T.EVENT_FIELDS
                        Loader {
                            Layout.fillWidth: true
                            Layout.preferredWidth: 1
                            sourceComponent: formField
                            onLoaded: { item.scope = "ev"; item.def = modelData }
                        }
                    }
                }
            }
            Block {
                title: "Brief"
                lead: "Concept, audience and the commitments that never bend."
                GridLayout {
                    id: bg
                    Layout.fillWidth: true
                    Layout.margins: 16
                    columns: width > 860 ? 3 : 2
                    columnSpacing: 16
                    rowSpacing: 14
                    Repeater {
                        model: T.BRIEF_FIELDS
                        Loader {
                            Layout.fillWidth: true
                            Layout.preferredWidth: 1
                            Layout.columnSpan: modelData[3] === true ? bg.columns : 1
                            sourceComponent: formField
                            onLoaded: { item.scope = "brief"; item.def = modelData }
                        }
                    }
                }
            }
        }
    }

    Component {
        id: budgetSection
        Flow {
            spacing: 12
            Repeater {
                model: { root.calc; var e = root.evNow(); return e ? T.budgetStats(e) : [] }
                Tile { s: modelData }
            }
        }
    }

    Component {
        id: debriefSection
        Block {
            title: "Debrief notes"
            lead: "Did we hit each KPI? Where did money leak? Who do we rebook? What starts earlier next time?"
            CellArea {
                Layout.fillWidth: true
                Layout.margins: 16
                boxed: true
                implicitHeight: Math.max(140, contentHeight + 14)
                text: { root.rev; var e = root.evNow(); return e ? (e.debrief || "") : "" }
                Accessible.name: "Debrief notes"
                onTextChanged: if (activeFocus) root.setEventField("debrief", text)
            }
        }
    }

    // ═════════════════════════ views ═════════════════════════

    Component {
        id: overviewView
        ColumnLayout {
            spacing: 18
            Flow {
                Layout.fillWidth: true
                spacing: 12
                Repeater {
                    model: { root.calc; root.rev; var e = root.evNow(); return e ? T.overviewStats(e) : [] }
                    Tile { s: modelData }
                }
            }
            Block {
                title: "Next milestones"
                lead: { root.calc; var e = root.evNow(); return e && e.startDate ? "Counted back from show day, " + T.fmtDate(e.startDate) + "." : "Set a show day in the brief to date these." }
                headerExtra: [Btn { small: true; label: "Open timeline"; onClicked: { root.mod = "timeline" } }]
                Rectangle { Layout.fillWidth: true; height: 1; color: root.cLine }
                Repeater {
                    model: { root.calc; var e = root.evNow(); return e ? T.nextMilestones(e, 5) : [] }
                    delegate: Rectangle {
                        Layout.fillWidth: true
                        implicitHeight: 42
                        color: "transparent"
                        Rectangle { anchors.bottom: parent.bottom; width: parent.width; height: 1; color: root.cLine }
                        RowLayout {
                            anchors { fill: parent; leftMargin: 16; rightMargin: 16 }
                            spacing: 14
                            Text { text: modelData.t; color: root.cMuted; font.family: root.monoFont; font.pixelSize: 12; Layout.preferredWidth: 50 }
                            Text { font.family: root.uiFont;
                                text: modelData.what + (modelData.owner ? "  ·  " + modelData.owner : "")
                                color: root.cInk; font.pixelSize: 13; elide: Text.ElideRight; Layout.fillWidth: true
                            }
                            Rectangle {
                                radius: 10
                                implicitWidth: dueT.implicitWidth + 16
                                implicitHeight: 20
                                color: modelData.late ? root.cBadSoft : modelData.soon ? root.cVoltSoft : root.cSunk
                                Text { font.family: root.uiFont; id: dueT; anchors.centerIn: parent; text: modelData.due; font.pixelSize: 11; font.weight: Font.DemiBold
                                       color: modelData.late ? root.cBad : modelData.soon ? root.cGood : root.cMuted }
                            }
                        }
                    }
                }
                Text { font.family: root.uiFont;
                    visible: { root.calc; var e = root.evNow(); return !!e && T.nextMilestones(e, 1).length === 0 }
                    text: "All milestones done."
                    color: root.cMuted; font.pixelSize: 13; padding: 16
                }
                Item { implicitHeight: 6 }
            }
            Block {
                visible: { root.calc; var e = root.evNow(); return !!e && (e.risks || []).length > 0 }
                title: "Top risks"
                headerExtra: [Btn { small: true; label: "Open register"; onClicked: { root.mod = "risks" } }]
                Rectangle { Layout.fillWidth: true; height: 1; color: root.cLine }
                Repeater {
                    model: { root.calc; var e = root.evNow(); return e ? T.topRisks(e, 3) : [] }
                    delegate: Rectangle {
                        Layout.fillWidth: true
                        implicitHeight: 42
                        color: "transparent"
                        Rectangle { anchors.bottom: parent.bottom; width: parent.width; height: 1; color: root.cLine }
                        RowLayout {
                            anchors { fill: parent; leftMargin: 16; rightMargin: 16 }
                            spacing: 14
                            Rectangle {
                                width: 40; height: 24; radius: 2; color: root.scoreBg(modelData.s)
                                Text { anchors.centerIn: parent; text: modelData.s; color: root.scoreFg(modelData.s); font.family: root.monoFont; font.weight: Font.DemiBold }
                            }
                            Text { font.family: root.uiFont;
                                text: modelData.risk + (modelData.fallback ? "  ·  fallback: " + modelData.fallback : "")
                                color: root.cInk; font.pixelSize: 13; elide: Text.ElideRight; Layout.fillWidth: true
                            }
                            Text { font.family: root.uiFont; text: modelData.owner || "No owner"; color: root.cMuted; font.pixelSize: 12 }
                        }
                    }
                }
                Item { implicitHeight: 6 }
            }
            Block {
                title: "Modules"
                lead: { root.rev; var e = root.evNow(); return e ? "Switched on for this " + (T.FORMATS[e.format] ? T.FORMATS[e.format].label.toLowerCase() : "event") + ". Add any others below." : "" }
                Rectangle { Layout.fillWidth: true; height: 1; color: root.cLine }
                Flow {
                    Layout.fillWidth: true
                    Layout.margins: 16
                    spacing: 10
                    Repeater {
                        model: { root.rev; var e = root.evNow(); return e ? T.eventModules(e).filter(function (m) { return m !== "overview" }) : [] }
                        delegate: Rectangle {
                            width: 214
                            height: mc.implicitHeight + 22
                            radius: 2
                            color: mma.containsMouse ? root.cSunk : root.cBg
                            border.color: root.cLine
                            readonly property string prog: { root.calc; return T.modCount(root.evNow(), modelData) }
                            ColumnLayout {
                                id: mc
                                anchors { left: parent.left; right: parent.right; top: parent.top; margins: 11 }
                                spacing: 7
                                Text { font.family: root.uiFont; text: T.moduleTitle(root.evNow(), modelData) + (T.isCustom(modelData) ? "  ·  custom" : ""); color: root.cInk; font.pixelSize: 13; font.weight: Font.DemiBold; elide: Text.ElideRight; Layout.fillWidth: true }
                                Rectangle {
                                    visible: parent.parent.prog !== ""
                                    Layout.fillWidth: true; height: 5; radius: 0; color: root.cSunk
                                    Rectangle {
                                        height: parent.height; radius: 0; color: root.cVolt
                                        width: { var p = parent.parent.parent.prog.split("/"); return p.length === 2 && Number(p[1]) ? parent.width * Number(p[0]) / Number(p[1]) : 0 }
                                    }
                                }
                                Text { font.family: root.uiFont; text: parent.parent.prog ? parent.parent.prog + " complete" : "Open"; color: root.cMuted; font.pixelSize: 12 }
                            }
                            MouseArea { id: mma; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: root.mod = modelData }
                        }
                    }
                }
                Rectangle { Layout.fillWidth: true; height: 1; color: root.cLine; visible: addFlow.visible }
                Flow {
                    id: addFlow
                    Layout.fillWidth: true
                    Layout.margins: 14
                    spacing: 6
                    readonly property var missing: { root.rev; var e = root.evNow(); return e ? T.MOD_ORDER.filter(function (m) { return e.modules.indexOf(m) < 0 }) : [] }
                    readonly property var library: { root.rev; var e = root.evNow(); return e ? T.customLibrary(root.events, e) : [] }
                    visible: true
                    Label2 { text: "Add module"; height: 26; verticalAlignment: Text.AlignVCenter; rightPadding: 6 }
                    Btn { small: true; kind: "tape"; label: "+ Custom module"; onClicked: root.openBuilder("") }
                    Repeater {
                        model: addFlow.library
                        Btn { small: true; label: "+ " + modelData.title + " (from " + modelData.from + ")"; onClicked: root.copyLibraryModule(modelData) }
                    }
                    Repeater {
                        model: addFlow.missing
                        Btn { small: true; label: "+ " + T.MODULES[modelData].t; onClicked: root.addModule(modelData) }
                    }
                }
            }
        }
    }

    Component {
        id: moduleView
        ColumnLayout {
            spacing: 18
            Repeater {
                model: { root.cur; root.mod; root.rev; return T.sections(root.evNow(), root.mod) }
                delegate: Loader {
                    Layout.fillWidth: true
                    sourceComponent: modelData === "brief" ? briefSection
                                   : modelData === "budgetSummary" ? budgetSection
                                   : modelData === "debrief" ? debriefSection
                                   : modelData === "archive" ? archiveSection
                                   : modelData === "showreel" ? showreelSection : tableSection
                    onLoaded: if (!T.isSpecialSection(modelData)) item.tkey = modelData
                }
            }
            Loader {
                Layout.fillWidth: true
                active: root.mod !== "overview" && root.mod !== "archive" && root.mod !== "showreel"
                sourceComponent: filesBlock
                onLoaded: item.mod = root.mod
            }
            Rectangle {
                visible: root.mod === "brief"
                Layout.fillWidth: true
                implicitHeight: dz.implicitHeight + 24
                radius: 2
                color: root.cSurface
                border.color: root.cLine
                RowLayout {
                    id: dz
                    anchors { fill: parent; margins: 12 }
                    Text { font.family: root.uiFont; text: "Remove this event and all its modules."; color: root.cMuted; font.pixelSize: 13; Layout.fillWidth: true }
                    Btn { visible: root.armed !== "event"; small: true; kind: "danger"; label: "Delete event"; onClicked: root.armed = "event" }
                    Btn { visible: root.armed === "event"; small: true; kind: "danger"; label: "Delete for good"; onClicked: root.deleteEvent(root.cur) }
                    Btn { visible: root.armed === "event"; small: true; label: "Keep it"; onClicked: root.armed = "" }
                }
            }
            RowLayout {
                visible: root.mod !== "brief" && root.mod !== "archive"
                Layout.fillWidth: true
                Item { Layout.fillWidth: true }
                Btn { visible: T.isCustom(root.mod); small: true; label: "Edit columns"; onClicked: root.openBuilder(root.mod) }
                Btn { small: true; label: "Hide this module"; onClicked: root.hideModule(root.mod) }
            }
        }
    }

    Component {
        id: creatorView
        ColumnLayout {
            spacing: 16
            Text { font.family: root.uiFont;
                text: root.order.length ? "New event" : "Open your first production file"
                color: root.cInk; font.pixelSize: 30; font.weight: Font.Bold
            }
            Text { font.family: root.uiFont;
                text: "Pick a format and a show day. The template fills in milestones counted back from that date, budget lines, venue checks, risks and wrap tasks. You can switch modules on or off later."
                color: root.cMuted; font.pixelSize: 14; wrapMode: Text.WordWrap
                Layout.fillWidth: true; Layout.maximumWidth: 640
            }
            Flow {
                Layout.fillWidth: true
                spacing: 10
                Repeater {
                    model: T.FORMAT_ORDER
                    delegate: Rectangle {
                        width: 250
                        height: fc.implicitHeight + 24
                        radius: 2
                        color: root.newFmt === modelData ? root.cVoltSoft : root.cSurface
                        border.width: root.newFmt === modelData ? 2 : 1
                        border.color: root.newFmt === modelData ? root.cInk : root.cLine
                        Accessible.role: Accessible.RadioButton
                        Accessible.name: T.FORMATS[modelData].label
                        Accessible.checked: root.newFmt === modelData
                        ColumnLayout {
                            id: fc
                            anchors { left: parent.left; right: parent.right; top: parent.top; margins: 12 }
                            spacing: 4
                            Text { font.family: root.uiFont; text: T.FORMATS[modelData].label; color: root.cInk; font.pixelSize: 15; font.weight: Font.DemiBold }
                            Text { font.family: root.uiFont; text: T.FORMATS[modelData].blurb; color: root.cMuted; font.pixelSize: 12; wrapMode: Text.WordWrap; Layout.fillWidth: true }
                            Text { text: T.FORMAT_MODULES[modelData].length - 1 + " modules"; color: root.cMuted; font.pixelSize: 11; font.family: root.monoFont }
                        }
                        MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: root.newFmt = modelData }
                    }
                }
            }
            GridLayout {
                columns: 3
                columnSpacing: 14
                rowSpacing: 6
                Layout.maximumWidth: 780
                Text { font.family: root.uiFont; text: "Event name"; color: root.cMuted; font.pixelSize: 12 }
                Text { font.family: root.uiFont; text: "Show day"; color: root.cMuted; font.pixelSize: 12 }
                Text { font.family: root.uiFont; text: "City"; color: root.cMuted; font.pixelSize: 12 }
                CellField { id: nName; boxed: true; Layout.preferredWidth: 300; placeholderText: "e.g. Summer Solstice Festival"; Accessible.name: "Event name" }
                CellField {
                    id: nDate; boxed: true; Layout.preferredWidth: 150; placeholderText: "YYYY-MM-DD"; font.family: root.monoFont
                    validator: RegularExpressionValidator { regularExpression: /^\d{0,4}(-\d{0,2}(-\d{0,2})?)?$/ }
                    Accessible.name: "Show day"
                }
                CellField { id: nCity; boxed: true; Layout.preferredWidth: 200; Accessible.name: "City" }
            }
            RowLayout {
                spacing: 10
                Btn {
                    kind: "tape"
                    label: "Create event"
                    onClicked: {
                        var name = nName.text.trim() || ("Untitled " + T.FORMATS[root.newFmt].label.toLowerCase())
                        root.createEvent(T.newEvent({ format: root.newFmt, name: name, startDate: nDate.text.trim(), city: nCity.text.trim() }))
                    }
                }
                Btn { visible: root.order.length === 0; label: "Load an example festival"; onClicked: root.createEvent(T.exampleEvent()) }
                Btn { visible: root.order.length > 0; label: "Cancel"; onClicked: root.creating = false }
            }
        }
    }

    // ═════════════════════════ INTERSECT: carousel, archive, home ═════════════════════════

    // Video carousel. `key` remembers the slide; `items` = [{title, caption, url, poster}].
    component Reel: Rectangle {
        id: reel
        property string key: ""
        property var items: []
        property string empty: "No videos yet."
        readonly property int idx: { root.rev; var i = root.reelIdx[key] || 0; return Math.max(0, Math.min(items.length - 1, i)) }
        readonly property var cur: items.length ? items[idx] : null
        function go(i) {
            var r = root.reelIdx; r[key] = (i + items.length) % items.length; root.reelIdx = r
            if (stage.item && stage.item.stop) stage.item.stop()
            root.rev++
        }
        Layout.fillWidth: true
        implicitHeight: rcol.implicitHeight
        color: root.cSurface
        border.color: root.cLine
        ColumnLayout {
            id: rcol
            anchors { left: parent.left; right: parent.right; top: parent.top; margins: 1 }
            spacing: 0
            Text { font.family: root.uiFont; visible: reel.items.length === 0; text: reel.empty; color: root.cMuted; font.pixelSize: 13; padding: 32; Layout.alignment: Qt.AlignHCenter }
            Item {
                visible: reel.items.length > 0
                Layout.fillWidth: true
                Layout.preferredHeight: Math.min(500, Math.max(260, width * 0.5))
                Rectangle { anchors.fill: parent; color: root.cInk }
                Loader {
                    id: stage
                    anchors.fill: parent
                    source: "VideoStage.qml"
                    onLoaded: bindStage()
                    function bindStage() {
                        if (!item) return
                        item.source = Qt.binding(function () { return reel.cur ? reel.cur.url : "" })
                        item.poster = Qt.binding(function () { return reel.cur ? reel.cur.poster : "" })
                    }
                }
                // Fallback when Qt Multimedia isn't available: poster + open in the system player.
                Image {
                    anchors.fill: parent
                    visible: stage.status === Loader.Error
                    source: reel.cur ? reel.cur.poster : ""
                    fillMode: Image.PreserveAspectFit
                }
                Btn {
                    visible: stage.status === Loader.Error && !!reel.cur
                    anchors.centerIn: parent
                    kind: "tape"
                    label: "Open video"
                    onClicked: Qt.openUrlExternally(reel.cur.url)
                }
                Rectangle {
                    visible: reel.items.length > 1
                    anchors { left: parent.left; leftMargin: 12; verticalCenter: parent.verticalCenter }
                    width: 42; height: 42; color: pma.containsMouse ? root.cVolt : Qt.rgba(0.11, 0.13, 0.13, 0.72)
                    Text { anchors.centerIn: parent; text: "←"; color: pma.containsMouse ? root.cInk : "#FFFFFF"; font.pixelSize: 18; font.family: root.uiFont }
                    MouseArea { id: pma; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: reel.go(reel.idx - 1) }
                    Accessible.role: Accessible.Button; Accessible.name: "Previous video"
                }
                Rectangle {
                    visible: reel.items.length > 1
                    anchors { right: parent.right; rightMargin: 12; verticalCenter: parent.verticalCenter }
                    width: 42; height: 42; color: nma.containsMouse ? root.cVolt : Qt.rgba(0.11, 0.13, 0.13, 0.72)
                    Text { anchors.centerIn: parent; text: "→"; color: nma.containsMouse ? root.cInk : "#FFFFFF"; font.pixelSize: 18; font.family: root.uiFont }
                    MouseArea { id: nma; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: reel.go(reel.idx + 1) }
                    Accessible.role: Accessible.Button; Accessible.name: "Next video"
                }
            }
            RowLayout {
                visible: reel.items.length > 0
                Layout.fillWidth: true
                Layout.margins: 16
                spacing: 16
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 3
                    Text { font.family: root.uiFont; text: reel.cur ? reel.cur.title : ""; color: root.cInk; font.pixelSize: 18; font.weight: Font.DemiBold; elide: Text.ElideRight; Layout.fillWidth: true }
                    Text { text: reel.cur ? (reel.cur.caption || "") : ""; color: root.cMuted; font.pixelSize: 12; font.family: root.monoFont; elide: Text.ElideRight; Layout.fillWidth: true }
                }
                Text {
                    text: { function two(n) { return (n < 10 ? "0" : "") + n } return two(reel.idx + 1) + " / " + two(reel.items.length) }
                    color: root.cMuted; font.pixelSize: 12; font.family: root.monoFont
                }
            }
            Flickable {
                visible: reel.items.length > 1
                Layout.fillWidth: true
                Layout.leftMargin: 16; Layout.rightMargin: 16; Layout.bottomMargin: 16
                Layout.preferredHeight: 104
                contentWidth: thumbs.implicitWidth
                flickableDirection: Flickable.HorizontalFlick
                boundsBehavior: Flickable.StopAtBounds
                clip: true
                Row {
                    id: thumbs
                    spacing: 8
                    Repeater {
                        model: reel.items
                        delegate: Rectangle {
                            width: 132; height: 100
                            color: root.cSunk
                            border.width: index === reel.idx ? 2 : 1
                            border.color: index === reel.idx ? root.cInk : root.cLine
                            Rectangle { anchors { left: parent.left; right: parent.right; top: parent.top; margins: 1 } height: 72; color: root.cInk
                                Image { anchors.fill: parent; source: modelData.poster || ""; fillMode: Image.PreserveAspectCrop; asynchronous: true; clip: true }
                            }
                            Rectangle { visible: index === reel.idx; anchors { left: parent.left; right: parent.right; bottom: parent.bottom; margins: 1 } height: 3; color: root.cVolt }
                            Text { font.family: root.uiFont; x: 7; y: 78; width: parent.width - 14; text: modelData.title; color: root.cInk; font.pixelSize: 11; elide: Text.ElideRight }
                            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: reel.go(index) }
                            Accessible.role: Accessible.Button; Accessible.name: "Play " + modelData.title
                        }
                    }
                }
            }
        }
    }

    // One archived file.
    component FileRow: Rectangle {
        id: fr
        property var f: ({})
        property bool showModule: false
        readonly property string kind: T.fileKind(f.name, f.type)
        Layout.fillWidth: true
        implicitHeight: Math.max(54, frow.implicitHeight + 16)
        color: "transparent"
        Rectangle { anchors.bottom: parent.bottom; width: parent.width; height: 1; color: root.cRule }
        RowLayout {
            id: frow
            anchors { left: parent.left; right: parent.right; verticalCenter: parent.verticalCenter; leftMargin: 18; rightMargin: 14 }
            spacing: 12
            Rectangle {
                Layout.preferredWidth: 84; Layout.preferredHeight: 22
                color: fr.kind === "video" ? root.cInk : fr.kind === "image" ? root.cInfoSoft : fr.kind === "pdf" ? root.cVoltSoft : root.cSide
                Text { anchors.centerIn: parent; text: T.KIND_LABELS[fr.kind].toUpperCase(); font.family: root.monoFont; font.pixelSize: 10; font.letterSpacing: 0.6
                       color: fr.kind === "video" ? root.cVolt : fr.kind === "image" ? root.cInfo : fr.kind === "pdf" ? root.cGood : root.cInk }
            }
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2
                Text { font.family: root.uiFont; text: fr.f.name || ""; color: root.cInk; font.pixelSize: 13; font.weight: Font.DemiBold; elide: Text.ElideMiddle; Layout.fillWidth: true }
                Text {
                    text: T.humanSize(fr.f.size) + " · added " + (fr.f.addedAt ? T.shortDate(String(fr.f.addedAt).slice(0, 10)) : "")
                          + (fr.f.cid ? " · on Logos Storage" : (root.preview ? "" : " · in the local vault"))
                    color: root.cMuted; font.pixelSize: 11; font.family: root.monoFont; Layout.fillWidth: true; elide: Text.ElideRight
                }
                CellField {
                    Layout.fillWidth: true
                    Layout.maximumWidth: 520
                    font.pixelSize: 12
                    leftPadding: 4
                    text: fr.f.note || ""
                    placeholderText: "Add a note"
                    Accessible.name: "Note for " + (fr.f.name || "")
                    onEditingFinished: if (text !== (fr.f.note || "")) root.updateFile(fr.f.id, fr.f.module, text)
                }
            }
            Combo {
                visible: fr.showModule
                Layout.preferredWidth: 180
                readonly property var keys: ["general"].concat(T.archiveTargets(root.evNow()))
                model: keys.map(function (m) { return m === "general" ? "General" : T.moduleTitle(root.evNow(), m) })
                currentIndex: keys.indexOf(fr.f.module)
                boxed: true
                Accessible.name: "Module for " + (fr.f.name || "")
                onActivated: root.updateFile(fr.f.id, keys[currentIndex], fr.f.note || "")
            }
            Btn { small: true; label: "Open"; onClicked: root.openFile(fr.f) }
            Btn { small: true; label: "Save a copy"; visible: !root.preview; onClicked: root.exportFile(fr.f) }
            Btn {
                small: true
                kind: root.armed === "f" + fr.f.id ? "danger" : "plain"
                label: root.armed === "f" + fr.f.id ? "Delete for good" : "Delete"
                onClicked: root.removeFile(fr.f.id)
            }
        }
    }

    // Add files: system dialog, drag and drop, or a pasted path.
    component AddFiles: Rectangle {
        id: af
        property string mod: "general"
        property string eventId: ""
        property string hint: "Drop files here, or add them from your computer."
        Layout.fillWidth: true
        Layout.leftMargin: 18; Layout.rightMargin: 18; Layout.bottomMargin: 14
        implicitHeight: afRow.implicitHeight + 26
        color: drop.containsDrag ? root.cInfoSoft : root.cSunk
        border.color: drop.containsDrag ? root.cLean : root.cLine
        border.width: 1
        DropArea {
            id: drop
            anchors.fill: parent
            onDropped: function (d) { if (d.hasUrls) root.addFiles(d.urls, af.mod, af.eventId || root.cur) }
        }
        RowLayout {
            id: afRow
            anchors { left: parent.left; right: parent.right; verticalCenter: parent.verticalCenter; margins: 14 }
            spacing: 10
            Text { font.family: root.uiFont; text: af.hint; color: root.cMuted; font.pixelSize: 13; Layout.fillWidth: true; wrapMode: Text.WordWrap }
            Btn { kind: "tape"; small: true; label: "Add files"; visible: picker.status === Loader.Ready; onClicked: root.pickFiles(af.mod, af.eventId) }
            CellField { id: pathField; visible: picker.status !== Loader.Ready; boxed: true; Layout.preferredWidth: 320; placeholderText: "/path/to/file"; Accessible.name: "File path" }
            Btn { visible: picker.status !== Loader.Ready; small: true; kind: "tape"; label: "Add"; onClicked: { root.addFiles([pathField.text], af.mod, af.eventId || root.cur); pathField.text = "" } }
        }
    }

    Component {
        id: filesBlock
        Block {
            id: fb
            property string mod: ""
            readonly property var files: { root.archive; return root.archiveFor(fb.mod) }
            title: "Files  //  " + T.moduleTitle(root.evNow(), fb.mod)
            lead: "Contracts, riders, plans, photos and anything else for this module. Kept in the Intersect Archive."
            chip: files.length + (files.length === 1 ? " file" : " files")
            AddFiles { mod: fb.mod }
            Rectangle { visible: fb.files.length > 0; Layout.fillWidth: true; height: 1; color: root.cLine }
            Repeater { model: fb.files; delegate: FileRow { f: modelData } }
        }
    }

    Component {
        id: archiveSection
        ColumnLayout {
            spacing: 18
            readonly property var files: { root.archive; return root.eventArchive() }
            readonly property var groups: T.archiveGroups(root.evNow(), files)
            readonly property var st: T.archiveStats(files)
            Flow {
                Layout.fillWidth: true
                spacing: 12
                Tile { s: ({ label: "Files", value: String(st.count), sub: groups.length + (groups.length === 1 ? " module" : " modules") + " with files" }) }
                Tile { s: ({ label: "Total size", value: T.humanSize(st.size), sub: "Across this event" }) }
                Tile { s: ({ label: "Documents", value: String((st.kinds.pdf || 0) + (st.kinds.doc || 0) + (st.kinds.sheet || 0) + (st.kinds.deck || 0)), sub: "PDFs, docs, sheets and decks" }) }
                Tile { s: ({ label: "Photos and video", value: String((st.kinds.image || 0) + (st.kinds.video || 0)), sub: (st.kinds.video || 0) + " in the showreel" }) }
            }
            Rectangle {
                Layout.fillWidth: true
                implicitHeight: stRow.implicitHeight + 24
                color: root.storageState === 2 ? root.cVoltSoft : root.storageState === 3 ? root.cBadSoft : root.cInfoSoft
                Rectangle { width: 4; height: parent.height; color: root.storageState === 2 ? root.cVolt : root.storageState === 3 ? root.cHeat : root.cLean }
                RowLayout {
                    id: stRow
                    anchors { left: parent.left; right: parent.right; verticalCenter: parent.verticalCenter; leftMargin: 18; rightMargin: 12 }
                    spacing: 12
                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 3
                        Text {
                            font.family: root.uiFont
                            text: root.preview ? "Preview: files aren't stored" : root.storageState === 2 ? "Logos Storage connected" : root.storageState === 1 ? "Connecting to Logos Storage…" : root.storageState === 3 ? "Logos Storage isn't available" : "Logos Storage not connected yet"
                            color: root.cInk; font.pixelSize: 14; font.weight: Font.DemiBold
                        }
                        Text {
                            font.family: root.uiFont
                            text: (root.storageNote ? root.storageNote + ". " : "") + "Every file is copied into a private vault on this machine and stored on your own Logos Storage node with advertising off, so it is never announced to the network or served to peers."
                            color: root.cMuted; font.pixelSize: 12; wrapMode: Text.WordWrap; Layout.fillWidth: true
                        }
                    }
                    Btn { visible: !root.preview && (root.storageState === 0 || root.storageState === 3); small: true; kind: "primary"; label: root.storageState === 3 ? "Try again" : "Connect"; onClicked: root.backend.storageConnect() }
                }
            }
            Block {
                title: "Add to the archive"
                lead: "File under a module, then add files from your computer or drop them here."
                RowLayout {
                    Layout.leftMargin: 18; Layout.rightMargin: 18; Layout.bottomMargin: 10
                    spacing: 10
                    Label2 { text: "File under" }
                    Combo {
                        boxed: true
                        Layout.preferredWidth: 240
                        readonly property var keys: ["general"].concat(T.archiveTargets(root.evNow()))
                        model: keys.map(function (m) { return m === "general" ? "General" : T.moduleTitle(root.evNow(), m) })
                        currentIndex: Math.max(0, keys.indexOf(root.archMod))
                        Accessible.name: "File under module"
                        onActivated: root.archMod = keys[currentIndex]
                    }
                }
                AddFiles { mod: root.archMod }
            }
            Block {
                title: "Everything in the archive"
                lead: groups.length ? "Grouped by module, newest first. Change a file's module to refile it." : "Nothing archived yet. Files you add on any module page appear here too."
                chip: st.count + " files"
                Repeater {
                    model: groups
                    delegate: ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 0
                        Rectangle {
                            Layout.fillWidth: true
                            implicitHeight: 34
                            color: root.cSunk
                            Rectangle { anchors.top: parent.top; width: parent.width; height: 1; color: root.cLine }
                            Label2 { anchors { left: parent.left; leftMargin: 18; verticalCenter: parent.verticalCenter } text: modelData.title }
                            Label2 { anchors { right: parent.right; rightMargin: 18; verticalCenter: parent.verticalCenter } text: modelData.items.length + " · " + T.humanSize(T.archiveStats(modelData.items).size) }
                        }
                        Repeater { model: modelData.items; delegate: FileRow { f: modelData; showModule: true } }
                    }
                }
                Item { implicitHeight: 6 }
            }
        }
    }

    Component {
        id: showreelSection
        ColumnLayout {
            spacing: 18
            Block {
                title: "Showreel"
                lead: "Every video archived for this event, in one carousel: recaps, teasers, documentation and partner content."
                chip: { root.archive; var n = root.eventVideos().length; return n + (n === 1 ? " video" : " videos") }
                Reel {
                    key: "ev-" + root.cur
                    items: { root.archive; return root.eventVideos() }
                    empty: "No videos archived for this event yet. Add one below."
                    Layout.margins: 16
                }
                AddFiles { mod: "showreel"; hint: "Drop videos here. They're filed under Showreel in the archive." }
            }
        }
    }

    Component {
        id: homeView
        ColumnLayout {
            spacing: 28
            GridLayout {
                Layout.fillWidth: true
                columns: width > 900 ? 2 : 1
                columnSpacing: 44
                rowSpacing: 24
                ColumnLayout {
                    Layout.fillWidth: true
                    Layout.preferredWidth: 1
                    Layout.alignment: Qt.AlignBottom
                    spacing: 10
                    Image {
                        source: "brand/intersect-logo-black.png"
                        Layout.preferredWidth: Math.min(440, parent.width)
                        Layout.preferredHeight: Layout.preferredWidth * 285 / 900
                        fillMode: Image.PreserveAspectFit
                        smooth: true; mipmap: true
                        Accessible.name: "INTERSECT, art, technology, culture"
                    }
                    Text {
                        Layout.topMargin: 18
                        textFormat: Text.StyledText
                        text: "Events<br>at the edge <font color='" + root.cLean + "'>//</font>"
                        color: root.cInk
                        font.family: root.uiFont; font.pixelSize: 64; font.weight: Font.Bold; font.letterSpacing: -2.5
                        lineHeight: 0.92
                    }
                }
                ColumnLayout {
                    Layout.fillWidth: true
                    Layout.preferredWidth: 1
                    Layout.alignment: Qt.AlignBottom
                    spacing: 12
                    Text { font.family: root.uiFont; text: T.BRAND.lead; color: root.cInk; font.pixelSize: 20; font.weight: Font.DemiBold; wrapMode: Text.WordWrap; Layout.fillWidth: true }
                    Repeater {
                        model: T.BRAND.paragraphs
                        Text { font.family: root.uiFont; text: modelData; color: root.cMuted; font.pixelSize: 14; lineHeight: 1.3; wrapMode: Text.WordWrap; Layout.fillWidth: true }
                    }
                    RowLayout {
                        Layout.topMargin: 6
                        spacing: 10
                        Btn { kind: "tape"; label: "Start a production file"; onClicked: { root.creating = true; root.panel = ""; mainFlick.contentY = 0 } }
                        Btn {
                            visible: root.order.length > 0
                            label: { root.rev; var s = root.sortedIds(); return s.length && root.events[s[0]] ? "Open " + root.events[s[0]].name : "" }
                            onClicked: { var s = root.sortedIds(); root.cur = s[0]; root.panel = ""; root.mod = "overview"; root.bump() }
                        }
                    }
                }
            }
            Rectangle { Layout.fillWidth: true; height: 1; color: root.cLine }
            GridLayout {
                Layout.fillWidth: true
                columns: width > 700 ? 4 : 2
                columnSpacing: 0; rowSpacing: 0
                Repeater {
                    model: [[String(T.FORMAT_ORDER.length), "Event formats"], [String(T.MOD_ORDER.length - 1), "Built-in modules"], ["2–12 mo", "Campaign arcs"], ["20+ yrs", "Lessons, built in"]]
                    Rectangle {
                        Layout.fillWidth: true
                        implicitHeight: 82
                        color: root.cSurface
                        border.color: root.cLine
                        ColumnLayout {
                            anchors { left: parent.left; leftMargin: 16; verticalCenter: parent.verticalCenter }
                            spacing: 6
                            Text { font.family: root.uiFont; text: modelData[0]; color: root.cInk; font.pixelSize: 24; font.weight: Font.DemiBold }
                            Label2 { text: modelData[1] }
                        }
                    }
                }
            }
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 10
                RowLayout {
                    Layout.fillWidth: true
                    Label2 { text: "Portfolio  //  previous events" }
                    Rectangle { Layout.fillWidth: true; height: 1; color: root.cLine }
                    Btn { small: true; label: "+ Add a portfolio video"; onClicked: root.pickFiles("showreel", "_portfolio") }
                }
                Reel {
                    key: "home"
                    items: { root.archive; return root.portfolio() }
                    empty: "Portfolio videos appear here."
                }
            }
            Rectangle {
                Layout.fillWidth: true
                implicitHeight: openRow.implicitHeight + 36
                color: root.cSide
                Rectangle { width: 4; height: parent.height; color: root.cVolt }
                RowLayout {
                    id: openRow
                    anchors { left: parent.left; right: parent.right; verticalCenter: parent.verticalCenter; leftMargin: 22; rightMargin: 20 }
                    spacing: 16
                    Rectangle {
                        Layout.alignment: Qt.AlignTop
                        implicitWidth: osT.implicitWidth + 16; implicitHeight: 22
                        color: root.cInk
                        Text { id: osT; anchors.centerIn: parent; text: "OPEN SOURCE"; color: root.cVolt; font.family: root.monoFont; font.pixelSize: 10; font.letterSpacing: 1.2 }
                    }
                    Text { font.family: root.uiFont; text: T.BRAND.open; color: root.cInk; font.pixelSize: 14; lineHeight: 1.3; wrapMode: Text.WordWrap; Layout.fillWidth: true }
                }
            }
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 10
                RowLayout {
                    Layout.fillWidth: true
                    Label2 { text: "Formats  //  start from a template" }
                    Rectangle { Layout.fillWidth: true; height: 1; color: root.cLine }
                }
                GridLayout {
                    Layout.fillWidth: true
                    columns: Math.max(2, Math.floor(width / 210))
                    columnSpacing: 0; rowSpacing: 0
                    Repeater {
                        model: T.FORMAT_ORDER
                        Rectangle {
                            Layout.fillWidth: true
                            implicitHeight: fcol.implicitHeight + 26
                            color: fma.containsMouse ? root.cSunk : root.cSurface
                            border.color: root.cLine
                            ColumnLayout {
                                id: fcol
                                anchors { left: parent.left; right: parent.right; top: parent.top; margins: 13 }
                                spacing: 4
                                Text { font.family: root.uiFont; text: T.FORMATS[modelData].label; color: root.cInk; font.pixelSize: 15; font.weight: Font.DemiBold; wrapMode: Text.WordWrap; Layout.fillWidth: true }
                                Text { font.family: root.uiFont; text: T.FORMATS[modelData].blurb; color: root.cMuted; font.pixelSize: 12; wrapMode: Text.WordWrap; Layout.fillWidth: true }
                            }
                            MouseArea { id: fma; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor
                                        onClicked: { root.newFmt = modelData; root.creating = true; root.panel = ""; mainFlick.contentY = 0 } }
                            Accessible.role: Accessible.Button
                            Accessible.name: "Start a " + T.FORMATS[modelData].label
                        }
                    }
                }
            }
            Text {
                Layout.fillWidth: true
                textFormat: Text.StyledText
                wrapMode: Text.WordWrap
                font.family: root.monoFont; font.pixelSize: 12; color: root.cMuted
                text: "Worked with   " + T.BRAND.clients.map(function (c) { return "<font color='" + root.cInk + "'>" + c + "</font>" }).join("  <font color='" + root.cLean + "'>//</font>  ")
            }
        }
    }

    Component {
        id: builderView
        ColumnLayout {
            spacing: 16
            readonly property bool editing: root.builder.id !== ""
            Text { font.family: root.uiFont;
                text: parent.editing ? "Edit " + root.builder.title : "New custom module"
                color: root.cInk; font.pixelSize: 28; font.weight: Font.Bold
            }
            Text { font.family: root.uiFont;
                text: "Name the module and choose its columns. It works like any other module: rows, totals for number and money columns, and progress for status and checkbox columns."
                color: root.cMuted; font.pixelSize: 14; wrapMode: Text.WordWrap
                Layout.fillWidth: true; Layout.maximumWidth: 680
            }
            GridLayout {
                columns: 2
                columnSpacing: 14
                rowSpacing: 6
                Layout.fillWidth: true
                Layout.maximumWidth: 900
                Text { font.family: root.uiFont; text: "Module name"; color: root.cMuted; font.pixelSize: 12 }
                Text { font.family: root.uiFont; text: "Description (optional)"; color: root.cMuted; font.pixelSize: 12 }
                CellField {
                    boxed: true
                    Layout.preferredWidth: 320
                    text: { root.builderRev; return root.builder.title }
                    placeholderText: "e.g. Volunteer shifts"
                    Accessible.name: "Module name"
                    onTextEdited: root.builder.title = text
                }
                CellField {
                    boxed: true
                    Layout.fillWidth: true
                    text: { root.builderRev; return root.builder.lead }
                    placeholderText: "One line on what this tracks"
                    Accessible.name: "Description"
                    onTextEdited: root.builder.lead = text
                }
            }
            Block {
                title: "Columns"
                lead: "Status columns show as coloured pills and count toward progress. Choice lists take options separated by commas."
                Layout.maximumWidth: 900
                Rectangle { Layout.fillWidth: true; height: 1; color: root.cLine }
                Repeater {
                    model: { root.builderRev; return root.builder.rows.length }
                    delegate: RowLayout {
                        id: brow
                        readonly property var r: { root.builderRev; return root.builder.rows[index] }
                        Layout.fillWidth: true
                        Layout.leftMargin: 16; Layout.rightMargin: 16; Layout.topMargin: 8
                        spacing: 10
                        Text { text: String(index + 1); color: root.cMuted; font.family: root.monoFont; font.pixelSize: 12; Layout.preferredWidth: 18 }
                        CellField {
                            boxed: true
                            Layout.preferredWidth: 240
                            text: brow.r ? brow.r.label : ""
                            placeholderText: "Column name"
                            Accessible.name: "Column " + (index + 1) + " name"
                            onTextEdited: root.builderSet(index, "label", text, false)
                        }
                        Combo {
                            boxed: true
                            implicitHeight: 34
                            Layout.preferredWidth: 150
                            model: T.CUSTOM_TYPES.map(function (t) { return t[1] })
                            currentIndex: { var t = brow.r ? brow.r.type : "text"; for (var i = 0; i < T.CUSTOM_TYPES.length; i++) if (T.CUSTOM_TYPES[i][0] === t) return i; return 0 }
                            Accessible.name: "Column " + (index + 1) + " type"
                            onActivated: root.builderSet(index, "type", T.CUSTOM_TYPES[currentIndex][0], true)
                        }
                        CellField {
                            boxed: true
                            visible: brow.r && brow.r.type === "select"
                            Layout.fillWidth: true
                            text: brow.r ? (brow.r.options || "") : ""
                            placeholderText: "Options, e.g. Small, Medium, Large"
                            Accessible.name: "Column " + (index + 1) + " options"
                            onTextEdited: root.builderSet(index, "options", text, false)
                        }
                        Item { visible: !(brow.r && brow.r.type === "select"); Layout.fillWidth: true }
                        Btn { small: true; label: "↑"; Accessible.name: "Move up"; onClicked: root.builderMove(index, -1) }
                        Btn { small: true; label: "↓"; Accessible.name: "Move down"; onClicked: root.builderMove(index, 1) }
                        Btn { small: true; label: "Remove"; onClicked: root.builderRemoveRow(index) }
                    }
                }
                RowLayout {
                    Layout.margins: 16
                    Btn { small: true; label: "+ Add column"; onClicked: root.builderAddRow() }
                }
            }
            RowLayout {
                spacing: 10
                Btn { kind: "tape"; label: parent.parent.editing ? "Save changes" : "Add module"; onClicked: root.saveBuilder() }
                Btn { label: "Cancel"; onClicked: root.panel = "" }
                Item { Layout.preferredWidth: 30 }
                Btn {
                    visible: parent.parent.editing
                    kind: "danger"
                    label: root.armed === "cm" + root.builder.id ? "Delete module and its rows" : "Delete module"
                    onClicked: root.deleteCustomModule(root.builder.id)
                }
            }
        }
    }

    Component {
        id: backupView
        ColumnLayout {
            spacing: 16
            Text { font.family: root.uiFont; text: "Back up and restore"; color: root.cInk; font.pixelSize: 26; font.weight: Font.Bold }
            Text { font.family: root.uiFont;
                text: "Your events are saved on this machine" + (root.storagePath ? " at " + root.storagePath : "") + ". Copy this backup to keep a spare, or to move your events to another computer."
                color: root.cMuted; font.pixelSize: 13; wrapMode: Text.WordWrap; Layout.fillWidth: true; Layout.maximumWidth: 720
            }
            Block {
                title: "Backup"
                headerExtra: [Btn {
                    small: true; label: "Copy backup"
                    onClicked: { backupArea.selectAll(); backupArea.copy(); backupArea.deselect(); root.note = "Backup copied to the clipboard." }
                }]
                CellArea {
                    id: backupArea
                    Layout.fillWidth: true
                    Layout.margins: 16
                    Layout.preferredHeight: 220
                    boxed: true
                    readOnly: true
                    wrapMode: TextEdit.WrapAnywhere
                    font.family: root.monoFont
                    font.pixelSize: 11
                    text: root.backupText
                }
            }
            Block {
                title: "Restore"
                lead: "Paste a backup. Events in it are added, and any with the same id are replaced."
                CellArea {
                    id: restoreArea
                    Layout.fillWidth: true
                    Layout.leftMargin: 16; Layout.rightMargin: 16; Layout.topMargin: 4
                    Layout.preferredHeight: 140
                    boxed: true
                    font.family: root.monoFont
                    font.pixelSize: 11
                    placeholderText: "{ \"format\": \"production-office/1\", \"events\": { … } }"
                }
                RowLayout {
                    Layout.margins: 16
                    Btn { kind: "primary"; label: "Restore events"; onClicked: root.restore(restoreArea.text) }
                    Btn { label: "Close"; onClicked: root.panel = "" }
                }
            }
        }
    }

    // ═════════════════════════ layout ═════════════════════════

    RowLayout {
        anchors.fill: parent
        spacing: 0

        // ── sidebar ──
        Rectangle {
            Layout.fillHeight: true
            Layout.preferredWidth: root.width < 900 ? 220 : 264
            color: root.cSide
            Rectangle { anchors.right: parent.right; width: 1; height: parent.height; color: root.cLine }

            Flickable {
                anchors.fill: parent
                anchors.margins: 16
                contentHeight: side.implicitHeight
                clip: true
                boundsBehavior: Flickable.StopAtBounds

                ColumnLayout {
                    id: side
                    width: parent.width
                    spacing: 18

                    ColumnLayout {
                        spacing: 4
                        Image {
                            source: "brand/intersect-logo-black.png"
                            Layout.preferredWidth: 180
                            Layout.preferredHeight: 57
                            fillMode: Image.PreserveAspectFit
                            smooth: true; mipmap: true
                            Accessible.name: "INTERSECT"
                            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: root.goHome() }
                        }
                        Label2 { text: "Production office" }
                    }
                    Rectangle {
                        Layout.fillWidth: true
                        implicitHeight: 32
                        color: root.panel === "home" ? root.cBg : hma.containsMouse ? root.cSunk : "transparent"
                        Rectangle { width: 3; height: parent.height; color: root.panel === "home" ? root.cLean : "transparent" }
                        Text { font.family: root.uiFont; anchors.verticalCenter: parent.verticalCenter; x: 14; text: "Home"; color: root.cInk; font.pixelSize: 13; font.weight: Font.Medium }
                        MouseArea { id: hma; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: root.goHome() }
                        Accessible.role: Accessible.Button
                        Accessible.name: "Home"
                    }

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 6
                        Label2 { text: "Events" }
                        Repeater {
                            model: { root.rev; return root.sortedIds() }
                            delegate: Rectangle {
                                readonly property var e: root.events[modelData]
                                readonly property bool on: modelData === root.cur && !root.creating && root.panel === ""
                                Rectangle { width: 3; height: parent.height; color: parent.on ? root.cVolt : "transparent" }
                                Layout.fillWidth: true
                                implicitHeight: ec.implicitHeight + 14
                                radius: 2
                                color: on ? root.cBg : ema.containsMouse ? root.cSunk : "transparent"
                                Accessible.role: Accessible.Button
                                Accessible.name: e ? e.name : ""
                                ColumnLayout {
                                    id: ec
                                    anchors { left: parent.left; right: parent.right; verticalCenter: parent.verticalCenter; leftMargin: 10; rightMargin: 10 }
                                    spacing: 1
                                    Text { font.family: root.uiFont; text: parent.parent.e ? parent.parent.e.name : ""; color: root.cInk; font.pixelSize: 13; font.weight: Font.DemiBold; elide: Text.ElideRight; Layout.fillWidth: true }
                                    Text {
                                        text: { var e = parent.parent.e; if (!e) return ""; return (T.FORMATS[e.format] ? T.FORMATS[e.format].label : "") + (e.startDate ? " · " + T.shortDate(e.startDate) : "") }
                                        color: root.cMuted; font.pixelSize: 11; font.family: root.monoFont; elide: Text.ElideRight; Layout.fillWidth: true
                                    }
                                }
                                MouseArea {
                                    id: ema; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor
                                    onClicked: { root.cur = modelData; root.creating = false; root.panel = ""; root.mod = "overview"; root.armed = ""; root.bump(); mainFlick.contentY = 0 }
                                }
                            }
                        }
                        Btn { small: true; label: "+ New event"; onClicked: { root.creating = true; root.panel = ""; mainFlick.contentY = 0 } }
                    }

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 2
                        visible: root.evNow() !== null && !root.creating && root.panel === ""
                        Label2 { text: "Modules"; Layout.bottomMargin: 4 }
                        Repeater {
                            model: { root.rev; var e = root.evNow(); return e ? T.eventModules(e) : [] }
                            delegate: Rectangle {
                                readonly property bool on: root.mod === modelData
                                readonly property string prog: { root.calc; return T.modCount(root.evNow(), modelData) }
                                Layout.fillWidth: true
                                implicitHeight: 30
                                radius: 2
                                color: on ? root.cInk : mma2.containsMouse ? root.cSunk : "transparent"
                                Accessible.role: Accessible.Button
                                Accessible.name: T.moduleTitle(root.evNow(), modelData)
                                RowLayout {
                                    anchors { fill: parent; leftMargin: 10; rightMargin: 10 }
                                    Text { font.family: root.uiFont; text: T.moduleTitle(root.evNow(), modelData); color: parent.parent.on ? root.cBg : root.cInk; font.pixelSize: 13; elide: Text.ElideRight; Layout.fillWidth: true }
                                    Text { text: parent.parent.prog; color: parent.parent.on ? root.cVolt : root.cMuted; font.pixelSize: 11; font.family: root.monoFont }
                                }
                                MouseArea { id: mma2; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor
                                            onClicked: { root.mod = modelData; root.armed = ""; mainFlick.contentY = 0 } }
                            }
                        }
                        Btn { Layout.topMargin: 6; small: true; label: "+ Custom module"; onClicked: root.openBuilder("") }
                    }

                    ColumnLayout {
                        Layout.fillWidth: true
                        Layout.topMargin: 8
                        spacing: 6
                        Btn { small: true; label: "Back up / restore"; onClicked: { root.openBackup(); mainFlick.contentY = 0 } }
                        Text {
                            text: root.preview ? "Preview · changes are not saved"
                                 : root.ready ? (root.backendStatus || "Connected") : "Connecting to backend…"
                            color: root.preview ? root.cWarn : root.cMuted
                            font.pixelSize: 11
                            font.family: root.monoFont
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }
                    }
                    Item { implicitHeight: 12 }
                }
            }
        }

        // ── main ──
        Flickable {
            id: mainFlick
            Layout.fillWidth: true
            Layout.fillHeight: true
            contentWidth: width
            contentHeight: mainCol.implicitHeight + 64
            clip: true
            boundsBehavior: Flickable.StopAtBounds
            ScrollBar.vertical: ScrollBar { policy: ScrollBar.AsNeeded }

            ColumnLayout {
                id: mainCol
                x: 28
                y: 24
                width: mainFlick.width - 56
                spacing: 18

                // loading
                Text { font.family: root.uiFont;
                    visible: !root.loaded
                    text: "Loading your events…"
                    color: root.cInk; font.pixelSize: 24; font.weight: Font.Bold
                }

                // header
                RowLayout {
                    visible: root.loaded && root.evNow() !== null && !root.creating && root.panel === ""
                    Layout.fillWidth: true
                    spacing: 16
                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 4
                        Label2 { text: { root.rev; var e = root.evNow(); return e ? (T.FORMATS[e.format] ? T.FORMATS[e.format].label : "") + "  //  " + T.moduleTitle(e, root.mod) : "" } }
                        Text { font.family: root.uiFont;
                            text: { root.rev; var e = root.evNow(); return e ? e.name : "" }
                            color: root.cInk; font.pixelSize: 30; font.weight: Font.Bold
                            wrapMode: Text.WordWrap; Layout.fillWidth: true
                        }
                        Text { font.family: root.uiFont;
                            text: { root.rev; var e = root.evNow(); return e ? T.subtitle(e) : "" }
                            color: root.cMuted
                            font.pixelSize: 13
                        }
                    }
                    Rectangle {
                        readonly property string cd: { root.rev; var e = root.evNow(); return e ? T.countdown(e) : "" }
                        readonly property bool past: cd.indexOf("T+") === 0
                        visible: cd !== ""
                        Layout.alignment: Qt.AlignBottom
                        implicitWidth: cdT.implicitWidth + 20
                        implicitHeight: 32
                        radius: 0
                        color: past ? root.cSide : root.cVolt
                        Text { id: cdT; anchors.centerIn: parent; text: parent.cd; color: parent.past ? root.cMuted : "#15181B"; font.family: root.monoFont; font.pixelSize: 15; font.weight: Font.Medium }
                    }
                }

                // banners
                Rectangle {
                    visible: root.preview && !root.creating
                    Layout.fillWidth: true
                    implicitHeight: pv.implicitHeight + 16
                    radius: 2
                    color: root.cWarnSoft
                    Text { font.family: root.uiFont; id: pv; anchors { left: parent.left; right: parent.right; verticalCenter: parent.verticalCenter; margins: 12 }
                           text: "Preview mode: the INTERSECT backend isn't connected, so changes stay in this window and are not saved."
                           color: root.cWarn; font.pixelSize: 13; wrapMode: Text.WordWrap }
                }
                Rectangle {
                    visible: root.note !== ""
                    Layout.fillWidth: true
                    implicitHeight: nt.implicitHeight + 16
                    radius: 2
                    color: root.note.indexOf("Not saved") === 0 || root.note.indexOf("Couldn") === 0 ? root.cBadSoft : root.cInfoSoft
                    RowLayout {
                        anchors { fill: parent; leftMargin: 12; rightMargin: 8 }
                        Text { font.family: root.uiFont; id: nt; text: root.note; color: root.cInk; font.pixelSize: 13; wrapMode: Text.WordWrap; Layout.fillWidth: true }
                        Btn { small: true; label: "Dismiss"; onClicked: root.note = "" }
                    }
                }

                Loader {
                    Layout.fillWidth: true
                    active: root.loaded
                    sourceComponent: (root.panel === "home" && !root.creating) ? homeView
                                   : root.panel === "builder" ? builderView
                                   : root.panel === "backup" ? backupView
                                   : root.creating ? creatorView
                                   : root.order.length === 0 ? homeView
                                   : root.mod === "overview" ? overviewView : moduleView
                }
            }
        }
    }
}
