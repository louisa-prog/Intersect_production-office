"""Headless test harness for the Production Office view.

Runs tests/TestRunner.qml in Qt 6 (PySide6). Python provides a stand-in for
Basecamp's `logos` bridge and an in-memory backend implementing
src/production_office.rep, so the real Main.qml runs unchanged. The runner
drives the view through its main flows, checks what reaches the backend and
saves screenshots.

    pip install PySide6
    QT_QPA_PLATFORM=offscreen python3 tests/harness.py            # with backend
    QT_QPA_PLATFORM=offscreen python3 tests/harness.py --preview  # no bridge
"""
import json
import os
import sys

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from PySide6.QtCore import QObject, QTimer, QUrl, Property, Signal, Slot
from PySide6.QtGui import QGuiApplication
from PySide6.QtQml import QJSValue
from PySide6.QtQuick import QQuickView

HERE = os.path.dirname(os.path.abspath(__file__))
PREVIEW = "--preview" in sys.argv
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)


class Backend(QObject):
    """In-memory stand-in for ProductionOfficeBackend: same SLOTs and PROPs."""
    statusChanged = Signal()
    revisionChanged = Signal()
    storagePathChanged = Signal()

    def __init__(self):
        super().__init__()
        self.events = {}
        self._status = "Ready"
        self._rev = 0
        self.saves = 0

    def _changed(self, status):
        self._rev += 1
        self._status = status
        self.revisionChanged.emit()
        self.statusChanged.emit()

    @Property(str, notify=statusChanged)
    def status(self):
        return self._status

    @Property(int, notify=revisionChanged)
    def revision(self):
        return self._rev

    @Property(str, notify=storagePathChanged)
    def storagePath(self):
        return "~/.local/share/logos/production_office/events.json"

    @Slot(result=str)
    def listEvents(self):
        return json.dumps([{"id": k, "data": v} for k, v in self.events.items()])

    @Slot(str, str, result=bool)
    def saveEvent(self, eid, data):
        self.events[eid] = json.loads(data)
        self.saves += 1
        self._changed("Saved 14:02")
        return True

    @Slot(str, result=bool)
    def deleteEvent(self, eid):
        ok = self.events.pop(eid, None) is not None
        self._changed("Saved 14:03")
        return ok

    @Slot(result=str)
    def exportAll(self):
        return json.dumps({"format": "production-office/1", "events": self.events}, indent=2)

    # ── Intersect Archive (same contract as production_office_archive.cpp) ──
    storageStateChanged = Signal()
    storageNoteChanged = Signal()
    archiveRevisionChanged = Signal()

    @Property(int, notify=storageStateChanged)
    def storageState(self):
        return getattr(self, "_sstate", 0)

    @Property(str, notify=storageNoteChanged)
    def storageNote(self):
        return getattr(self, "_snote", "")

    @Property(int, notify=archiveRevisionChanged)
    def archiveRevision(self):
        return getattr(self, "_arev", 0)

    def _arch(self):
        if not hasattr(self, "archive"):
            self.archive = []
        return self.archive

    def _abump(self):
        self._arev = getattr(self, "_arev", 0) + 1
        self.archiveRevisionChanged.emit()

    @Slot(str, result=str)
    def archiveList(self, event_id):
        return json.dumps([a for a in self._arch() if not event_id or a["eventId"] == event_id])

    @Slot(str, str, str, str, result=str)
    def archiveAdd(self, event_id, module, url, note):
        path = url[7:] if url.startswith("file://") else url
        if not os.path.isfile(path):
            self._status = "File not added: %s was not found" % path
            self.statusChanged.emit()
            return ""
        item = {"id": "f%d" % (len(self._arch()) + 1), "eventId": event_id, "module": module or "general",
                "name": os.path.basename(path), "size": os.path.getsize(path), "type": "",
                "addedAt": "2026-11-04T07:00:00Z", "note": note, "url": "file://" + path,
                "cid": "zDvZ" + str(len(self._arch()) + 1) if self.storageState == 2 else ""}
        self._arch().append(item)
        self._abump()
        return json.dumps(item)

    @Slot(str, str, str, result=bool)
    def archiveUpdate(self, fid, module, note):
        for a in self._arch():
            if a["id"] == fid:
                a["module"] = module or a["module"]
                a["note"] = note
                self._abump()
                return True
        return False

    @Slot(str, result=bool)
    def archiveRemove(self, fid):
        n = len(self._arch())
        self.archive = [a for a in self._arch() if a["id"] != fid]
        self._abump()
        return len(self.archive) < n

    @Slot(str, result=int)
    def archiveRemoveEvent(self, event_id):
        n = len(self._arch())
        self.archive = [a for a in self._arch() if a["eventId"] != event_id]
        self._abump()
        return n - len(self.archive)

    @Slot(str, result=str)
    def archiveFileUrl(self, fid):
        return next((a["url"] for a in self._arch() if a["id"] == fid), "")

    @Slot(str, str, result=bool)
    def archiveExport(self, fid, dest):
        return True

    @Slot(result=bool)
    def storageConnect(self):
        self._sstate = 2
        self._snote = "Connected to your Logos Storage node"
        self.storageStateChanged.emit()
        self.storageNoteChanged.emit()
        return True

    @Slot(str, result=int)
    def importAll(self, data):
        evs = json.loads(data).get("events", {})
        self.events.update(evs)
        self._changed("Saved 14:04")
        return len(evs)


class Logos(QObject):
    """Stand-in for the `logos` context property Basecamp injects into a view."""
    viewModuleReadyChanged = Signal(str, bool)

    def __init__(self, backend):
        super().__init__()
        self.backend = backend

    @Slot(str, result=QObject)
    def module(self, name):
        return self.backend if name == "production_office" else None

    @Slot(str, result=bool)
    def isViewModuleReady(self, name):
        return name == "production_office"

    @Slot("QVariant", QJSValue, QJSValue)
    def watch(self, pending, ok, fail):
        # Basecamp replies asynchronously; reply on the next event-loop turn.
        QTimer.singleShot(0, lambda: ok.call([pending]))


class Probe(QObject):
    """What the QML runner reports back through."""

    def __init__(self, view, backend, app):
        super().__init__()
        self.view, self.backend, self.app = view, backend, app
        self.results = []

    @Slot(str)
    def shot(self, name):
        self.view.grabWindow().save(os.path.join(OUT, name + ".png"))

    @Slot(str, bool, str)
    def report(self, name, ok, detail):
        self.results.append((name, ok, detail))

    @Slot(result=int)
    def count(self):
        return len(self.backend.events)

    @Slot(result=int)
    def saves(self):
        return self.backend.saves

    @Slot(result=str)
    def stored(self):
        return json.dumps(self.backend.events)

    @Slot(str, result=str)
    def fixture(self, name):
        d = os.path.join(OUT, "fixtures")
        os.makedirs(d, exist_ok=True)
        path = os.path.join(d, name)
        with open(path, "wb") as f:
            f.write(b"x" * 2048)
        return "file://" + path

    @Slot()
    def done(self):
        self.app.quit()


def main():
    app = QGuiApplication(sys.argv)
    backend = Backend()
    view = QQuickView()
    probe = Probe(view, backend, app)
    msgs = []
    view.engine().warnings.connect(lambda ws: msgs.extend(w.toString() for w in ws))
    ctx = view.rootContext()
    bridge = Logos(backend)  # keep a reference: Python would collect it otherwise
    if not PREVIEW:
        ctx.setContextProperty("logos", bridge)
    ctx.setContextProperty("probe", probe)
    ctx.setContextProperty("previewRun", PREVIEW)
    view.setResizeMode(QQuickView.SizeRootObjectToView)
    view.resize(1280, 860)
    view.setSource(QUrl.fromLocalFile(os.path.join(HERE, "TestRunner.qml")))
    if view.status() == QQuickView.Error:
        for e in view.errors():
            print("LOAD ERROR:", e.toString())
        return 1
    view.show()
    QTimer.singleShot(90000, app.quit)  # hard stop
    app.exec()

    failed = [r for r in probe.results if not r[1]]
    for name, ok, detail in probe.results:
        print(("PASS " if ok else "FAIL ") + name + (("  — " + detail) if detail else ""))
    noise = [m for m in msgs if "probe" not in m]
    print(f"\n{len(probe.results) - len(failed)}/{len(probe.results)} checks passed; {len(noise)} QML warnings")
    for m in noise[:40]:
        print("WARN", m)
    return 1 if failed or noise else 0


if __name__ == "__main__":
    sys.exit(main())
