/* =========================================================
SK — DASHBOARD ENGINE
========================================================= */

"use strict";

const SKDashboard = {

/* =====================================================
   INITIALIZATION
===================================================== */

init() {

    this.setupSidebar();

    this.setupTheme();

    this.checkBackend();

    this.loadMemoryCount();

    this.loadActivity();

    this.updateVoiceStatus();

},


/* =====================================================
   SIDEBAR
===================================================== */

setupSidebar() {

    const sidebar =
        document.getElementById("sidebar");

    const menuButton =
        document.getElementById("menuButton");

    const closeButton =
        document.getElementById("closeSidebar");

    const overlay =
        document.getElementById("sidebarOverlay");


    if (!sidebar) return;


    const openSidebar = () => {

        sidebar.classList.add("open");

        overlay?.classList.add("show");

        document.body.style.overflow = "hidden";

    };


    const closeSidebar = () => {

        sidebar.classList.remove("open");

        overlay?.classList.remove("show");

        document.body.style.overflow = "";

    };


    menuButton?.addEventListener(
        "click",
        openSidebar
    );


    closeButton?.addEventListener(
        "click",
        closeSidebar
    );


    overlay?.addEventListener(
        "click",
        closeSidebar
    );


    document
        .querySelectorAll(".sidebar .nav-item")
        .forEach((item) => {

            item.addEventListener(
                "click",
                () => {

                    if (
                        window.innerWidth <= 760
                    ) {
                        closeSidebar();
                    }

                }
            );

        });


    window.addEventListener(
        "resize",
        () => {

            if (
                window.innerWidth > 760
            ) {
                closeSidebar();
            }

        }
    );

},


/* =====================================================
   THEME
===================================================== */

setupTheme() {

    const themeButton =
        document.getElementById(
            "themeButton"
        );

    if (!themeButton) return;


    const savedTheme =
        localStorage.getItem(
            "sk-theme"
        );


    if (savedTheme === "light") {

        document.body.classList.add(
            "light"
        );

        themeButton.textContent = "☀";

    } else {

        themeButton.textContent = "◐";

    }


    themeButton.addEventListener(
        "click",
        () => {

            const isLight =
                document.body.classList.toggle(
                    "light"
                );


            localStorage.setItem(
                "sk-theme",
                isLight
                    ? "light"
                    : "dark"
            );


            themeButton.textContent =
                isLight
                    ? "☀"
                    : "◐";

        }
    );

},


/* =====================================================
   BACKEND STATUS
===================================================== */

async checkBackend() {

    const statusDot =
        document.getElementById(
            "statusDot"
        );

    const statusText =
        document.getElementById(
            "statusText"
        );

    const aiStatus =
        document.getElementById(
            "aiStatus"
        );

    const systemStatus =
        document.getElementById(
            "systemStatus"
        );


    try {

        const response =
            await fetch(
                "/api/status",
                {
                    method: "GET",

                    headers: {
                        "Accept":
                            "application/json"
                    },

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


        /* Sidebar */

        if (statusDot) {

            statusDot.classList.remove(
                "offline"
            );

            statusDot.classList.add(
                "online"
            );

        }


        if (statusText) {

            statusText.textContent =
                "Online";

        }


        /* AI status */

        if (aiStatus) {

            aiStatus.textContent =
                "Connected";

        }


        if (systemStatus) {

            systemStatus.textContent =
                "Online";

        }


        this.setActivity(
            "System connected",
            "SK backend is online."
        );


        console.log(
            "SK backend:",
            data
        );


    } catch (error) {

        console.error(
            "Backend Error:",
            error
        );


        if (statusDot) {

            statusDot.classList.remove(
                "online"
            );

            statusDot.classList.add(
                "offline"
            );

        }


        if (statusText) {

            statusText.textContent =
                "Offline";

        }


        if (aiStatus) {

            aiStatus.textContent =
                "Offline";

        }


        if (systemStatus) {

            systemStatus.textContent =
                "Offline";

        }


        this.setActivity(
            "Backend unavailable",
            "Please start the SK backend."
        );

    }

},


/* =====================================================
   MEMORY COUNT
===================================================== */

async loadMemoryCount() {

    const memoryElement =
        document.getElementById(
            "memoryCount"
        );


    if (!memoryElement) return;


    try {

        const response =
            await fetch(
                "/api/memory",
                {
                    method: "GET",

                    headers: {
                        "Accept":
                            "application/json"
                    },

                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Memory API unavailable"
            );

        }


        const data =
            await response.json();


        let memories = [];


        if (Array.isArray(data)) {

            memories = data;

        } else if (
            Array.isArray(
                data.memories
            )
        ) {

            memories = data.memories;

        } else if (
            Array.isArray(
                data.data
            )
        ) {

            memories = data.data;

        }


        memoryElement.textContent =
            memories.length;


    } catch (error) {

        console.warn(
            "Memory count unavailable:",
            error
        );


        memoryElement.textContent =
            "—";

    }

},


/* =====================================================
   VOICE STATUS
===================================================== */

updateVoiceStatus() {

    const voiceElement =
        document.getElementById(
            "voiceStatus"
        );


    if (!voiceElement) return;


    const speechSupported =
        "speechSynthesis" in window;


    const microphoneSupported =
        "mediaDevices" in navigator &&
        "getUserMedia" in navigator.mediaDevices;


    if (
        speechSupported &&
        microphoneSupported
    ) {

        voiceElement.textContent =
            "Ready";

    } else if (speechSupported) {

        voiceElement.textContent =
            "TTS Ready";

    } else {

        voiceElement.textContent =
            "Limited";

    }

},


/* =====================================================
   ACTIVITY
===================================================== */

setActivity(title, description) {

    const activityList =
        document.getElementById(
            "activityList"
        );

    const activityStatus =
        document.getElementById(
            "activityStatus"
        );


    if (activityStatus) {

        activityStatus.textContent =
            title;

    }


    if (!activityList) return;


    const activity =
        document.createElement(
            "div"
        );


    activity.className =
        "dashboard-activity-item";


    activity.innerHTML = `
        <div class="activity-icon">
            ✓
        </div>

        <div class="activity-content">
            <strong>${this.escapeHTML(title)}</strong>
            <span>${this.escapeHTML(description)}</span>
        </div>

        <time>
            ${this.getTime()}
        </time>
    `;


    activityList.innerHTML = "";

    activityList.appendChild(
        activity
    );


    this.saveActivity(
        title,
        description
    );

},


saveActivity(title, description) {

    try {

        const activities =
            JSON.parse(
                localStorage.getItem(
                    "sk-dashboard-activity"
                ) || "[]"
            );


        activities.unshift({

            title,
            description,

            time:
                new Date()
                    .toISOString()

        });


        const limited =
            activities.slice(0, 10);


        localStorage.setItem(
            "sk-dashboard-activity",
            JSON.stringify(limited)
        );


    } catch (error) {

        console.warn(
            "Activity save failed:",
            error
        );

    }

},


loadActivity() {

    const activityList =
        document.getElementById(
            "activityList"
        );


    if (!activityList) return;


    try {

        const activities =
            JSON.parse(
                localStorage.getItem(
                    "sk-dashboard-activity"
                ) || "[]"
            );


        if (
            !Array.isArray(
                activities
            ) ||
            activities.length === 0
        ) {

            return;

        }


        activityList.innerHTML = "";


        activities
            .slice(0, 5)
            .forEach((item) => {

                const activity =
                    document.createElement(
                        "div"
                    );


                activity.className =
                    "dashboard-activity-item";


                activity.innerHTML = `
                    <div class="activity-icon">
                        ✓
                    </div>

                    <div class="activity-content">
                        <strong>${this.escapeHTML(item.title)}</strong>
                        <span>${this.escapeHTML(item.description)}</span>
                    </div>

                    <time>
                        ${this.formatTime(item.time)}
                    </time>
                `;


                activityList.appendChild(
                    activity
                );

            });


    } catch (error) {

        console.warn(
            "Activity load failed:",
            error
        );

    }

},


/* =====================================================
   TIME
===================================================== */

getTime() {

    return new Date()
        .toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );

},


formatTime(value) {

    try {

        return new Date(value)
            .toLocaleTimeString(
                [],
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );

    } catch {

        return "";

    }

},


/* =====================================================
   SECURITY
===================================================== */

escapeHTML(value) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}

};

/* =========================================================
ACTIVITY STYLE
========================================================= */

const dashboardActivityStyle =
document.createElement("style");

dashboardActivityStyle.textContent = `

.dashboard-activity-item {

width: 100%;

display: grid;

grid-template-columns:
    40px 1fr auto;

align-items: center;

gap: 12px;

padding: 16px;

border-bottom:
    1px solid var(--border);

}

.dashboard-activity-item:last-child {

border-bottom: none;

}

.activity-icon {

width: 38px;
height: 38px;

display: grid;
place-items: center;

border-radius: 11px;

background:
    var(--accent-soft);

color:
    var(--success);

font-weight: 800;

}

.activity-content {

min-width: 0;

display: flex;

flex-direction: column;

gap: 4px;

}

.activity-content strong {

font-size: 12px;

}

.activity-content span {

color:
    var(--text-muted);

font-size: 10px;

overflow: hidden;

text-overflow: ellipsis;

white-space: nowrap;

}

.dashboard-activity-item time {

color:
    var(--text-muted);

font-size: 9px;

}

@media (max-width: 500px) {

.dashboard-activity-item {

    grid-template-columns:
        36px 1fr;

}

.dashboard-activity-item time {

    display: none;

}

}

`;

document.head.appendChild(
dashboardActivityStyle
);

/* =========================================================
START
========================================================= */

document.addEventListener(
"DOMContentLoaded",
() => {

    SKDashboard.init();

}

);

