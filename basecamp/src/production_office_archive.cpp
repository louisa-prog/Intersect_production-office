// Intersect Archive: private files for every event and module.
//
// Each file is first copied into a private vault in the module's data folder
// (instancePersistencePath()/archive/<eventId>/), so it is safe on disk even
// before Logos Storage is connected. It is then stored on the local Logos
// Storage node with advertise=false: the node neither announces the dataset to
// the DHT nor serves it to peers, so the file stays on this machine. The CID is
// kept in archive.json next to events.json and never leaves the module.
//
// Integration notes, from hackyguru/logos-filesharing and the storage module's
// own header (logos-storage-module/src/storage_module_plugin.h, v3):
//   - Basecamp 0.3+ starts the storage node at launch. We check isRunning()
//     first; init() returning false just means another module initialised it.
//   - init() + start() block for 30–80 s on a cold start, so they run from a
//     QTimer::singleShot on the backend's own thread, never inside a slot.
//   - uploadUrl() returns a session id; the CID arrives on storageUploadDone as
//     JSON {success, sessionId, cid, error}. One upload runs at a time.

#include "production_office_backend.h"
#include "logos_sdk.h"

#include <QDateTime>
#include <QDebug>
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QJsonDocument>
#include <QMimeDatabase>
#include <QRegularExpression>
#include <QSaveFile>
#include <QStandardPaths>
#include <QTimer>
#include <QUrl>
#include <QUuid>
#include <string>
#include <type_traits>

namespace {

// Accept QString or std::string from the generated wrappers.
template <typename T>
QString qs(const T& v)
{
    if constexpr (std::is_same_v<std::decay_t<T>, QString>)
        return v;
    else if constexpr (std::is_same_v<std::decay_t<T>, QVariant>)
        return v.toString();
    else
        return QString::fromStdString(std::string(v));
}

QString errText(const LogosResult& r)
{
    const QString e = QVariant(r.error).toString();
    return e.isEmpty() ? QStringLiteral("unknown error") : e;
}

QString toLocalPath(const QString& fileUrl)
{
    const QString t = fileUrl.trimmed();
    if (t.startsWith(QStringLiteral("file:")))
        return QUrl(t).toLocalFile();
    return QDir::cleanPath(t);
}

QString safeName(const QString& name)
{
    QString n = name;
    n.replace(QRegularExpression(QStringLiteral("[^A-Za-z0-9._ -]")), QStringLiteral("_"));
    n = n.trimmed();
    return n.isEmpty() ? QStringLiteral("file") : n.left(120);
}

constexpr qint64 kMaxFileBytes = 2LL * 1024 * 1024 * 1024;  // 2 GB per file

} // namespace

// ── index ───────────────────────────────────────────────────────────

QString ProductionOfficeBackend::archiveFile() const { return m_dir + QStringLiteral("/archive.json"); }
QString ProductionOfficeBackend::vaultDir() const { return m_dir + QStringLiteral("/archive"); }

void ProductionOfficeBackend::archiveLoad()
{
    if (m_archiveLoaded)
        return;
    ensureLoaded();  // sets m_dir
    m_archiveLoaded = true;
    m_archive = QJsonArray();
    QFile f(archiveFile());
    if (f.exists() && f.open(QIODevice::ReadOnly)) {
        const QJsonDocument doc = QJsonDocument::fromJson(f.readAll());
        m_archive = doc.object().value(QStringLiteral("items")).toArray();
    }
    // Anything stored before the node was connected goes back in the queue.
    for (const QJsonValue& v : m_archive) {
        const QJsonObject o = v.toObject();
        if (o.value(QStringLiteral("cid")).toString().isEmpty())
            m_uploadQueue.append(o.value(QStringLiteral("id")).toString());
    }
}

bool ProductionOfficeBackend::archivePersist()
{
    QJsonObject root;
    root.insert(QStringLiteral("format"), QStringLiteral("intersect-archive/1"));
    root.insert(QStringLiteral("items"), m_archive);
    QSaveFile f(archiveFile());
    if (!f.open(QIODevice::WriteOnly)) {
        setStatus(QStringLiteral("Archive not saved: can't write %1").arg(archiveFile()));
        return false;
    }
    f.write(QJsonDocument(root).toJson(QJsonDocument::Compact));
    if (!f.commit()) {
        setStatus(QStringLiteral("Archive not saved: %1").arg(f.errorString()));
        return false;
    }
    setArchiveRevision(archiveRevision() + 1);
    return true;
}

int ProductionOfficeBackend::archiveIndex(const QString& id) const
{
    for (int i = 0; i < m_archive.size(); ++i)
        if (m_archive.at(i).toObject().value(QStringLiteral("id")).toString() == id)
            return i;
    return -1;
}

// ── slots ───────────────────────────────────────────────────────────

QString ProductionOfficeBackend::archiveList(QString eventId)
{
    archiveLoad();
    QJsonArray out;
    for (const QJsonValue& v : m_archive) {
        QJsonObject o = v.toObject();
        if (!eventId.isEmpty() && o.value(QStringLiteral("eventId")).toString() != eventId)
            continue;
        const QString path = vaultDir() + QLatin1Char('/') + o.value(QStringLiteral("local")).toString();
        o.insert(QStringLiteral("url"), QUrl::fromLocalFile(path).toString());
        o.insert(QStringLiteral("onDisk"), QFileInfo::exists(path));
        out.append(o);
    }
    return QString::fromUtf8(QJsonDocument(out).toJson(QJsonDocument::Compact));
}

QString ProductionOfficeBackend::archiveAdd(QString eventId, QString module, QString fileUrl, QString note)
{
    archiveLoad();
    if (!validId(eventId)) {
        setStatus(QStringLiteral("File not added: no event selected"));
        return QString();
    }
    const QString src = toLocalPath(fileUrl);
    const QFileInfo info(src);
    if (!info.exists() || !info.isFile()) {
        setStatus(QStringLiteral("File not added: %1 was not found").arg(src));
        return QString();
    }
    if (info.size() > kMaxFileBytes) {
        setStatus(QStringLiteral("File not added: %1 is over 2 GB").arg(info.fileName()));
        return QString();
    }

    const QString id = QUuid::createUuid().toString(QUuid::WithoutBraces).left(13);
    const QString rel = eventId + QLatin1Char('/') + id + QLatin1Char('-') + safeName(info.fileName());
    const QString dest = vaultDir() + QLatin1Char('/') + rel;
    QDir().mkpath(QFileInfo(dest).absolutePath());
    if (!QFile::copy(src, dest)) {
        setStatus(QStringLiteral("File not added: couldn't copy %1 into the archive").arg(info.fileName()));
        return QString();
    }
    // Vault copies are for this user only.
    QFile::setPermissions(dest, QFileDevice::ReadOwner | QFileDevice::WriteOwner);

    QJsonObject item;
    item.insert(QStringLiteral("id"), id);
    item.insert(QStringLiteral("eventId"), eventId);
    item.insert(QStringLiteral("module"), module.isEmpty() ? QStringLiteral("general") : module);
    item.insert(QStringLiteral("name"), info.fileName());
    item.insert(QStringLiteral("size"), static_cast<double>(info.size()));
    item.insert(QStringLiteral("type"), QMimeDatabase().mimeTypeForFile(info).name());
    item.insert(QStringLiteral("addedAt"), QDateTime::currentDateTimeUtc().toString(Qt::ISODate));
    item.insert(QStringLiteral("note"), note);
    item.insert(QStringLiteral("local"), rel);
    item.insert(QStringLiteral("cid"), QString());
    m_archive.append(item);
    if (!archivePersist())
        return QString();

    setStatus(QStringLiteral("Added %1 to the archive").arg(info.fileName()));
    m_uploadQueue.append(id);
    if (storageState() == 2)
        QTimer::singleShot(0, this, [this]() { pumpUploads(); });
    return QString::fromUtf8(QJsonDocument(item).toJson(QJsonDocument::Compact));
}

bool ProductionOfficeBackend::archiveUpdate(QString id, QString module, QString note)
{
    archiveLoad();
    const int i = archiveIndex(id);
    if (i < 0)
        return false;
    QJsonObject o = m_archive.at(i).toObject();
    if (!module.isEmpty())
        o.insert(QStringLiteral("module"), module);
    o.insert(QStringLiteral("note"), note);
    m_archive.replace(i, o);
    return archivePersist();
}

bool ProductionOfficeBackend::archiveRemove(QString id)
{
    archiveLoad();
    const int i = archiveIndex(id);
    if (i < 0)
        return false;
    const QJsonObject o = m_archive.at(i).toObject();
    QFile::remove(vaultDir() + QLatin1Char('/') + o.value(QStringLiteral("local")).toString());
    const QString cid = o.value(QStringLiteral("cid")).toString();
    if (!cid.isEmpty() && storageState() == 2) {
        const LogosResult r = modules().storage_module.remove(cid);
        if (!r.success)
            qWarning().noquote() << "production_office: storage remove failed:" << errText(r);
    }
    m_uploadQueue.removeAll(id);
    m_archive.removeAt(i);
    setStatus(QStringLiteral("Removed %1 from the archive").arg(o.value(QStringLiteral("name")).toString()));
    return archivePersist();
}

int ProductionOfficeBackend::archiveRemoveEvent(QString eventId)
{
    archiveLoad();
    QStringList ids;
    for (const QJsonValue& v : m_archive)
        if (v.toObject().value(QStringLiteral("eventId")).toString() == eventId)
            ids.append(v.toObject().value(QStringLiteral("id")).toString());
    for (const QString& id : ids)
        archiveRemove(id);
    QDir(vaultDir() + QLatin1Char('/') + eventId).removeRecursively();
    return ids.size();
}

QString ProductionOfficeBackend::archiveFileUrl(QString id)
{
    archiveLoad();
    const int i = archiveIndex(id);
    if (i < 0)
        return QString();
    const QString path = vaultDir() + QLatin1Char('/') + m_archive.at(i).toObject().value(QStringLiteral("local")).toString();
    return QFileInfo::exists(path) ? QUrl::fromLocalFile(path).toString() : QString();
}

bool ProductionOfficeBackend::archiveExport(QString id, QString destUrl)
{
    archiveLoad();
    const int i = archiveIndex(id);
    if (i < 0)
        return false;
    const QJsonObject o = m_archive.at(i).toObject();
    QString dest = toLocalPath(destUrl);
    if (QFileInfo(dest).isDir())
        dest = QDir(dest).filePath(o.value(QStringLiteral("name")).toString());
    const QString src = vaultDir() + QLatin1Char('/') + o.value(QStringLiteral("local")).toString();
    if (QFileInfo::exists(src)) {
        QFile::remove(dest);
        if (QFile::copy(src, dest)) {
            QFile::setPermissions(dest, QFileDevice::ReadOwner | QFileDevice::WriteOwner);
            setStatus(QStringLiteral("Saved %1").arg(dest));
            return true;
        }
        setStatus(QStringLiteral("Couldn't save to %1").arg(dest));
        return false;
    }
    // The vault copy is gone: fetch it back from this machine's Logos Storage
    // node. local=true keeps it off the network; advertise=false keeps it private.
    const QString cid = o.value(QStringLiteral("cid")).toString();
    if (cid.isEmpty() || storageState() != 2) {
        setStatus(QStringLiteral("That file is no longer on this machine"));
        return false;
    }
    const LogosResult r = modules().storage_module.downloadToUrl(cid, dest, true, 65536, false, false);
    if (!r.success) {
        setStatus(QStringLiteral("Couldn't restore from Logos Storage: %1").arg(errText(r)));
        return false;
    }
    setStatus(QStringLiteral("Restoring %1 from Logos Storage…").arg(o.value(QStringLiteral("name")).toString()));
    return true;
}

// ── Logos Storage ───────────────────────────────────────────────────

void ProductionOfficeBackend::setStorage(int state, const QString& note)
{
    setStorageState(state);
    setStorageNote(note);
}

void ProductionOfficeBackend::subscribeStorage()
{
    if (m_storageSubscribed)
        return;
    m_storageSubscribed = true;
    modules().storage_module.onStorageUploadDone([this](const auto& payload) { onUploadDone(qs(payload)); });
    modules().storage_module.onStorageStart([this](const auto& payload) {
        const QJsonObject o = QJsonDocument::fromJson(qs(payload).toUtf8()).object();
        if (o.value(QStringLiteral("success")).toBool() && storageState() != 2) {
            setStorage(2, QStringLiteral("Connected to your Logos Storage node"));
            pumpUploads();
        }
    });
}

bool ProductionOfficeBackend::storageConnect()
{
    archiveLoad();
    if (storageState() == 1 || storageState() == 2)
        return true;
    setStorage(1, QStringLiteral("Connecting to Logos Storage… the first start can take a minute"));
    // Never block the slot: init/start can take over a minute on a cold start.
    QTimer::singleShot(0, this, [this]() { doStorageStart(); });
    return true;
}

void ProductionOfficeBackend::doStorageStart()
{
    if (modules().storage_module.isRunning()) {
        setStorage(2, QStringLiteral("Connected to your Logos Storage node"));
        pumpUploads();
        return;
    }
    const QString dataDir = m_dir + QStringLiteral("/storage-node");
    QDir().mkpath(dataDir);
    QJsonObject cfg;
    cfg.insert(QStringLiteral("data-dir"), dataDir);
    cfg.insert(QStringLiteral("log-level"), QStringLiteral("WARN"));
    cfg.insert(QStringLiteral("log-file"), dataDir + QStringLiteral("/storage.log"));
    cfg.insert(QStringLiteral("listen-port"), 8084);
    cfg.insert(QStringLiteral("disc-port"), 8094);
    const QString cfgJson = QString::fromUtf8(QJsonDocument(cfg).toJson(QJsonDocument::Compact));

    // init() returns false when another module already initialised the shared
    // node; that is fine as long as start() (or isRunning) succeeds.
    const bool initOk = modules().storage_module.init(cfgJson);
    const bool startOk = modules().storage_module.start();
    if (!startOk && !initOk && !modules().storage_module.isRunning()) {
        setStorage(3, QStringLiteral("Couldn't start Logos Storage. Files stay safe in the local vault"));
        return;
    }
    setStorage(2, QStringLiteral("Connected to your Logos Storage node"));
    pumpUploads();
}

void ProductionOfficeBackend::pumpUploads()
{
    if (storageState() != 2 || !m_uploadItem.isEmpty())
        return;
    while (!m_uploadQueue.isEmpty()) {
        const QString id = m_uploadQueue.takeFirst();
        const int i = archiveIndex(id);
        if (i < 0)
            continue;
        const QJsonObject o = m_archive.at(i).toObject();
        if (!o.value(QStringLiteral("cid")).toString().isEmpty())
            continue;
        const QString path = vaultDir() + QLatin1Char('/') + o.value(QStringLiteral("local")).toString();
        if (!QFileInfo::exists(path))
            continue;
        // advertise=false: neither announced to the DHT nor served to peers.
        const LogosResult r = modules().storage_module.uploadUrl(path, 65536, false);
        if (!r.success) {
            qWarning().noquote() << "production_office: uploadUrl failed:" << errText(r);
            setStorageNote(QStringLiteral("Couldn't store %1 on Logos Storage: %2")
                               .arg(o.value(QStringLiteral("name")).toString(), errText(r)));
            continue;
        }
        m_uploadItem = id;
        m_uploadSession = r.value.toString();
        setStorageNote(QStringLiteral("Storing %1 on Logos Storage…").arg(o.value(QStringLiteral("name")).toString()));
        return;  // one at a time; storageUploadDone continues the queue
    }
    setStorageNote(QStringLiteral("Connected · every file is stored on your node and kept private"));
}

void ProductionOfficeBackend::onUploadDone(const QString& payload)
{
    const QJsonObject o = QJsonDocument::fromJson(payload.toUtf8()).object();
    const QString session = o.value(QStringLiteral("sessionId")).toString();
    if (m_uploadItem.isEmpty())
        return;
    // Some builds return an empty session id from uploadUrl; then the one
    // upload in flight is ours.
    if (!m_uploadSession.isEmpty() && !session.isEmpty() && session != m_uploadSession)
        return;
    const QString id = m_uploadItem;
    m_uploadItem.clear();
    m_uploadSession.clear();
    const int i = archiveIndex(id);
    if (i >= 0) {
        QJsonObject item = m_archive.at(i).toObject();
        if (o.value(QStringLiteral("success")).toBool()) {
            item.insert(QStringLiteral("cid"), o.value(QStringLiteral("cid")).toString());
            item.insert(QStringLiteral("storedAt"), QDateTime::currentDateTimeUtc().toString(Qt::ISODate));
        } else {
            item.insert(QStringLiteral("storageError"), o.value(QStringLiteral("error")).toString());
        }
        m_archive.replace(i, item);
        archivePersist();
    }
    pumpUploads();
}
