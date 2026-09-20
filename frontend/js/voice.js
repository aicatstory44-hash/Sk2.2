/* ==========================================
   SK LIVE VOICE
   Continuous Voice Conversation
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    const micButton =
        document.getElementById("micButton");

    const stopListeningBtn =
        document.getElementById(
            "stopListeningBtn"
        );

    const stopSpeakingBtn =
        document.getElementById(
            "stopSpeakingBtn"
        );

    const transcript =
        document.getElementById("transcript");

    const responseText =
        document.getElementById("responseText");

    const voiceStatus =
        document.getElementById("voiceStatus");

    const voiceHint =
        document.getElementById("voiceHint");

    const voiceCard =
        document.getElementById("voiceCard");

    const languageSelect =
        document.getElementById("languageSelect");

    const detectedLanguage =
        document.getElementById(
            "detectedLanguage"
        );

    const speedRange =
        document.getElementById("speedRange");

    const speedValue =
        document.getElementById("speedValue");

    const volumeRange =
        document.getElementById("volumeRange");

    const volumeValue =
        document.getElementById("volumeValue");

    const connectionText =
        document.getElementById(
            "connectionText"
        );

    const statusDot =
        document.getElementById("statusDot");

    const liveIndicator =
        document.getElementById(
            "liveIndicator"
        );


    /* ==========================================
       CHECK REQUIRED ELEMENTS
    ========================================== */

    if (
        !micButton ||
        !voiceStatus ||
        !transcript ||
        !responseText
    ) {

        console.error(
            "SK Voice: required HTML elements missing."
        );

        return;

    }


    /* ==========================================
       STATE
    ========================================== */

    let recognition = null;

    let liveMode = false;

    let listening = false;

    let speaking = false;

    let processing = false;

    let restartTimer = null;

    let conversation = [];

    let currentRequest = 0;

    let finalTranscriptReceived = false;


    /* ==========================================
       BROWSER SUPPORT
    ========================================== */

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

        showError(
            "Browser does not support voice input."
        );

        micButton.disabled = true;

        return;

    }


    /* ==========================================
       CREATE RECOGNITION
    ========================================== */

    function createRecognition() {

        recognition =
            new SpeechRecognition();

        recognition.continuous = false;

        recognition.interimResults = true;

        recognition.maxAlternatives = 1;

        recognition.lang =
            getRecognitionLanguage();


        /* ======================================
           START
        ====================================== */

        recognition.onstart = () => {

            listening = true;

            finalTranscriptReceived = false;

            voiceCard.classList.add(
                "listening"
            );

            voiceCard.classList.remove(
                "speaking"
            );

            micButton.classList.add(
                "active"
            );

            micButton.textContent = "🔴";

            voiceStatus.textContent =
                "Listening...";

            voiceHint.textContent =
                "Speak naturally.";

            connectionText.textContent =
                "Listening";

            statusDot.className =
                "status-dot listening";

        };


        /* ======================================
           RESULT
        ====================================== */

        recognition.onresult = (event) => {

            let finalText = "";

            let interimText = "";

            for (
                let i = event.resultIndex;
                i < event.results.length;
                i++
            ) {

                const result =
                    event.results[i];

                const text =
                    result[0].transcript;

                if (result.isFinal) {

                    finalText += text;

                } else {

                    interimText += text;

                }

            }


            if (interimText.trim()) {

                transcript.textContent =
                    interimText.trim();

            }


            if (finalText.trim()) {

                finalTranscriptReceived = true;

                const message =
                    finalText.trim();

                transcript.textContent =
                    message;

                detectLanguage(message);

                /*
                 * Stop recognition immediately.
                 * Then send text to SK.
                 */

                try {

                    recognition.stop();

                } catch (error) {

                    console.log(error);

                }

                listening = false;

                sendToSK(message);

            }

        };


        /* ======================================
           ERROR
        ====================================== */

        recognition.onerror = (event) => {

            console.log(
                "SK Voice Error:",
                event.error
            );

            listening = false;

            voiceCard.classList.remove(
                "listening"
            );

            micButton.classList.remove(
                "active"
            );

            micButton.textContent = "🎤";


            if (
                event.error ===
                "not-allowed"
            ) {

                liveMode = false;

                updateLiveIndicator();

                showError(
                    "Microphone permission denied."
                );

                voiceHint.textContent =
                    "Allow microphone permission in Chrome and try again.";

                return;

            }


            if (
                event.error ===
                "service-not-allowed"
            ) {

                liveMode = false;

                updateLiveIndicator();

                showError(
                    "Browser voice service is unavailable."
                );

                return;

            }


            if (
                event.error ===
                "audio-capture"
            ) {

                showError(
                    "Microphone was not found."
                );

                if (liveMode) {

                    scheduleRestart();

                }

                return;

            }


            if (
                event.error ===
                "no-speech"
            ) {

                voiceStatus.textContent =
                    "No speech detected";

                voiceHint.textContent =
                    "Listening again...";

                if (liveMode) {

                    scheduleRestart();

                }

                return;

            }


            if (
                event.error ===
                "network"
            ) {

                showError(
                    "Browser speech service network error."
                );

                if (liveMode) {

                    scheduleRestart();

                }

                return;

            }


            if (liveMode) {

                scheduleRestart();

            }

        };


        /* ======================================
           END
        ====================================== */

        recognition.onend = () => {

            listening = false;

            voiceCard.classList.remove(
                "listening"
            );

            micButton.classList.remove(
                "active"
            );

            micButton.textContent = "🎤";


            /*
             * If a final result was already sent,
             * sendToSK() controls the next stage.
             */

            if (
                liveMode &&
                !processing &&
                !speaking &&
                !finalTranscriptReceived
            ) {

                scheduleRestart();

            }

        };

    }


    createRecognition();


    /* ==========================================
       START LIVE
    ========================================== */

    micButton.addEventListener(
        "click",
        () => {

            if (liveMode) {

                stopLive();

            } else {

                startLive();

            }

        }
    );


    function startLive() {

        if (!recognition) {
            return;
        }

        liveMode = true;

        processing = false;

        speaking = false;

        finalTranscriptReceived = false;

        clearTimeout(restartTimer);

        stopSpeaking();

        updateLiveIndicator();

        voiceStatus.textContent =
            "Starting...";

        voiceHint.textContent =
            "SK Live conversation is starting.";

        startRecognition();

    }


    /* ==========================================
       START RECOGNITION
    ========================================== */

    function startRecognition() {

        if (!recognition) {
            return;
        }

        if (!liveMode) {
            return;
        }

        if (listening) {
            return;
        }

        if (processing) {
            return;
        }

        if (speaking) {
            return;
        }


        clearTimeout(restartTimer);

        finalTranscriptReceived = false;

        recognition.lang =
            getRecognitionLanguage();


        try {

            recognition.start();

        } catch (error) {

            console.log(
                "Recognition start:",
                error
            );

            scheduleRestart();

        }

    }


    /* ==========================================
       STOP RECOGNITION
    ========================================== */

    function stopRecognition() {

        clearTimeout(restartTimer);

        if (!recognition) {
            return;
        }

        try {

            recognition.abort();

        } catch (error) {

            console.log(
                "Recognition abort:",
                error
            );

        }

        listening = false;

    }


    /* ==========================================
       STOP LIVE
    ========================================== */

    function stopLive() {

        liveMode = false;

        processing = false;

        speaking = false;

        clearTimeout(restartTimer);

        stopRecognition();

        stopSpeaking();

        voiceCard.classList.remove(
            "listening",
            "speaking"
        );

        micButton.classList.remove(
            "active"
        );

        micButton.textContent = "🎤";

        voiceStatus.textContent =
            "Live conversation stopped";

        voiceHint.textContent =
            "Tap the microphone to start again.";

        connectionText.textContent =
            "Ready";

        statusDot.className =
            "status-dot";

        updateLiveIndicator();

    }


    /* ==========================================
       AUTO RESTART
    ========================================== */

    function scheduleRestart() {

        if (!liveMode) {
            return;
        }

        if (processing || speaking) {
            return;
        }

        clearTimeout(restartTimer);


        restartTimer =
            setTimeout(() => {

                if (
                    liveMode &&
                    !processing &&
                    !speaking &&
                    !listening
                ) {

                    startRecognition();

                }

            }, 600);

    }


    /* ==========================================
       SEND MESSAGE TO BACKEND
    ========================================== */

    async function sendToSK(message) {

        if (!message) {
            return;
        }


        processing = true;

        const requestId =
            ++currentRequest;


        voiceStatus.textContent =
            "Thinking...";

        voiceHint.textContent =
            "SK is processing your message.";

        connectionText.textContent =
            "Thinking";

        statusDot.className =
            "status-dot online";

        responseText.textContent =
            "Thinking...";


        conversation.push({
            role: "user",
            content: message
        });


        if (conversation.length > 20) {

            conversation =
                conversation.slice(-20);

        }


        try {

            const response =
                await fetch(
                    "/api/chat",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                message:
                                    message,

                                conversation:
                                    conversation
                            })
                    }
                );


            if (
                requestId !==
                currentRequest
            ) {

                return;

            }


            if (!response.ok) {

                throw new Error(
                    "HTTP " +
                    response.status
                );

            }


            const data =
                await response.json();


            const reply =
                extractReply(data);


            if (!reply) {

                throw new Error(
                    "Empty SK response"
                );

            }


            responseText.textContent =
                reply;


            conversation.push({
                role: "assistant",
                content: reply
            });


            if (conversation.length > 20) {

                conversation =
                    conversation.slice(-20);

            }


            detectLanguage(reply);


            /*
             * Speak.
             */

            await speak(reply);


        } catch (error) {

            console.error(
                "SK backend error:",
                error
            );


            processing = false;


            responseText.textContent =
                "SK could not connect to the backend.";


            voiceStatus.textContent =
                "Backend connection error";

            voiceHint.textContent =
                "Make sure Pydroid SK server is running.";

            connectionText.textContent =
                "Offline";

            statusDot.className =
                "status-dot";


            if (liveMode) {

                scheduleRestart();

            }

        }

    }


    /* ==========================================
       EXTRACT REPLY
    ========================================== */

    function extractReply(data) {

        if (!data) {
            return "";
        }


        if (
            typeof data ===
            "string"
        ) {

            return data;

        }


        if (
            typeof data.reply ===
            "string"
        ) {

            return data.reply;

        }


        if (
            typeof data.response ===
            "string"
        ) {

            return data.response;

        }


        if (
            typeof data.text ===
            "string"
        ) {

            return data.text;

        }


        if (
            data.data &&
            typeof data.data.reply ===
            "string"
        ) {

            return data.data.reply;

        }


        return "";

    }


    /* ==========================================
       TEXT TO SPEECH
    ========================================== */

    function speak(text) {

        return new Promise((resolve) => {

            if (
                !("speechSynthesis" in window)
            ) {

                processing = false;

                resolve();

                return;

            }


            window.speechSynthesis.cancel();


            const utterance =
                new SpeechSynthesisUtterance(
                    text
                );


            utterance.lang =
                getSpeechLanguage(text);


            utterance.rate =
                Number(
                    speedRange.value
                );


            utterance.volume =
                Number(
                    volumeRange.value
                );


            utterance.pitch = 1;


            const voices =
                window.speechSynthesis
                    .getVoices();


            const selectedVoice =
                findVoice(
                    voices,
                    utterance.lang
                );


            if (selectedVoice) {

                utterance.voice =
                    selectedVoice;

            }


            utterance.onstart = () => {

                processing = false;

                speaking = true;

                voiceCard.classList.add(
                    "speaking"
                );

                voiceStatus.textContent =
                    "SK is speaking...";

                voiceHint.textContent =
                    "Speak to interrupt SK.";

                connectionText.textContent =
                    "Speaking";

                statusDot.className =
                    "status-dot speaking";

            };


            utterance.onend = () => {

                speaking = false;

                voiceCard.classList.remove(
                    "speaking"
                );


                if (liveMode) {

                    voiceStatus.textContent =
                        "Listening...";

                    voiceHint.textContent =
                        "Continue speaking.";

                    connectionText.textContent =
                        "Listening";

                    statusDot.className =
                        "status-dot listening";


                    scheduleRestart();

                } else {

                    voiceStatus.textContent =
                        "Ready";

                    connectionText.textContent =
                        "Ready";

                    statusDot.className =
                        "status-dot";

                }


                resolve();

            };


            utterance.onerror = () => {

                speaking = false;

                processing = false;

                voiceCard.classList.remove(
                    "speaking"
                );


                if (liveMode) {

                    scheduleRestart();

                }


                resolve();

            };


            window.speechSynthesis.speak(
                utterance
            );

        });

    }


    /* ==========================================
       INTERRUPT SPEECH
    ========================================== */

    function stopSpeaking() {

        if (
            "speechSynthesis" in window
        ) {

            window.speechSynthesis.cancel();

        }

        speaking = false;

        processing = false;

        voiceCard.classList.remove(
            "speaking"
        );

    }


    stopSpeakingBtn.addEventListener(
        "click",
        () => {

            stopSpeaking();

            voiceStatus.textContent =
                liveMode
                    ? "Listening..."
                    : "Speech stopped";

            connectionText.textContent =
                liveMode
                    ? "Listening"
                    : "Ready";


            if (liveMode) {

                scheduleRestart();

            }

        }
    );


    /* ==========================================
       STOP BUTTON
    ========================================== */

    stopListeningBtn.addEventListener(
        "click",
        () => {

            stopLive();

        }
    );


    /* ==========================================
       LANGUAGE
    ========================================== */

    languageSelect.addEventListener(
        "change",
        () => {

            if (!recognition) {
                return;
            }

            recognition.lang =
                getRecognitionLanguage();

        }
    );


    function getRecognitionLanguage() {

        const value =
            languageSelect.value;


        /*
         * IMPORTANT:
         *
         * Browser Web Speech API does not
         * provide universal 1000+ language
         * automatic detection.
         *
         * Auto therefore uses browser
         * default English recognition.
         *
         * Later we can connect a dedicated
         * multilingual STT API.
         */

        if (value === "auto") {

            return "en-US";

        }


        return value;

    }


    /* ==========================================
       LANGUAGE DETECTION
    ========================================== */

    function detectLanguage(text) {

        if (!text) {
            return;
        }


        if (
            /[ٹڈڑںھچگے]/.test(text)
        ) {

            detectedLanguage.textContent =
                "Urdu";

            return;

        }


        if (
            /[\u0600-\u06FF]/.test(text)
        ) {

            detectedLanguage.textContent =
                "Arabic / Arabic Script";

            return;

        }


        if (
            /[\u0900-\u097F]/.test(text)
        ) {

            detectedLanguage.textContent =
                "Hindi";

            return;

        }


        if (
            /[\u4E00-\u9FFF]/.test(text)
        ) {

            detectedLanguage.textContent =
                "Chinese";

            return;

        }


        if (
            /[\u3040-\u30FF]/.test(text)
        ) {

            detectedLanguage.textContent =
                "Japanese";

            return;

        }


        if (
            /[\u0400-\u04FF]/.test(text)
        ) {

            detectedLanguage.textContent =
                "Cyrillic";

            return;

        }


        detectedLanguage.textContent =
            "English / Latin";

    }


    /* ==========================================
       TTS LANGUAGE
    ========================================== */

    function getSpeechLanguage(text) {

        if (
            /[ٹڈڑںھچگے]/.test(text)
        ) {

            return "ur-PK";

        }


        if (
            /[\u0600-\u06FF]/.test(text)
        ) {

            return "ar-SA";

        }


        if (
            /[\u0900-\u097F]/.test(text)
        ) {

            return "hi-IN";

        }


        if (
            /[\u4E00-\u9FFF]/.test(text)
        ) {

            return "zh-CN";

        }


        if (
            /[\u3040-\u30FF]/.test(text)
        ) {

            return "ja-JP";

        }


        if (
            /[\u0400-\u04FF]/.test(text)
        ) {

            return "ru-RU";

        }


        if (
            languageSelect.value !==
            "auto"
        ) {

            return languageSelect.value;

        }


        return "en-US";

    }


    /* ==========================================
       FIND TTS VOICE
    ========================================== */

    function findVoice(
        voices,
        language
    ) {

        if (
            !voices ||
            !voices.length
        ) {

            return null;

        }


        const languageCode =
            language
                .toLowerCase()
                .split("-")[0];


        return (
            voices.find(
                voice =>
                    voice.lang
                        .toLowerCase()
                        .startsWith(
                            languageCode
                        )
            ) || null
        );

    }


    /* ==========================================
       SPEED
    ========================================== */

    speedRange.addEventListener(
        "input",
        () => {

            const value =
                Number(
                    speedRange.value
                );

            speedValue.textContent =
                value.toFixed(1) + "x";

        }
    );


    /* ==========================================
       VOLUME
    ========================================== */

    volumeRange.addEventListener(
        "input",
        () => {

            const value =
                Number(
                    volumeRange.value
                );

            volumeValue.textContent =
                Math.round(
                    value * 100
                ) + "%";

        }
    );


    /* ==========================================
       LIVE INDICATOR
    ========================================== */
    function updateLiveIndicator() {

        if (!liveIndicator) {
            return;
        }


        if (liveMode) {

            liveIndicator.classList.add(
                "active"
            );

            liveIndicator.innerHTML =
                "<span></span> Live conversation ON";

        } else {

            liveIndicator.classList.remove(
                "active"
            );

            liveIndicator.innerHTML =
                "<span></span> Live conversation OFF";

        }

    }


    /* ==========================================
       ERROR UI
    ========================================== */

    function showError(message) {

        voiceStatus.textContent =
            message;

        voiceHint.textContent =
            "Check microphone and browser permissions.";

        connectionText.textContent =
            "Voice Error";

        statusDot.className =
            "status-dot";

    }


    /* ==========================================
       ESC = STOP
    ========================================== */

    document.addEventListener(
        "keydown",
        (event) => {

            if (event.key === "Escape") {

                stopLive();

            }

        }
    );


    /* ==========================================
       LOAD VOICES
    ========================================== */

    if (
        "speechSynthesis" in window
    ) {

        window.speechSynthesis
            .getVoices();

        window.speechSynthesis
            .addEventListener(
                "voiceschanged",
                () => {

                    window.speechSynthesis
                        .getVoices();

                }
            );

    }


    /* ==========================================
       INITIAL
    ========================================== */

    updateLiveIndicator();

    console.log(
        "SK Live Voice initialized."
    );

});