/* =========================================
   SK CHAT - CLEAN STANDALONE ENGINE
========================================= */

"use strict";

document.addEventListener("DOMContentLoaded", () => {

    const chatBox = document.getElementById("chatBox");
    const chatForm = document.getElementById("chatForm");
    const messageInput = document.getElementById("messageInput");
    const sendButton = document.getElementById("sendButton");
    const loading = document.getElementById("loading");
    const clearChatBtn = document.getElementById("clearChatBtn");
    const voiceBtn = document.getElementById("voiceBtn");
    const backendStatus = document.getElementById("backendStatus");

    const menuBtn = document.getElementById("menuBtn");
    const sidebar = document.getElementById("sidebar");
    const sidebarClose = document.getElementById("sidebarClose");
    const sidebarOverlay = document.getElementById("sidebarOverlay");

    const STORAGE_KEY = "sk_chat_history";

    let conversation = [];
    let sending = false;


    /* =========================================
       HELPERS
    ========================================= */

    function escapeHTML(text) {

        const div = document.createElement("div");

        div.textContent = String(text);

        return div.innerHTML;
    }


    function scrollToBottom() {

        requestAnimationFrame(() => {

            chatBox.scrollTop = chatBox.scrollHeight;

        });

    }


    function showLoading() {

        loading.classList.remove("hidden");

    }


    function hideLoading() {

        loading.classList.add("hidden");

    }


    function setSending(state) {

        sending = state;

        sendButton.disabled = state;
        messageInput.disabled = state;

    }


    /* =========================================
       LOCAL STORAGE
    ========================================= */

    function saveConversation() {

        try {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(conversation)
            );

        } catch (error) {

            console.warn("Could not save chat:", error);

        }

    }


    function loadConversation() {

        try {

            const saved = localStorage.getItem(STORAGE_KEY);

            if (!saved) {
                return;
            }

            const parsed = JSON.parse(saved);

            if (!Array.isArray(parsed)) {
                return;
            }

            conversation = parsed;

            parsed.forEach(item => {

                if (
                    item &&
                    item.role &&
                    typeof item.content === "string"
                ) {

                    addMessage(
                        item.role,
                        item.content,
                        false
                    );

                }

            });

        } catch (error) {

            console.warn("Could not load chat:", error);

        }

    }


    /* =========================================
       ADD MESSAGE
    ========================================= */

    function addMessage(role, text, save = true) {

        const welcome = chatBox.querySelector(".welcome-message");

        if (welcome) {
            welcome.remove();
        }

        const wrapper = document.createElement("div");

        wrapper.className =
            "message " +
            (role === "user" ? "user" : "assistant");


        const content = document.createElement("div");

        content.className = "message-content";

        content.innerHTML = escapeHTML(text);


        wrapper.appendChild(content);


        if (role === "user") {

            const actions = document.createElement("div");

            actions.className = "message-actions";

            const rememberBtn = document.createElement("button");

            rememberBtn.type = "button";

            rememberBtn.className = "remember-message-btn";

            rememberBtn.textContent = "🧠 Remember";

            rememberBtn.addEventListener("click", () => {

                rememberMessage(text);

            });

            actions.appendChild(rememberBtn);

            content.appendChild(actions);

        }


        chatBox.appendChild(wrapper);

        scrollToBottom();


        if (save) {

            conversation.push({
                role: role,
                content: text
            });

            saveConversation();

        }

    }


    /* =========================================
       SEND MESSAGE
    ========================================= */

    async function sendMessage() {

        if (sending) {
            return;
        }

        const message = messageInput.value.trim();

        if (!message) {
            return;
        }


        addMessage("user", message);

        messageInput.value = "";

        autoResize();


        setSending(true);

        showLoading();


        try {

            const response = await fetch("/api/chat", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    message: message,

                    conversation: conversation.slice(-20)

                })

            });


            const data = await response.json().catch(() => null);


            if (!response.ok) {

                throw new Error(
                    data?.error ||
                    `Server error (${response.status})`
                );

            }


            if (!data || data.success !== true) {

                throw new Error(
                    data?.error ||
                    "SK could not process the request."
                );

            }


            const reply =
                typeof data.reply === "string"
                    ? data.reply
                    : "SK returned an empty response.";


            addMessage("assistant", reply);


        } catch (error) {

            console.error("SK Chat Error:", error);

            addMessage(
                "assistant",
                "⚠️ SK سے رابطہ نہیں ہو سکا۔ Backend/server check کریں۔\n\n" +
                "Error: " +
                error.message
            );

        } finally {

            hideLoading();

            setSending(false);

            messageInput.focus();

        }

    }


    /* =========================================
       FORM
    ========================================= */

    chatForm.addEventListener("submit", event => {

        event.preventDefault();

        sendMessage();

    });


    /* =========================================
       ENTER KEY
    ========================================= */

    messageInput.addEventListener("keydown", event => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();

        }

    });


    /* =========================================
       AUTO RESIZE
    ========================================= */

    function autoResize() {

        messageInput.style.height = "auto";

        messageInput.style.height =
            Math.min(
                messageInput.scrollHeight,
                130
            ) + "px";

    }


    messageInput.addEventListener(
        "input",
        autoResize
    );


    /* =========================================
       CLEAR CHAT
    ========================================= */

    clearChatBtn.addEventListener("click", () => {

        const confirmed = confirm(
            "Clear the complete SK chat history?"
        );

        if (!confirmed) {
            return;
        }


        conversation = [];

        localStorage.removeItem(STORAGE_KEY);


        chatBox.innerHTML = `

            <div class="welcome-message">

                <div class="welcome-icon">
                    SK
                </div>

                <h2>Assalamualaikum! 👋</h2>

                <p>
                    I'm SK, your personal AI assistant.
                </p>

                <p>
                    Ask me anything.
                </p>

            </div>

        `;

        messageInput.focus();

    });


    /* =========================================
       REMEMBER MESSAGE
    ========================================= */

    async function rememberMessage(text) {

        const approved = confirm(
            "Do you want SK to remember this?"
        );

        if (!approved) {
            return;
        }


        try {

            const response = await fetch(
                "/api/memory",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        text: text,

                        category: "conversation",

                        approved: true

                    })

                }
            );


            const data =
                await response.json().catch(() => null);


            if (!response.ok || !data?.success) {

                throw new Error(
                    data?.error ||
                    "Memory save failed."
                );

            }


            alert("🧠 Memory saved successfully.");

        } catch (error) {

            console.error(error);

            alert(
                "Memory save نہیں ہو سکی.\n\n" +
                error.message
            );

        }

    }


    /* =========================================
       VOICE PAGE
    ========================================= */

    voiceBtn.addEventListener("click", () => {

        window.location.href = "voice.html";

    });


    /* =========================================
       MOBILE SIDEBAR
    ========================================= */

    function openSidebar() {

        sidebar.classList.add("open");

        sidebarOverlay.classList.add("open");

    }


    function closeSidebar() {

        sidebar.classList.remove("open");

        sidebarOverlay.classList.remove("open");

    }


    menuBtn.addEventListener(
        "click",
        openSidebar
    );


    sidebarClose.addEventListener(
        "click",
        closeSidebar
    );


    sidebarOverlay.addEventListener(
        "click",
        closeSidebar
    );


    document
        .querySelectorAll(".sidebar-nav a")
        .forEach(link => {

            link.addEventListener(
                "click",
                closeSidebar
            );

        });


    /* =========================================
       BACKEND STATUS
    ========================================= */

    async function checkBackend() {

        backendStatus.textContent =
            "Connecting...";


        try {

            const response =
                await fetch(
                    "/api/status",
                    {
                        cache: "no-store"
                    }
                );


            if (!response.ok) {

                throw new Error(
                    "Backend unavailable"
                );

            }


            const data =
                await response.json();


            if (
                data &&
                (
                    data.status === "online" ||
                    data.success === true
                )
            ) {

                backendStatus.textContent =
                    "Online";

                backendStatus.style.color =
                    "#48d597";

            } else {

                backendStatus.textContent =
                    "Offline";

                backendStatus.style.color =
                    "#ff7373";

            }


        } catch (error) {

            console.error(
                "Backend status error:",
                error
            );


            backendStatus.textContent =
                "Offline";

            backendStatus.style.color =
                "#ff7373";

        }

    }


    /* =========================================
       START
    ========================================= */

    loadConversation();

    checkBackend();

    messageInput.focus();


    /* =========================================
       GLOBAL SK OBJECT
    ========================================= */

    window.SK = {

        sendMessage,
        rememberMessage,
        checkBackend,

        clearChat: () => {

            conversation = [];

            localStorage.removeItem(
                STORAGE_KEY
            );

            location.reload();

        }

    };


    console.log(
        "✅ SK Chat loaded successfully."
    );

});