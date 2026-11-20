import QtQuick
import QtQuick.Dialogs

// System file dialogs for the Intersect Archive. Loaded through a Loader so the
// view still works (with a path field) where QtQuick.Dialogs isn't available.
Item {
    id: picker
    signal picked(var urls)
    signal savePicked(url fileUrl)
    property string suggestedName: ""

    function open() { openDlg.open() }
    function saveAs(name) { picker.suggestedName = name; saveDlg.selectedFile = name; saveDlg.open() }

    FileDialog {
        id: openDlg
        title: "Add files to the Intersect Archive"
        fileMode: FileDialog.OpenFiles
        onAccepted: picker.picked(selectedFiles)
    }
    FileDialog {
        id: saveDlg
        title: "Save a copy"
        fileMode: FileDialog.SaveFile
        onAccepted: picker.savePicked(selectedFile)
    }
}
