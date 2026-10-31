
"use strict";

/* =====================================================
   SIGNCONNECT - COMPLETE JAVASCRIPT
   1. Text to ASL fingerspelling
   2. Camera hand recognition
   3. ASL alphabet sample collection
   ===================================================== */


/* =====================================================
   1. CONFIGURATION
   ===================================================== */

const MEDIAPIPE_VERSION = "0.10.14";

const MODEL_URL =
    "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task";

const STORAGE_KEY = "signconnect_asl_samples_v2";

const ASL_LABELS = [
    ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "HELLO",
    "THANK YOU",
    "YES",
    "NO",
    "PLEASE",
    "HELP",
    "SORRY",
    "LOVE"
];


/* =====================================================
   2. GLOBAL VARIABLES
   ===================================================== */

let cameraStream = null;
let gestureRecognizer = null;
let cameraRunning = false;
let animationFrame = null;
let lastVideoTime = -1;

let latestFeatures = null;
let collectingSamples = false;
let trainingData = [];


/* =====================================================
   3. HTML ELEMENT HELPER
   ===================================================== */

function getElement(id) {
    return document.getElementById(id);
}

function showMessage(id, message) {
    const target = getElement(id);

    if (target) {
        target.textContent = message;
    }
}


/* =====================================================
   4. ASL ALPHABET IMAGE COORDINATES

   Image file:
   static/asl_alphabet.jpeg

   Original image dimensions:
   1292 x 1598 pixels

   Each rectangle crops the hand area.
   ===================================================== */

const alphabetCrops = {

    A: [100, 130, 125, 200],
    B: [330, 120, 125, 220],
    C: [610, 150, 130, 205],
    D: [830, 145, 130, 215],
    E: [1030, 170, 130, 210],

    F: [80, 350, 130, 190],
    G: [330, 390, 130, 150],
    H: [600, 390, 140, 160],
    I: [825, 365, 125, 180],
    J: [1025, 360, 140, 185],

    K: [85, 590, 130, 190],
    L: [330, 585, 135, 195],
    M: [590, 610, 130, 170],
    N: [815, 630, 125, 160],
    O: [1030, 610, 130, 190],

    P: [75, 800, 135, 160],
    Q: [330, 810, 130, 170],
    R: [590, 780, 130, 190],
    S: [810, 825, 130, 150],
    T: [1030, 820, 130, 165],

    U: [90, 1010, 125, 180],
    V: [330, 1010, 135, 180],
    W: [590, 1010, 140, 195],
    X: [815, 1030, 130, 170],
    Y: [1030, 1030, 145, 175],

    Z: [75, 1460, 140, 138]
};


/* =====================================================
   5. TEXT TO ASL INTERPRETATION
   ===================================================== */

function interpretText() {

    const input = getElement("textInput");
    const output = getElement("interpretResult");

    if (!input || !output) {
        console.error("Text interpreter HTML elements are missing.");
        return;
    }

    const text = input.value.trim().toUpperCase();

    output.innerHTML = "";

    if (!text) {
        output.textContent = "Please enter a word or sentence.";
        return;
    }

    const chart = new Image();

    output.textContent = "Loading ASL alphabet gestures...";

    chart.onload = function () {

        output.innerHTML = "";

        const heading = document.createElement("h3");
        heading.textContent = "ASL Fingerspelling Sequence";

        const description = document.createElement("p");
        description.textContent =
            "Your text is displayed as ASL alphabet handshapes.";

        output.appendChild(heading);
        output.appendChild(description);

        const container = document.createElement("div");

        container.style.display = "flex";
        container.style.flexWrap = "wrap";
        container.style.justifyContent = "center";
        container.style.alignItems = "flex-start";
        container.style.gap = "15px";
        container.style.marginTop = "20px";

        let unsupportedCharacters = [];

        for (const character of text) {

            if (character === " ") {

                const space = document.createElement("div");
                space.style.width = "20px";
                space.style.height = "20px";

                container.appendChild(space);
                continue;
            }

            const crop = alphabetCrops[character];

            if (!crop) {
                unsupportedCharacters.push(character);
                continue;
            }

            const [x, y, width, height] = crop;

            const canvas = document.createElement("canvas");

            canvas.width = 180;
            canvas.height = 190;

            const context = canvas.getContext("2d");

            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, canvas.width, canvas.height);

            /*
             * Check crop coordinates before drawing.
             */

            if (
                x < 0 ||
                y < 0 ||
                x + width > chart.naturalWidth ||
                y + height > chart.naturalHeight
            ) {
                console.warn(
                    "Invalid crop coordinates for letter:",
                    character
                );

                unsupportedCharacters.push(character);
                continue;
            }

            context.drawImage(
                chart,
                x,
                y,
                width,
                height,
                10,
                5,
                160,
                175
            );

            const card = document.createElement("div");

            card.style.width = "155px";
            card.style.padding = "12px";
            card.style.background = "#ffffff";
            card.style.border = "1px solid #dddddd";
            card.style.borderRadius = "12px";
            card.style.textAlign = "center";
            card.style.boxShadow =
                "0 3px 10px rgba(0,0,0,0.08)";
            card.style.boxSizing = "border-box";

            const letter = document.createElement("h2");

            letter.textContent = character;
            letter.style.margin = "0 0 8px 0";
            letter.style.color = "#242b55";

            const gestureImage = document.createElement("img");

            gestureImage.src = canvas.toDataURL("image/png");
            gestureImage.alt =
                "ASL handshape for letter " + character;

            gestureImage.style.width = "100%";
            gestureImage.style.height = "145px";
            gestureImage.style.objectFit = "contain";
            gestureImage.style.display = "block";

            card.appendChild(letter);
            card.appendChild(gestureImage);

            container.appendChild(card);
        }

        output.appendChild(container);

        if (unsupportedCharacters.length > 0) {

            const warning = document.createElement("p");

            warning.textContent =
                "Could not display: " +
                unsupportedCharacters.join(", ");

            warning.style.color = "red";

            output.appendChild(warning);
        }

        const note = document.createElement("p");

        note.textContent =
            "Note: J and Z involve movement. This chart shows their illustrated movement signs.";

        note.style.marginTop = "18px";
        note.style.fontSize = "13px";

        output.appendChild(note);
    };

    chart.onerror = function () {

        output.textContent =
            "ASL chart not found. Please check static/asl_alphabet.jpeg.";

        console.error(
            "Could not load /static/asl_alphabet.jpeg"
        );
    };

    chart.src = "/static/asl_alphabet.jpeg";
}


/* =====================================================
   6. LOAD TRAINING DATA FROM BROWSER
   ===================================================== */

function loadTrainingData() {

    try {

        const saved = localStorage.getItem(STORAGE_KEY);

        trainingData = saved ? JSON.parse(saved) : [];

        if (!Array.isArray(trainingData)) {
            trainingData = [];
        }

    } catch (error) {

        console.error("Training data loading error:", error);

        trainingData = [];
    }
}


function saveTrainingData() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(trainingData)
        );

        updateTrainingSummary();

    } catch (error) {

        console.error("Could not save training data:", error);

        showMessage(
            "trainingStatus",
            "Storage is full. Clear some training samples."
        );
    }
}


/* =====================================================
   7. LOAD MEDIAPIPE GESTURE RECOGNIZER
   ===================================================== */

async function loadGestureRecognizer() {

    if (gestureRecognizer) {
        return gestureRecognizer;
    }

    showMessage(
        "cameraMessage",
        "Loading hand recognition model..."
    );

    const moduleURL =
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@" +
        MEDIAPIPE_VERSION +
        "/vision_bundle.mjs";

    const wasmURL =
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@" +
        MEDIAPIPE_VERSION +
        "/wasm";

    const visionModule = await import(moduleURL);

    const vision =
        await visionModule.FilesetResolver.forVisionTasks(
            wasmURL
        );

    gestureRecognizer =
        await visionModule.GestureRecognizer.createFromOptions(
            vision,
            {
                baseOptions: {
                    modelAssetPath: MODEL_URL,
                    delegate: "CPU"
                },

                runningMode: "VIDEO",
                numHands: 1
            }
        );

    return gestureRecognizer;
}


/* =====================================================
   8. START CAMERA
   ===================================================== */

async function startCamera() {

    const video = getElement("cameraVideo");
    const message = getElement("cameraMessage");

    if (!video || !message) {

        alert("Camera HTML elements are missing.");

        return;
    }

    if (cameraRunning) {
        return;
    }

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        message.textContent =
            "Camera requires HTTPS or localhost.";

        return;
    }

    try {

        message.style.display = "block";

        message.textContent =
            "Requesting camera permission...";

        cameraStream =
            await navigator.mediaDevices.getUserMedia({

                video: {
                    facingMode: "user",
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                },

                audio: false
            });

        video.srcObject = cameraStream;

        video.muted = true;
        video.playsInline = true;
        video.style.display = "block";

        await video.play();

        message.textContent =
            "Camera opened. Loading recognition model...";

        await loadGestureRecognizer();

        cameraRunning = true;

        lastVideoTime = -1;

        message.style.display = "none";

        showMessage(
            "gestureResult",
            "Recognition ready. Show your hand."
        );

        predictHand();

    } catch (error) {

        console.error("Camera startup error:", error);

        stopCamera();

        message.style.display = "block";

        message.textContent =
            "Camera error: " +
            error.message +
            ". Check camera permission and internet connection.";
    }
}


/* =====================================================
   9. STOP CAMERA
   ===================================================== */

function stopCamera() {

    cameraRunning = false;
    collectingSamples = false;

    if (animationFrame !== null) {

        cancelAnimationFrame(animationFrame);

        animationFrame = null;
    }

    if (cameraStream) {

        cameraStream.getTracks().forEach(track => {
            track.stop();
        });

        cameraStream = null;
    }

    const video = getElement("cameraVideo");

    if (video) {

        video.pause();
        video.srcObject = null;
        video.style.display = "none";
    }

    const message = getElement("cameraMessage");

    if (message) {

        message.textContent = "Camera is currently off.";

        message.style.display = "block";
    }

    showMessage(
        "gestureResult",
        "Camera stopped."
    );
}


/* =====================================================
   10. NORMALIZE HAND LANDMARKS
   ===================================================== */

function normalizeLandmarks(landmarks) {

    if (!landmarks || landmarks.length !== 21) {
        return null;
    }

    const wrist = landmarks[0];

    const features = [];

    let maxDistance = 0;

    for (const point of landmarks) {

        const x = point.x - wrist.x;
        const y = point.y - wrist.y;
        const z = point.z - wrist.z;

        features.push(x, y, z);

        const distance = Math.sqrt(
            x * x + y * y + z * z
        );

        maxDistance = Math.max(
            maxDistance,
            distance
        );
    }

    if (maxDistance < 0.000001) {
        return null;
    }

    return features.map(value => value / maxDistance);
}


/* =====================================================
   11. DISTANCE CALCULATION
   ===================================================== */

function calculateDistance(first, second) {

    if (
        !first ||
        !second ||
        first.length !== second.length
    ) {
        return Infinity;
    }

    let total = 0;

    for (let i = 0; i < first.length; i++) {

        const difference = first[i] - second[i];

        total += difference * difference;
    }

    return Math.sqrt(total / first.length);
}


/* =====================================================
   12. CUSTOM TRAINED SIGN RECOGNITION
   ===================================================== */

function recognizeTrainedSign(features) {

    if (!trainingData.length) {
        return null;
    }

    const nearest = trainingData

        .map(sample => ({

            label: sample.label,

            distance: calculateDistance(
                features,
                sample.features
            )

        }))

        .filter(item => Number.isFinite(item.distance))

        .sort((a, b) => a.distance - b.distance)

        .slice(0, 5);

    if (!nearest.length) {
        return null;
    }

    const votes = {};

    nearest.forEach(item => {

        votes[item.label] =
            (votes[item.label] || 0) + 1;

    });

    const bestLabel = Object.keys(votes).sort(
        (a, b) => votes[b] - votes[a]
    )[0];

    const bestDistance = nearest[0].distance;

    if (bestDistance > 0.18) {

        return {
            label: "Unknown",
            score: 0
        };
    }

    return {

        label: bestLabel,

        score: votes[bestLabel] / nearest.length
    };
}


/* =====================================================
   13. DISPLAY RECOGNITION RESULT
   ===================================================== */

function displayRecognition(results, features) {

    const trained = recognizeTrainedSign(features);

    if (trained && trained.label !== "Unknown") {

        showMessage(
            "gestureResult",

            "ASL sign: " +
            trained.label +
            " | Nearest-sample vote: " +
            Math.round(trained.score * 100) +
            "%"
        );

        return;
    }

    const gestures = results.gestures;

    if (
        gestures &&
        gestures.length > 0 &&
        gestures[0].length > 0
    ) {

        const topGesture = gestures[0][0];

        const gestureNames = {

            "Closed_Fist": "Closed Fist",
            "Open_Palm": "Open Palm",
            "Pointing_Up": "Pointing Up",
            "Thumb_Down": "Thumbs Down",
            "Thumb_Up": "Thumbs Up",
            "Victory": "Victory",
            "ILoveYou": "I Love You"

        };

        const name =
            gestureNames[topGesture.categoryName] ||
            topGesture.categoryName;

        showMessage(
            "gestureResult",

            "Common gesture detected: " +
            name +
            " | Model score: " +
            Math.round(topGesture.score * 100) +
            "%"
        );

    } else {

        showMessage(
            "gestureResult",

            "Hand detected, but no built-in gesture matched. Train an ASL letter below."
        );
    }
}


/* =====================================================
   14. PROCESS CAMERA FRAMES
   ===================================================== */

function predictHand() {

    if (!cameraRunning || !gestureRecognizer) {
        return;
    }

    const video = getElement("cameraVideo");

    if (!video || video.readyState < 2) {

        animationFrame =
            requestAnimationFrame(predictHand);

        return;
    }

    if (video.currentTime !== lastVideoTime) {

        lastVideoTime = video.currentTime;

        try {

            const results =
                gestureRecognizer.recognizeForVideo(
                    video,
                    performance.now()
                );

            if (
                results.landmarks &&
                results.landmarks.length > 0
            ) {

                latestFeatures =
                    normalizeLandmarks(results.landmarks[0]);

                if (latestFeatures && !collectingSamples) {

                    displayRecognition(
                        results,
                        latestFeatures
                    );
                }

            } else {

                latestFeatures = null;

                if (!collectingSamples) {

                    showMessage(
                        "gestureResult",

                        "No hand detected. Place your hand clearly in front of the camera."
                    );
                }
            }

        } catch (error) {

            console.error(
                "Camera recognition error:",
                error
            );

            showMessage(
                "gestureResult",
                "Could not process camera frame: " +
                error.message
            );
        }
    }

    animationFrame =
        requestAnimationFrame(predictHand);
}


/* =====================================================
   15. INITIALIZE TRAINING DROPDOWN
   ===================================================== */

function initializeTraining() {

    const select = getElement("trainingLabel");

    if (!select) {
        return;
    }

    select.innerHTML = "";

    ASL_LABELS.forEach(label => {

        const option = document.createElement("option");

        option.value = label;
        option.textContent = label;

        select.appendChild(option);
    });

    updateTrainingSummary();
}


/* =====================================================
   16. COLLECT TRAINING SAMPLES
   ===================================================== */

async function collectTrainingSamples() {

    if (!cameraRunning) {

        showMessage(
            "trainingStatus",
            "Start the camera before collecting samples."
        );

        return;
    }

    if (collectingSamples) {
        return;
    }

    const select = getElement("trainingLabel");

    if (!select) {

        showMessage(
            "trainingStatus",
            "Training label selector is missing."
        );

        return;
    }

    const label = select.value;

    const collected = [];

    collectingSamples = true;

    showMessage(
        "trainingStatus",

        "Collecting samples for " +
        label +
        ". Hold the correct handshape in front of the camera."
    );

    let attempts = 0;

    while (
        collected.length < 30 &&
        attempts < 180 &&
        cameraRunning
    ) {

        attempts++;

        if (latestFeatures) {

            collected.push({

                label: label,

                features: [...latestFeatures]

            });

            showMessage(
                "trainingStatus",

                "Collected " +
                collected.length +
                " of 30 samples for " +
                label
            );
        }

        await new Promise(resolve => {
            setTimeout(resolve, 120);
        });
    }

    collectingSamples = false;

    if (!cameraRunning) {
        return;
    }

    if (!collected.length) {

        showMessage(
            "trainingStatus",
            "No samples collected. Keep your hand visible and try again."
        );

        return;
    }

    trainingData.push(...collected);

    saveTrainingData();

    showMessage(
        "trainingStatus",

        "Saved " +
        collected.length +
        " samples for " +
        label +
        ". Select the next letter."
    );
}


/* =====================================================
   17. SHOW TRAINING SUMMARY
   ===================================================== */

function updateTrainingSummary() {

    const summary = getElement("trainingSummary");

    if (!summary) {
        return;
    }

    summary.innerHTML = "";

    const counts = {};

    trainingData.forEach(sample => {

        counts[sample.label] =
            (counts[sample.label] || 0) + 1;
    });

    const total = document.createElement("p");

    total.textContent =
        "Total saved samples: " +
        trainingData.length;

    summary.appendChild(total);

    ASL_LABELS.forEach(label => {

        const row = document.createElement("p");

        row.textContent =
            label +
            ": " +
            (counts[label] || 0) +
            " samples";

        summary.appendChild(row);
    });
}


/* =====================================================
   18. CLEAR TRAINING DATA
   ===================================================== */

function clearTrainingData() {

    const confirmed = confirm(
        "Are you sure you want to delete all collected training examples?"
    );

    if (!confirmed) {
        return;
    }

    trainingData = [];

    saveTrainingData();

    showMessage(
        "trainingStatus",
        "All training examples have been cleared."
    );

    showMessage(
        "gestureResult",
        "Training data cleared. Built-in gesture recognition is still available."
    );
}


/* =====================================================
   19. QUIZ FUNCTION
   ===================================================== */

function checkAnswer(button, answer) {

    const result = getElement("quizResult");

    if (!result) {
        return;
    }

    if (answer === "correct") {

        result.textContent = "Correct answer! Well done.";

        result.style.color = "green";

    } else {

        result.textContent = "Incorrect answer. Try again.";

        result.style.color = "red";
    }
}


/* =====================================================
   20. INITIALIZE APPLICATION
   ===================================================== */

function initializeSignConnect() {

    loadTrainingData();

    initializeTraining();

    const startButton = getElement("startCamera");
    const stopButton = getElement("stopCamera");
    const captureButton = getElement("captureSamples");
    const clearButton = getElement("clearTraining");
    const interpretButton = getElement("interpretButton");

    if (startButton) {

        startButton.addEventListener(
            "click",
            startCamera
        );
    }

    if (stopButton) {

        stopButton.addEventListener(
            "click",
            stopCamera
        );
    }

    if (captureButton) {

        captureButton.addEventListener(
            "click",
            collectTrainingSamples
        );
    }

    if (clearButton) {

        clearButton.addEventListener(
            "click",
            clearTrainingData
        );
    }

    if (interpretButton) {

        interpretButton.addEventListener(
            "click",
            interpretText
        );
    }

    console.log(
        "SignConnect application initialized successfully."
    );
}


/* =====================================================
   21. MAKE FUNCTIONS AVAILABLE TO HTML
   ===================================================== */

window.startCamera = startCamera;
window.stopCamera = stopCamera;
window.interpretText = interpretText;
window.checkAnswer = checkAnswer;


/* =====================================================
   22. START APPLICATION AFTER PAGE LOAD
   ===================================================== */

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        initializeSignConnect
    );

} else {

    initializeSignConnect();
}


/* =====================================================
   23. CLEAN UP CAMERA WHEN PAGE CLOSES
   ===================================================== */

window.addEventListener(
    "beforeunload",
    stopCamera
);
