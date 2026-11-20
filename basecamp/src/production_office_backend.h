#pragma once

#include "rep_production_office_source.h"
#include "logos_module_context.h"

#include <QJsonArray>
#include <QJsonObject>
#include <QMap>
#include <QString>
#include <QStringList>

/**
 * Production Office backend.
 *
 * Runs as the core module `production_office_backend` (metadata.json
 * "backend": "module"). It keeps every event as one JSON document and writes
 * them all to `events.json` in the module's data folder after each change.
 * Writes go through QSaveFile, so a crash mid-write never leaves a half-written
 * file; the previous good copy is kept as `events.backup.json`.
 *
 * The event schema lives in the QML view (src/qml/templates.js). The backend
 * treats each event as an opaque JSON object, so new modules and formats need
 * no backend change.
 *
 * The Intersect Archive (production_office_archive.cpp) keeps private files
 * per event and module: each file is copied into a vault under the module's
 * data folder, then stored on the local Logos Storage node with
 * advertise=false, so it is neither announced to the DHT nor served to peers.
 *
 * View contract (src/production_office.rep):
 *   listEvents()          all events as a JSON array of {"id", "data"} objects
 *   saveEvent(id, json)   create or replace one event (json is a JSON object)
 *   deleteEvent(id)       remove one event for good
 *   exportAll()           every event as one JSON object keyed by id (backup)
 *   importAll(json)       merge a backup made by exportAll(); returns the count
 *   status                "Ready", "Saved 14:02" or the last error
 *   revision              bumped on every change
 *   storagePath           where events.json lives on this machine
 */
class ProductionOfficeBackend : public ProductionOfficeSimpleSource,
                                public LogosModuleContext
{
public:
    QString listEvents() override;
    bool saveEvent(QString id, QString json) override;
    bool deleteEvent(QString id) override;
    QString exportAll() override;
    int importAll(QString json) override;

    // Intersect Archive (production_office_archive.cpp)
    QString archiveList(QString eventId) override;
    QString archiveAdd(QString eventId, QString module, QString fileUrl, QString note) override;
    bool archiveUpdate(QString id, QString module, QString note) override;
    bool archiveRemove(QString id) override;
    int archiveRemoveEvent(QString eventId) override;
    QString archiveFileUrl(QString id) override;
    bool archiveExport(QString id, QString destUrl) override;
    bool storageConnect() override;

    void onContextReady() override;

private:
    // archive
    void archiveLoad();
    bool archivePersist();
    QString archiveFile() const;
    QString vaultDir() const;
    int archiveIndex(const QString& id) const;
    void subscribeStorage();
    void doStorageStart();
    void pumpUploads();
    void onUploadDone(const QString& payload);
    void setStorage(int state, const QString& note);

    QJsonArray m_archive;              // items, newest last
    bool m_archiveLoaded = false;
    bool m_storageSubscribed = false;
    QStringList m_uploadQueue;         // item ids waiting for Logos Storage
    QString m_uploadItem;              // item id in flight
    QString m_uploadSession;           // its storage session id


    void ensureLoaded();
    bool persist();
    QString dataFile() const;
    static bool validId(const QString& id);

    QMap<QString, QJsonObject> m_events;
    QString m_dir;
    bool m_loaded = false;
};
