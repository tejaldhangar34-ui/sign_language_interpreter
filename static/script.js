let cameraStream = null;

function startCamera() {
    const video = document.getElementById("cameraVideo");
    const message = document.getElementById("cameraMessage");

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(function(stream) {
            cameraStream = stream;
            video.srcObject = stream;

            video.style.display = "block";
            message.style.display = "none";
        })
        .catch(function(error) {
            console.log(error);
            message.innerText = "Camera permission denied or camera not available.";
            message.style.display = "block";
        });
}

function stopCamera() {
    const video = document.getElementById("cameraVideo");

    if (cameraStream) {
        cameraStream.getTracks().forEach(function(track) {
            track.stop();
        });

        cameraStream = null;
    }

    video.srcObject = null;
    video.style.display = "none";

    document.getElementById("cameraMessage").innerText =
        "Camera is currently off.";

    document.getElementById("cameraMessage").style.display = "block";
}
