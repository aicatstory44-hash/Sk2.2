/* ==========================================
   SK - GLOBAL APP
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    /* ==========================================
       MOBILE SIDEBAR
    ========================================== */

    const menuBtn = document.getElementById("menuBtn");
    const sidebar = document.getElementById("sidebar");

    if (menuBtn && sidebar) {

        menuBtn.addEventListener("click", (event) => {

            event.stopPropagation();

            sidebar.classList.toggle("open");

        });

    }


    /* Close sidebar when clicking outside */

    document.addEventListener("click", (event) => {

        if (!sidebar || !sidebar.classList.contains("open")) {
            return;
        }

        if (
            sidebar.contains(event.target) ||
            (menuBtn && menuBtn.contains(event.target))
        ) {
            return;
        }

        sidebar.classList.remove("open");

    });


    /* Close sidebar after navigation */

    if (sidebar) {

        const links = sidebar.querySelectorAll("a");

        links.forEach((link) => {

            link.addEventListener("click", () => {

                sidebar.classList.remove("open");

            });

        });

    }


    /* ==========================================
       ESC KEY
    ========================================== */

    document.addEventListener("keydown", (event) => {

        if (event.key === "Escape") {

            if (sidebar) {
                sidebar.classList.remove("open");
            }

        }

    });


    /* ==========================================
       THEME
    ========================================== */

    const savedTheme =
        localStorage.getItem("sk-theme");

    if (savedTheme === "light") {

        document.body.classList.add("light-theme");

    }


    window.SK = window.SK || {};

    window.SK.setTheme = function (theme) {

        if (theme === "light") {

            document.body.classList.add(
                "light-theme"
            );

            localStorage.setItem(
                "sk-theme",
                "light"
            );

        } else {

            document.body.classList.remove(
                "light-theme"
            );

            localStorage.setItem(
                "sk-theme",
                "dark"
            );

        }

    };


    /* ==========================================
       GLOBAL BACKEND CHECK
    ========================================== */

    window.SK.checkBackend = async function () {

        try {

            const response =
                await fetch("/api/status", {
                    method: "GET",
                    cache: "no-store"
                });

            return response.ok;

        } catch (error) {

            console.log(
                "SK backend unavailable:",
                error
            );

            return false;

        }

    };


    console.log(
        "SK global app loaded"
    );

});