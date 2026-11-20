import QtQuick
import QtQuick.Controls
import QtMultimedia

// Video player for the INTERSECT carousels. Main.qml loads this file through a
// Loader, so a Basecamp build without Qt Multimedia falls back to a poster
// with an "Open video" button instead of failing to load the whole view.
Item {
    id: stage
    property url source
    property url poster
    property string title: ""
    readonly property bool playing: player.playbackState === MediaPlayer.PlayingState

    function stop() { player.stop() }

    MediaPlayer {
        id: player
        source: stage.source
        videoOutput: out
        audioOutput: AudioOutput { id: audio }
    }

    Rectangle { anchors.fill: parent; color: "#1D2121" }
    VideoOutput {
        id: out
        anchors.fill: parent
        fillMode: VideoOutput.PreserveAspectFit
    }
    Image {
        anchors.fill: parent
        source: stage.poster
        fillMode: Image.PreserveAspectFit
        visible: player.playbackState === MediaPlayer.StoppedState && player.position === 0
        asynchronous: true
    }

    // Controls
    Rectangle {
        id: bar
        anchors { left: parent.left; right: parent.right; bottom: parent.bottom }
        height: 46
        color: Qt.rgba(0.11, 0.13, 0.13, 0.78)
        Row {
            anchors { left: parent.left; leftMargin: 10; verticalCenter: parent.verticalCenter }
            spacing: 10
            Rectangle {
                width: 30; height: 30; radius: 2
                color: playMa.containsMouse ? "#B9ED00" : "transparent"
                border.color: "#B9ED00"
                Text {
                    anchors.centerIn: parent
                    text: stage.playing ? "❚❚" : "▶"
                    color: playMa.containsMouse ? "#1D2121" : "#B9ED00"
                    font.pixelSize: 12
                }
                MouseArea {
                    id: playMa; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor
                    onClicked: stage.playing ? player.pause() : player.play()
                }
                Accessible.role: Accessible.Button
                Accessible.name: stage.playing ? "Pause" : "Play"
            }
            Text {
                anchors.verticalCenter: parent.verticalCenter
                color: "#ECE9E9"
                font.pixelSize: 12
                font.family: "Space Mono"
                text: {
                    function t(ms) { var s = Math.floor(ms / 1000); return Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60) }
                    return t(player.position) + " / " + t(player.duration)
                }
            }
        }
        Slider {
            anchors { left: parent.left; leftMargin: 150; right: muteBtn.left; rightMargin: 12; verticalCenter: parent.verticalCenter }
            from: 0; to: Math.max(1, player.duration)
            value: player.position
            enabled: player.seekable
            onMoved: player.position = value
            Accessible.name: "Seek"
        }
        Rectangle {
            id: muteBtn
            anchors { right: parent.right; rightMargin: 10; verticalCenter: parent.verticalCenter }
            width: 54; height: 26; radius: 2
            color: "transparent"
            border.color: "#CECECE"
            Text { anchors.centerIn: parent; text: audio.muted ? "Sound" : "Mute"; color: "#ECE9E9"; font.pixelSize: 11 }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: audio.muted = !audio.muted }
            Accessible.role: Accessible.Button
            Accessible.name: audio.muted ? "Unmute" : "Mute"
        }
    }
}
