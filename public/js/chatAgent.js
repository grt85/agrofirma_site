// ====================================
// AgroFirma Chat Widget
// ====================================

const API_URL =
  window.location.hostname.includes("localhost")
    ? "http://localhost:3000"
    : "https://agrofirma.onrender.com";

const messagesContainer =
  document.getElementById("chat-messages");

const toggle =
  document.getElementById("chat-toggle");

const widget =
  document.getElementById("chat-widget");

const sendBtn =
  document.getElementById("chat-send");

const input =
  document.getElementById("chat-input");

const closeBtn =
  document.getElementById("chat-close");

let greetingShown = false;

// ====================================
// MESSAGES
// ====================================

function addMessage(
  text,
  type = "agent"
) {

  if (!messagesContainer) return;

  const message =
    document.createElement("div");

  message.classList.add(
    "chat-message",
    type
  );

  const icon =
    type === "user"
      ? "👤"
      : "🤖";

  message.textContent =
    `${icon} ${text}`;

  messagesContainer.appendChild(
    message
  );

  scrollToBottom();
}

// ====================================
// SCROLL
// ====================================

function scrollToBottom() {

  if (!messagesContainer) return;

  messagesContainer.scrollTop =
    messagesContainer.scrollHeight;

}

// ====================================
// BUTTONS
// ====================================

function clearButtons() {

  const oldButtons =
    messagesContainer?.querySelector(
      ".chat-buttons"
    );

  if (oldButtons) {
    oldButtons.remove();
  }

}

function renderButtons(
  buttons = []
) {

  clearButtons();

  if (
    !messagesContainer ||
    !Array.isArray(buttons) ||
    !buttons.length
  ) {
    return;
  }

  const wrapper =
    document.createElement("div");

  wrapper.className =
    "chat-buttons";

  buttons.forEach(btn => {

    const button =
      document.createElement("button");

    button.className =
      "chat-option-btn";

    button.textContent =
      btn.label;

    button.addEventListener(
      "click",
      () => sendMessage(btn.action)
    );

    wrapper.appendChild(button);

  });

  messagesContainer.appendChild(
    wrapper
  );

  scrollToBottom();

}

// ====================================
// SEND MESSAGE
// ====================================

export async function sendMessage(
  text = ""
) {

  if (typeof text !== "string") {
    return;
  }

  const question =
    text.trim();

  if (question) {

    addMessage(
      question,
      "user"
    );

  }

  try {

    const response =
      await fetch(
        `${API_URL}/fallback-agent`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            question
          })
        }
      );

    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );

    }

    const data =
      await response.json();

    // -------------------
    // TEXT RESPONSE
    // -------------------

    if (data.answer?.text) {

      addMessage(
        data.answer.text,
        "agent"
      );

    } else if (data.text) {

      addMessage(
        data.text,
        "agent"
      );

    }

    // -------------------
    // ERROR RESPONSE
    // -------------------

    if (data.answer?.error) {

      addMessage(
        data.answer.error,
        "agent"
      );

    }

    // -------------------
    // BUTTONS
    // -------------------

    const buttons =
      data.buttons ||
      data.answer?.buttons;

    if (
      Array.isArray(buttons)
    ) {

      renderButtons(
        buttons
      );

    }

  } catch (error) {

    console.error(
      "Chat Error:",
      error
    );

    addMessage(
      "Помилка з'єднання із сервером",
      "agent"
    );

  }

}

// ====================================
// OPEN CHAT
// ====================================

toggle?.addEventListener(
  "click",
  () => {

    widget?.classList.toggle(
      "active"
    );

    if (
      widget?.classList.contains(
        "active"
      ) &&
      !greetingShown
    ) {

      greetingShown = true;

      sendMessage(
        "privet"
      );

    }

  }
);

// ====================================
// CLOSE CHAT
// ====================================

closeBtn?.addEventListener(
  "click",
  () => {

    widget?.classList.remove(
      "active"
    );

  }
);

// ====================================
// SEND BUTTON
// ====================================

sendBtn?.addEventListener(
  "click",
  () => {

    const text =
      input?.value.trim();

    if (!text) return;

    sendMessage(text);

    input.value = "";

    input.focus();

  }
);

// ====================================
// ENTER KEY
// ====================================

input?.addEventListener(
  "keydown",
  event => {

    if (
      event.key !== "Enter"
    ) {
      return;
    }

    event.preventDefault();

    const text =
      input.value.trim();

    if (!text) {
      return;
    }

    sendMessage(text);

    input.value = "";

  }
);
