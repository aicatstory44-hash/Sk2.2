// ============================================================
// SK MEMORY
// File: frontend/js/memory.js
// ============================================================

const API_BASE = "";

const memoryForm = document.getElementById("memoryForm");
const memoryText = document.getElementById("memoryText");
const memoryCategory = document.getElementById("memoryCategory");
const memoryApproval = document.getElementById("memoryApproval");

const memoryList = document.getElementById("memoryList");
const memoryCount = document.getElementById("memoryCount");

const clearAllBtn = document.getElementById("clearAllBtn");
const formMessage = document.getElementById("formMessage");


// ============================================================
// MESSAGE
// ============================================================

function showMessage(message, success = true) {

    if (!formMessage) {
        return;
    }

    formMessage.textContent = message;

    formMessage.style.color = success
        ? "#4ade80"
        : "#ff6b6b";

    setTimeout(() => {

        if (formMessage) {
            formMessage.textContent = "";
        }

    }, 3500);
}


// ============================================================
// DATE FORMAT
// ============================================================

function formatDate(dateString) {

    if (!dateString) {
        return "";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleString();
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// ============================================================
// LOAD MEMORIES
// ============================================================

async function loadMemories() {

    try {

        const response = await fetch(
            `${API_BASE}/api/memory`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.error || "Could not load memories."
            );
        }

        const memories = Array.isArray(
            data.memories
        )
            ? data.memories
            : [];

        updateCount(memories.length);

        renderMemories(memories);

    } catch (error) {

        console.error(
            "Memory Load Error:",
            error
        );

        memoryList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h3>Memory unavailable</h3>
                <p>${escapeHTML(error.message)}</p>
            </div>
        `;
    }
}


// ============================================================
// UPDATE COUNT
// ============================================================

function updateCount(count) {

    if (memoryCount) {
        memoryCount.textContent = count;
    }
}


// ============================================================
// RENDER MEMORIES
// ============================================================

function renderMemories(memories) {

    if (!memoryList) {
        return;
    }

    if (!memories.length) {

        memoryList.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    🧠
                </div>

                <h3>No memories yet</h3>

                <p>
                    Add your first approved memory above.
                </p>

            </div>
        `;

        return;
    }


    memoryList.innerHTML = memories.map(memory => {

        const id = escapeHTML(
            memory.id || ""
        );

        const text = escapeHTML(
            memory.text || ""
        );

        const category = escapeHTML(
            memory.category || "general"
        );

        const date = escapeHTML(
            formatDate(
                memory.created_at
            )
        );

        return `
            <article
                class="memory-item"
                data-memory-id="${id}"
            >

                <div class="memory-content">

                    <p class="memory-text">
                        ${text}
                    </p>

                    <div class="memory-meta">

                        <span class="memory-category">
                            ${category}
                        </span>

                        <span class="memory-date">
                            ${date}
                        </span>

                    </div>

                </div>

                <button
                    class="delete-memory-btn"
                    type="button"
                    data-delete-id="${id}"
                >
                    🗑️ Delete
                </button>

            </article>
        `;

    }).join("");
}


// ============================================================
// SAVE MEMORY
// ============================================================

async function saveMemory(event) {

    event.preventDefault();

    const text = memoryText.value.trim();

    const category = memoryCategory.value;

    if (!text) {

        showMessage(
            "Please enter a memory.",
            false
        );

        return;
    }


    if (!memoryApproval.checked) {

        showMessage(
            "Please approve this memory first.",
            false
        );

        return;
    }


    const submitButton =
        memoryForm.querySelector(
            ".primary-btn"
        );

    const originalText =
        submitButton.textContent;

    submitButton.disabled = true;

    submitButton.textContent =
        "Saving...";


    try {

        const response = await fetch(
            `${API_BASE}/api/memory`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    text: text,

                    category: category,

                    approved: true

                })
            }
        );


        const data =
            await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.error ||
                "Could not save memory."
            );
        }


        showMessage(
            "Memory saved successfully."
        );


        memoryForm.reset();

        await loadMemories();


    } catch (error) {

        console.error(
            "Memory Save Error:",
            error
        );

        showMessage(
            error.message,
            false
        );

    } finally {

        submitButton.disabled = false;

        submitButton.textContent =
            originalText;
    }
}


// ============================================================
// DELETE MEMORY
// ============================================================

async function deleteMemory(memoryId) {

    if (!memoryId) {
        return;
    }


    const confirmed =
        window.confirm(
            "Delete this memory?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const response = await fetch(
            `${API_BASE}/api/memory/${encodeURIComponent(memoryId)}`,
            {
                method: "DELETE"
            }
        );


        const data =
            await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.error ||
                "Could not delete memory."
            );
        }


        showMessage(
            "Memory deleted."
        );


        await loadMemories();


    } catch (error) {

        console.error(
            "Memory Delete Error:",
            error
        );

        showMessage(
            error.message,
            false
        );
    }
}


// ============================================================
// CLEAR ALL
// ============================================================

async function clearAllMemories() {

    const confirmed =
        window.confirm(
            "Are you sure you want to delete ALL memories?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const response = await fetch(
            `${API_BASE}/api/memory`,
            {
                method: "DELETE",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    confirm: true
                })
            }
        );


        const data =
            await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.error ||
                "Could not clear memories."
            );
        }


        showMessage(
            "All memories have been cleared."
        );


        await loadMemories();


    } catch (error) {

        console.error(
            "Clear Memory Error:",
            error
        );

        showMessage(
            error.message,
            false
        );
    }
}


// ============================================================
// EVENTS
// ============================================================

if (memoryForm) {

    memoryForm.addEventListener(
        "submit",
        saveMemory
    );
}


if (clearAllBtn) {

    clearAllBtn.addEventListener(
        "click",
        clearAllMemories
    );
}


if (memoryList) {

    memoryList.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-delete-id]"
                );

            if (!button) {
                return;
            }

            const memoryId =
                button.dataset.deleteId;

            deleteMemory(memoryId);
        }
    );
}


// ============================================================
// START
// ============================================================

loadMemories();

