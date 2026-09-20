
/* =========================================================
   SK CODING ENGINE
   AI BUILDER + EDITOR + LIVE PREVIEW
========================================================= */

"use strict";


const SKCoding = {

    storageKey: "sk-coding-code",

    previewKey: "sk-preview-code",


    /* =====================================================
       INIT
    ===================================================== */

    init() {

        this.setupSidebar();

        this.setupEditor();

        this.setupButtons();

        this.loadSavedCode();

        this.updateLineNumbers();

        this.runCode();

        this.checkBackend();

        console.log(
            "SK Coding initialized."
        );

    },


    /* =====================================================
       ELEMENTS
    ===================================================== */

    get editor() {
        return document.getElementById(
            "codeEditor"
        );
    },


    get preview() {
        return document.getElementById(
            "codingPreview"
        );
    },


    /* =====================================================
       SIDEBAR
    ===================================================== */

    setupSidebar() {

        const menu =
            document.getElementById(
                "menuButton"
            );

        const close =
            document.getElementById(
                "closeMenu"
            );

        const sidebar =
            document.getElementById(
                "sidebar"
            );

        const overlay =
            document.getElementById(
                "sidebarOverlay"
            );


        if (!menu || !sidebar) {
            return;
        }


        menu.addEventListener(
            "click",
            () => {

                sidebar.classList.add(
                    "open"
                );

                if (overlay) {
                    overlay.classList.add(
                        "open"
                    );
                }

            }
        );


        if (close) {

            close.addEventListener(
                "click",
                () => {

                    this.closeSidebar();

                }
            );

        }


        if (overlay) {

            overlay.addEventListener(
                "click",
                () => {

                    this.closeSidebar();

                }
            );

        }

    },


    closeSidebar() {

        const sidebar =
            document.getElementById(
                "sidebar"
            );

        const overlay =
            document.getElementById(
                "sidebarOverlay"
            );


        if (sidebar) {
            sidebar.classList.remove(
                "open"
            );
        }


        if (overlay) {
            overlay.classList.remove(
                "open"
            );
        }

    },


    /* =====================================================
       EDITOR
    ===================================================== */

    setupEditor() {

        const editor =
            this.editor;


        if (!editor) {
            return;
        }


        editor.addEventListener(
            "input",
            () => {

                this.updateLineNumbers();

                this.saveCode();

            }
        );


        editor.addEventListener(
            "scroll",
            () => {

                const numbers =
                    document.getElementById(
                        "lineNumbers"
                    );

                if (numbers) {

                    numbers.scrollTop =
                        editor.scrollTop;

                }

            }
        );


        editor.addEventListener(
            "keydown",
            event => {

                /* TAB */

                if (
                    event.key === "Tab"
                ) {

                    event.preventDefault();


                    const start =
                        editor.selectionStart;

                    const end =
                        editor.selectionEnd;


                    editor.value =
                        editor.value.substring(
                            0,
                            start
                        )
                        +
                        "    "
                        +
                        editor.value.substring(
                            end
                        );


                    editor.selectionStart =
                        editor.selectionEnd =
                            start + 4;


                    this.updateLineNumbers();

                    this.saveCode();

                }


                /* CTRL + ENTER */

                if (
                    event.ctrlKey &&
                    event.key === "Enter"
                ) {

                    event.preventDefault();

                    this.runCode();

                }

            }
        );

    },


    /* =====================================================
       LINE NUMBERS
    ===================================================== */

    updateLineNumbers() {

        const editor =
            this.editor;

        const numbers =
            document.getElementById(
                "lineNumbers"
            );


        if (!editor || !numbers) {
            return;
        }


        const total =
            Math.max(
                1,
                editor.value
                    .split("\n")
                    .length
            );


        let output = "";


        for (
            let i = 1;
            i <= total;
            i++
        ) {

            output +=
                i + "\n";

        }


        numbers.textContent =
            output;

    },


    /* =====================================================
       BUTTONS
    ===================================================== */

    setupButtons() {

        const run =
            document.getElementById(
                "codingRunButton"
            );

        const refresh =
            document.getElementById(
                "codingRefreshButton"
            );

        const copy =
            document.getElementById(
                "codeCopyButton"
            );

        const clear =
            document.getElementById(
                "codeClearButton"
            );

        const previewRefresh =
            document.getElementById(
                "previewRefreshButton"
            );

        const previewOpen =
            document.getElementById(
                "previewOpenButton"
            );

        const generate =
            document.getElementById(
                "generateCodeButton"
            );


        if (run) {

            run.addEventListener(
                "click",
                () => {

                    this.runCode();

                }
            );

        }


        if (refresh) {

            refresh.addEventListener(
                "click",
                () => {

                    this.loadSavedCode();

                    this.updateLineNumbers();

                    this.runCode();

                }
            );

        }


        if (copy) {

            copy.addEventListener(
                "click",
                () => {

                    this.copyCode();

                }
            );

        }


        if (clear) {

            clear.addEventListener(
                "click",
                () => {

                    this.clearCode();

                }
            );

        }


        if (previewRefresh) {

            previewRefresh.addEventListener(
                "click",
                () => {

                    this.runCode();

                }
            );

        }


        if (previewOpen) {

            previewOpen.addEventListener(
                "click",
                () => {

                    this.openFullPreview();

                }
            );

        }


        if (generate) {

            generate.addEventListener(
                "click",
                () => {

                    this.generateWithAI();

                }
            );

        }

    },


    /* =====================================================
       RUN CODE
    ===================================================== */

    runCode() {

        const editor =
            this.editor;

        const preview =
            this.preview;

        const empty =
            document.getElementById(
                "emptyPreview"
            );


        if (!editor || !preview) {
            return;
        }


        const code =
            editor.value.trim();


        if (!code) {

            preview.srcdoc = "";

            if (empty) {
                empty.classList.remove(
                    "hidden"
                );
            }

            this.setStatus(
                "Ready"
            );

            return;
        }


        preview.srcdoc =
            code;


        localStorage.setItem(
            this.previewKey,
            code
        );


        this.saveCode();


        if (empty) {

            empty.classList.add(
                "hidden"
            );

        }


        this.setStatus(
            "Running"
        );


        setTimeout(
            () => {

                this.setStatus(
                    "Ready"
                );

            },
            500
        );

    },


    /* =====================================================
       SAVE
    ===================================================== */

    saveCode() {

        const editor =
            this.editor;


        if (!editor) {
            return;
        }


        try {

            localStorage.setItem(
                this.storageKey,
                editor.value
            );

            localStorage.setItem(
                this.previewKey,
                editor.value
            );

        } catch (error) {

            console.warn(
                "Could not save code:",
                error
            );

        }

    },


    /* =====================================================
       LOAD
    ===================================================== */

    loadSavedCode() {

        const editor =
            this.editor;


        if (!editor) {
            return;
        }


        try {

            const saved =
                localStorage.getItem(
                    this.storageKey
                );


            if (
                saved !== null &&
                saved.trim() !== ""
            ) {

                editor.value =
                    saved;

                return;

            }


            const previewSaved =
                localStorage.getItem(
                    this.previewKey
                );


            if (
                previewSaved !== null
            ) {

                editor.value =
                    previewSaved;

            }

        } catch (error) {

            console.warn(
                "Could not load code:",
                error
            );

        }

    },


    /* =====================================================
       COPY
    ===================================================== */

    async copyCode() {

        const editor =
            this.editor;


        if (!editor) {
            return;
        }


        const code =
            editor.value;


        if (!code.trim()) {

            this.showNotice(
                "Pehle code likhein."
            );

            return;

        }


        try {

            await navigator.clipboard.writeText(
                code
            );

            this.showNotice(
                "Code copied!"
            );

        } catch (error) {

            editor.select();

            document.execCommand(
                "copy"
            );

            editor.setSelectionRange(
                code.length,
                code.length
            );

            this.showNotice(
                "Code copied!"
            );

        }

    },


    /* =====================================================
       CLEAR
    ===================================================== */

    clearCode() {

        const editor =
            this.editor;


        if (!editor) {
            return;
        }


        const confirmed =
            confirm(
                "Clear the complete code?"
            );


        if (!confirmed) {
            return;
        }


        editor.value = "";


        localStorage.removeItem(
            this.storageKey
        );

        localStorage.removeItem(
            this.previewKey
        );


        this.updateLineNumbers();

        this.runCode();


        this.showNotice(
            "Code cleared."
        );

    },


    /* =====================================================
       OPEN FULL PREVIEW
    ===================================================== */

    openFullPreview() {

        const editor =
            this.editor;


        if (!editor) {
            return;
        }


        const code =
            editor.value.trim();


        if (!code) {

            this.showNotice(
                "Pehle code likhein."
            );

            return;

        }


        localStorage.setItem(
            this.previewKey,
            code
        );


        window.location.href =
            "preview.html";

    },


    /* =====================================================
       AI CODE GENERATOR
    ===================================================== */

    async generateWithAI() {

        const promptInput =
            document.getElementById(
                "codingPrompt"
            );

        const button =
            document.getElementById(
                "generateCodeButton"
            );


        if (!promptInput || !button) {
            return;
        }


        const userPrompt =
            promptInput.value.trim();


        if (!userPrompt) {

            this.showNotice(
                "Pehle batayein kya banana hai."
            );

            promptInput.focus();

            return;

        }


        button.disabled = true;

        button.textContent =
            "⏳ Building...";

        this.setStatus(
            "SK is building..."
        );


        try {

            const instruction = `

Create a complete runnable website for this request:

${userPrompt}

IMPORTANT:

Return ONLY this exact structure:

[PROJECT]
TITLE: short project title
MESSAGE: short ready message
CODE:
HTML CODE START
FULL COMPLETE HTML CODE
HTML CODE END
[/PROJECT]

Rules:

- Put HTML, CSS and JavaScript in ONE complete HTML file.
- The code must be directly runnable in a browser.
- Do not use Markdown code fences.
- Do not put explanations outside the structure.
- Make the website responsive.
- Make the design professional.
- Use internal CSS and JavaScript.
- Do not use external APIs unless the user specifically requested one.
`;


            const response =
                await fetch(
                    "/api/chat",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            message:
                                instruction,

                            conversation: []

                        })

                    }
                );


            const data =
                await response
                    .json()
                    .catch(
                        () => null
                    );


            if (!response.ok) {

                throw new Error(
                    data?.error ||
                    `Server error ${response.status}`
                );

            }


            if (
                !data ||
                data.success !== true
            ) {

                throw new Error(
                    data?.error ||
                    "AI response failed."
                );

            }


            const reply =
                typeof data.reply === "string"
                    ? data.reply
                    : "";


            const code =
                this.extractProjectCode(
                    reply
                );


            if (!code) {

                throw new Error(
                    "SK returned no complete website code."
                );

            }


            this.editor.value =
                code;


            this.updateLineNumbers();

            this.saveCode();

            this.runCode();


            this.showNotice(
                "✨ Website code ready!"
            );


        } catch (error) {

            console.error(
                "SK Coding AI Error:",
                error
            );


            this.showNotice(
                "AI code generate نہیں ہو سکا: " +
                error.message
            );


        } finally {

            button.disabled = false;

            button.textContent =
                "✨ Generate Code";

            this.setStatus(
                "Ready"
            );

        }

    },


    /* =====================================================
       EXTRACT PROJECT CODE
    ===================================================== */

    extractProjectCode(reply) {

        if (!reply) {
            return "";
        }


        const startMarker =
            "HTML CODE START";

        const endMarker =
            "HTML CODE END";


        const start =
            reply.indexOf(
                startMarker
            );


        const end =
            reply.indexOf(
                endMarker
            );


        if (
            start !== -1 &&
            end !== -1 &&
            end > start
        ) {

            return reply
                .substring(
                    start +
                    startMarker.length,
                    end
                )
                .trim();

        }


        /* Fallback */

        let code =
            reply.trim();


        code =
            code.replace(
                /^```html\s*/i,
                ""
            );

        code =
            code.replace(
                /^```\s*/i,
                ""
            );

        code =
            code.replace(
                /\s*```$/i,
                ""
            );


        if (
            code.includes(
                "<!DOCTYPE html"
            )
        ) {

            const index =
                code.indexOf(
                    "<!DOCTYPE html"
                );

            return code
                .substring(index)
                .trim();

        }


        if (
            code.includes(
                "<html"
            )
        ) {

            const index =
                code.indexOf(
                    "<html"
                );

            return code
                .substring(index)
                .trim();

        }


        return "";

    },


    /* =====================================================
       BACKEND STATUS
    ===================================================== */

    async checkBackend() {

        const text =
            document.getElementById(
                "connectionText"
            );

        const dot =
            document.getElementById(
                "connectionDot"
            );


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
                    "Offline"
                );
            }


            const data =
                await response.json();


            if (
                data &&
                data.status === "online"
            ) {

                if (text) {
                    text.textContent =
                        "SK Backend Online";
                }

                if (dot) {
                    dot.style.background =
                        "#21d4a4";
                }

                return;

            }


            throw new Error(
                "Backend unavailable"
            );


        } catch (error) {

            if (text) {
                text.textContent =
                    "Backend Offline";
            }

            if (dot) {
                dot.style.background =
                    "#ff6262";
            }

        }

    },


    /* =====================================================
       STATUS
    ===================================================== */

    setStatus(text) {

        const status =
            document.getElementById(
                "codingStatusText"
            );

        if (status) {
            status.textContent =
                text;
        }

    },


    /* =====================================================
       NOTICE
    ===================================================== */

    showNotice(message) {

        const old =
            document.querySelector(
                ".sk-coding-notice"
            );


        if (old) {
            old.remove();
        }


        const notice =
            document.createElement(
                "div"
            );


        notice.className =
            "sk-coding-notice";


        notice.textContent =
            message;


        notice.style.position =
            "fixed";

        notice.style.left =
            "50%";

        notice.style.bottom =
            "25px";

        notice.style.transform =
            "translateX(-50%)";

        notice.style.zIndex =
            "99999";

        notice.style.padding =
            "11px 16px";

        notice.style.borderRadius =
            "10px";

        notice.style.background =
            "#21d4a4";

        notice.style.color =
            "#06110d";

        notice.style.fontSize =
            "12px";

        notice.style.fontWeight =
            "800";

        notice.style.maxWidth =
            "90%";

        notice.style.textAlign =
            "center";


        document.body.appendChild(
            notice
        );


        setTimeout(
            () => {

                notice.remove();

            },
            2200
        );

    }

};


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        SKCoding.init();

    }
);
