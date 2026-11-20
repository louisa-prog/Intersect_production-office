#include "production_office_backend.h"

#include <QDateTime>
#include <QDebug>
#include <QDir>
#include <QFile>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonParseError>
#include <QRegularExpression>
#include <QSaveFile>
#include <QStandardPaths>
#include <string>
#include <type_traits>

namespace {

// instancePersistencePath() is a host-owned, per-instance writable folder. It is
// empty when the backend runs outside a host, so fall back to the app data dir.
// Accept either std::string or QString from the SDK.
template <typename T>
QString toQString(const T& v)
{
    if constexpr (std::is_same_v<std::decay_t<T>, QString>)
        return v;
    else
        return QString::fromStdString(std::string(v));
}

constexpr int kMaxEventBytes = 4 * 1024 * 1024;  // one event document

} // namespace

void ProductionOfficeBackend::onContextReady()
{
    m_dir = toQString(instancePersistencePath());
    if (m_dir.isEmpty())
        m_dir = QStandardPaths::writableLocation(QStandardPaths::AppDataLocation)
                + QStringLiteral("/production_office");
    QDir().mkpath(m_dir);
    setStoragePath(dataFile());
    m_loaded = false;
    ensureLoaded();
    m_archiveLoaded = false;
    archiveLoad();
    subscribeStorage();
}

QString ProductionOfficeBackend::dataFile() const
{
    return m_dir + QStringLiteral("/events.json");
}

bool ProductionOfficeBackend::validId(const QString& id)
{
    static const QRegularExpression re(QStringLiteral("^[A-Za-z0-9_.:-]{1,80}$"));
    return re.match(id).hasMatch();
}

void ProductionOfficeBackend::ensureLoaded()
{
    if (m_loaded)
        return;
    if (m_dir.isEmpty()) {
        m_dir = QStandardPaths::writableLocation(QStandardPaths::AppDataLocation)
                + QStringLiteral("/production_office");
        QDir().mkpath(m_dir);
        setStoragePath(dataFile());
    }
    m_loaded = true;
    m_events.clear();

    QFile f(dataFile());
    if (!f.exists()) {
        setStatus(QStringLiteral("Ready · no events yet"));
        return;
    }
    if (!f.open(QIODevice::ReadOnly)) {
        setStatus(QStringLiteral("Can't open %1").arg(dataFile()));
        return;
    }
    const QByteArray bytes = f.readAll();
    f.close();

    QJsonParseError err{};
    const QJsonDocument doc = QJsonDocument::fromJson(bytes, &err);
    if (err.error != QJsonParseError::NoError || !doc.isObject()) {
        // Keep the unreadable file for recovery instead of overwriting it.
        const QString aside = m_dir + QStringLiteral("/events.unreadable-%1.json")
                                  .arg(QDateTime::currentSecsSinceEpoch());
        QFile::copy(dataFile(), aside);
        setStatus(QStringLiteral("Events file was unreadable; kept a copy at %1").arg(aside));
        qWarning() << "production_office: events.json parse error:" << err.errorString();
        return;
    }

    const QJsonObject events = doc.object().value(QStringLiteral("events")).toObject();
    for (auto it = events.begin(); it != events.end(); ++it) {
        if (validId(it.key()) && it.value().isObject())
            m_events.insert(it.key(), it.value().toObject());
    }

    // Keep the last good load as a backup before any new write replaces it.
    const QString backup = m_dir + QStringLiteral("/events.backup.json");
    QFile::remove(backup);
    QFile::copy(dataFile(), backup);

    setStatus(QStringLiteral("Ready · %1 event%2").arg(m_events.size()).arg(m_events.size() == 1 ? "" : "s"));
}

bool ProductionOfficeBackend::persist()
{
    QJsonObject events;
    for (auto it = m_events.cbegin(); it != m_events.cend(); ++it)
        events.insert(it.key(), it.value());

    QJsonObject root;
    root.insert(QStringLiteral("format"), QStringLiteral("production-office/1"));
    root.insert(QStringLiteral("savedAt"), QDateTime::currentDateTimeUtc().toString(Qt::ISODate));
    root.insert(QStringLiteral("events"), events);

    QSaveFile f(dataFile());
    if (!f.open(QIODevice::WriteOnly)) {
        setStatus(QStringLiteral("Not saved: can't write %1").arg(dataFile()));
        return false;
    }
    f.write(QJsonDocument(root).toJson(QJsonDocument::Compact));
    if (!f.commit()) {
        setStatus(QStringLiteral("Not saved: %1").arg(f.errorString()));
        return false;
    }
    setRevision(revision() + 1);
    setStatus(QStringLiteral("Saved %1").arg(QDateTime::currentDateTime().toString(QStringLiteral("HH:mm"))));
    return true;
}

QString ProductionOfficeBackend::listEvents()
{
    ensureLoaded();
    QJsonArray arr;
    for (auto it = m_events.cbegin(); it != m_events.cend(); ++it) {
        QJsonObject row;
        row.insert(QStringLiteral("id"), it.key());
        row.insert(QStringLiteral("data"), it.value());
        arr.append(row);
    }
    return QString::fromUtf8(QJsonDocument(arr).toJson(QJsonDocument::Compact));
}

bool ProductionOfficeBackend::saveEvent(QString id, QString json)
{
    ensureLoaded();
    if (!validId(id)) {
        setStatus(QStringLiteral("Not saved: invalid event id"));
        return false;
    }
    const QByteArray bytes = json.toUtf8();
    if (bytes.size() > kMaxEventBytes) {
        setStatus(QStringLiteral("Not saved: event is larger than 4 MB"));
        return false;
    }
    QJsonParseError err{};
    const QJsonDocument doc = QJsonDocument::fromJson(bytes, &err);
    if (err.error != QJsonParseError::NoError || !doc.isObject()) {
        setStatus(QStringLiteral("Not saved: %1").arg(err.errorString()));
        return false;
    }
    m_events.insert(id, doc.object());
    return persist();
}

bool ProductionOfficeBackend::deleteEvent(QString id)
{
    ensureLoaded();
    if (!m_events.contains(id))
        return false;
    m_events.remove(id);
    return persist();
}

QString ProductionOfficeBackend::exportAll()
{
    ensureLoaded();
    QJsonObject events;
    for (auto it = m_events.cbegin(); it != m_events.cend(); ++it)
        events.insert(it.key(), it.value());
    QJsonObject root;
    root.insert(QStringLiteral("format"), QStringLiteral("production-office/1"));
    root.insert(QStringLiteral("exportedAt"), QDateTime::currentDateTimeUtc().toString(Qt::ISODate));
    root.insert(QStringLiteral("events"), events);
    return QString::fromUtf8(QJsonDocument(root).toJson(QJsonDocument::Indented));
}

int ProductionOfficeBackend::importAll(QString json)
{
    ensureLoaded();
    QJsonParseError err{};
    const QJsonDocument doc = QJsonDocument::fromJson(json.toUtf8(), &err);
    if (err.error != QJsonParseError::NoError || !doc.isObject()) {
        setStatus(QStringLiteral("Import failed: %1").arg(err.errorString()));
        return 0;
    }
    const QJsonObject events = doc.object().value(QStringLiteral("events")).toObject();
    int n = 0;
    for (auto it = events.begin(); it != events.end(); ++it) {
        if (!validId(it.key()) || !it.value().isObject())
            continue;
        m_events.insert(it.key(), it.value().toObject());
        ++n;
    }
    if (n > 0 && !persist())
        return 0;
    if (n == 0)
        setStatus(QStringLiteral("Import found no events"));
    return n;
}
