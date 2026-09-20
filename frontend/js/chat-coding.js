"use strict";

/*

SK CHAT → CODING BRIDGE

CHAT:
User writes coding request
↓
💻 Coding button
↓
coding.html
↓
Prompt automatically appears
↓
SK automatically generates code
↓
Code appears ONLY in Coding Editor + Preview

The coding request is NOT sent as a normal chat message.

*/

const SK_CODING_PROMPT_KEY = "sk_coding_prompt";

/* =====================================================
SAVE CODING REQUEST FROM CHAT
===================================================== */

function setupChatCodingButton() {

const codingButton =
    document.getElementById("codingBtn");

const messageInput =
    document.getElementById("messageInput");


if (!codingButton || !messageInput) {
    return;
}


codingButton.addEventListener("click", function () {

    const prompt =
        messageInput.value.trim();


    /* Empty message */

    if (!prompt) {

        messageInput.focus();

        return;
    }


    try {

        localStorage.setItem(
            SK_CODING_PROMPT_KEY,
            prompt
        );

    } catch (error) {

        console.error(
            "SK Coding Bridge Error:",
            error
        );

        return;
    }


    /*
    IMPORTANT:

    Do NOT submit chat form.
    Do NOT call /api/chat.

    Directly open Coding page.
    */

    window.location.href = "coding.html";

});

}

/* =====================================================
RECEIVE REQUEST ON CODING PAGE
===================================================== */

function setupCodingAutoPrompt() {

const codingPrompt =
    document.getElementById("codingPrompt");

const generateButton =
    document.getElementById(
        "generateCodeButton"
    );


if (
    !codingPrompt ||
    !generateButton
) {

    return;
}


let prompt = "";


try {

    prompt =
        localStorage.getItem(
            SK_CODING_PROMPT_KEY
        ) || "";

} catch (error) {

    console.error(
        "SK Coding Prompt Read Error:",
        error
    );

    return;
}


/*
No request came from Chat.
*/

if (!prompt.trim()) {

    return;
}


/*
Put request inside
Ask SK to Build box.
*/

codingPrompt.value = prompt;


/*
Remove temporary bridge data
immediately.

This prevents the same request
from generating again after
page refresh.
*/

try {

    localStorage.removeItem(
        SK_CODING_PROMPT_KEY
    );

} catch (error) {

    console.warn(
        "SK Coding Prompt Clear Error:",
        error
    );

}


/*
Let coding.js finish loading.

Then automatically click
Generate Code.
*/

setTimeout(function () {

    if (
        !codingPrompt.value.trim()
    ) {

        return;
    }


    generateButton.click();

}, 500);

}

/* =====================================================
INITIALIZE
===================================================== */

function initializeSKCodingBridge() {

setupChatCodingButton();

setupCodingAutoPrompt();

}

/* =====================================================
DOM READY
===================================================== */

if (
document.readyState === "loading"
) {

document.addEventListener(
    "DOMContentLoaded",
    initializeSKCodingBridge
);

} else {

initializeSKCodingBridge();

}