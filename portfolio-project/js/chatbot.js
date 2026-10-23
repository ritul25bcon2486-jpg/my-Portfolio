(function () {
  "use strict";

  var MAX_MESSAGE_LENGTH = 500;
  var HISTORY_TURNS = 6;
  var STARTERS = [
    "What projects have you completed?",
    "What was corrected in the buggy code project?",
    "Explain your Python programs.",
  ];

  var history = [];
  var waiting = false;
  var lastFocus = null;

  var launcher;
  var panel;
  var messagesEl;
  var inputEl;
  var sendBtn;
  var closeBtn;

  init();

  function init() {
    mountWidget();
    var heroOpen = document.getElementById("open-chatbot");
    if (heroOpen) {
      heroOpen.addEventListener("click", openPanel);
    }
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && panel && !panel.hidden) {
        closePanel();
      }
    });
  }

  function mountWidget() {
    launcher = document.createElement("button");
    launcher.type = "button";
    launcher.className = "chat-launcher";
    launcher.setAttribute("aria-label", "Open AI assistant");
    var icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "💬";
    var badge = document.createElement("span");
    badge.textContent = "Ask AI";
    launcher.append(icon, badge);
    launcher.addEventListener("click", openPanel);

    panel = document.createElement("div");
    panel.className = "chat-panel";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "chat-title");

    panel.append(buildHeader(), buildBody(), buildFooter());
    document.body.append(launcher, panel);

    messagesEl = panel.querySelector(".chat-messages");
    inputEl = panel.querySelector(".chat-input");
    sendBtn = panel.querySelector(".chat-send");
    closeBtn = panel.querySelector(".chat-close");

    closeBtn.addEventListener("click", closePanel);
    sendBtn.addEventListener("click", submitMessage);
    inputEl.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submitMessage();
      }
    });

    showWelcome();
  }

  function buildHeader() {
    var header = document.createElement("div");
    header.className = "chat-header";

    var avatar = document.createElement("div");
    avatar.className = "chat-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = "🤖";

    var meta = document.createElement("div");
    var title = document.createElement("h2");
    title.id = "chat-title";
    title.textContent = "Portfolio Assistant";
    var status = document.createElement("p");
    status.className = "chat-status";
    var dot = document.createElement("span");
    dot.className = "status-dot";
    dot.setAttribute("aria-hidden", "true");
    status.append(dot, document.createTextNode("Active"));
    meta.append(title, status);

    closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "chat-close";
    closeBtn.setAttribute("aria-label", "Close assistant");
    closeBtn.textContent = "✕";

    header.append(avatar, meta, closeBtn);
    return header;
  }

  function buildBody() {
    var body = document.createElement("div");
    body.className = "chat-messages";
    return body;
  }

  function buildFooter() {
    var footer = document.createElement("div");
    footer.className = "chat-footer";

    var compose = document.createElement("div");
    compose.className = "chat-compose";

    inputEl = document.createElement("input");
    inputEl.className = "chat-input";
    inputEl.type = "text";
    inputEl.maxLength = MAX_MESSAGE_LENGTH;
    inputEl.setAttribute("aria-label", "Message the portfolio assistant");
    inputEl.placeholder = "Ask about projects…";

    sendBtn = document.createElement("button");
    sendBtn.type = "button";
    sendBtn.className = "chat-send";
    sendBtn.setAttribute("aria-label", "Send message");
    sendBtn.textContent = "➤";

    compose.append(inputEl, sendBtn);

    var attr = document.createElement("p");
    attr.className = "chat-attr";
    attr.textContent = "Answers grounded in student portfolio data";

    footer.append(compose, attr);
    return footer;
  }

  function showWelcome() {
    appendBubble(
      "assistant",
      "Hi — I can answer questions about this student's projects, skills, and coursework. Try a prompt below."
    );
    var wrap = document.createElement("div");
    wrap.className = "starter-prompts";
    STARTERS.forEach(function (text) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = text;
      btn.addEventListener("click", function () {
        sendPrompt(text);
      });
      wrap.appendChild(btn);
    });
    messagesEl.appendChild(wrap);
    scrollToBottom();
  }

  function openPanel() {
    lastFocus = document.activeElement;
    panel.hidden = false;
    launcher.hidden = true;
    inputEl.focus();
  }

  function closePanel() {
    panel.hidden = true;
    launcher.hidden = false;
    if (lastFocus && typeof lastFocus.focus === "function") {
      lastFocus.focus();
    } else {
      launcher.focus();
    }
  }

  function submitMessage() {
    sendPrompt(inputEl.value);
  }

  function sendPrompt(raw) {
    if (window.location.protocol === "file:") {
      appendBubble(
        "error",
        "Open this site through your Vercel URL or http://localhost:3000 (run `vercel dev`). It does not work when opened as a file."
      );
      return;
    }

    var message = String(raw || "").trim();
    if (waiting) return;
    if (!message) return;
    if (message.length > MAX_MESSAGE_LENGTH) {
      appendBubble("error", "Please keep questions under 500 characters.");
      return;
    }

    inputEl.value = "";
    appendBubble("user", message);
    history.push({ role: "user", content: message });
    trimHistory();
    requestReply(message);
  }

  function trimHistory() {
    if (history.length > HISTORY_TURNS) {
      history = history.slice(-HISTORY_TURNS);
    }
  }

  function setWaiting(isWaiting) {
    waiting = isWaiting;
    inputEl.disabled = isWaiting;
    sendBtn.disabled = isWaiting;
  }

  function requestReply(message) {
    var url = "/api/chat";
    setWaiting(true);
    var typing = appendTyping();

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: message,
        history: history.slice(0, -1),
      }),
    })
      .then(function (response) {
        return response.text().then(function (rawText) {
          return { response: response, rawText: rawText };
        });
      })
      .then(function (result) {
        typing.remove();
        var status = result.response.status;
        var rawText = result.rawText;
        var data = null;
        try {
          data = rawText ? JSON.parse(rawText) : null;
        } catch (parseError) {
          data = null;
        }

        if (result.response.ok && data && data.reply) {
          appendBubble("assistant", data.reply);
          history.push({ role: "assistant", content: data.reply });
          trimHistory();
          return;
        }

        console.error("Chat API failure URL:", url);
        console.error("Chat API failure status:", status);
        console.error("Chat API failure response text:", rawText);

        if (status === 404) {
          appendBubble(
            "error",
            "The assistant service isn't available right now."
          );
          return;
        }
        if (status === 405) {
          appendBubble("error", "The assistant is misconfigured.");
          return;
        }
        if (status === 429) {
          appendBubble("error", "The assistant is busy. Try again shortly.");
          return;
        }
        if (status === 500) {
          appendBubble(
            "error",
            (data && data.error) || "The assistant is not configured yet."
          );
          return;
        }
        appendBubble(
          "error",
          (data && data.error) ||
            "The assistant is unavailable right now. Please try again shortly."
        );
      })
      .catch(function (err) {
        console.error("Chat API failure URL:", url);
        console.error("Chat network error (fetch threw):", err);
        typing.remove();
        appendBubble(
          "error",
          "I could not reach the assistant. Check your connection and try again."
        );
      })
      .finally(function () {
        setWaiting(false);
        inputEl.focus();
      });
  }

  function appendBubble(kind, text) {
    var bubble = document.createElement("div");
    bubble.className = "chat-bubble " + kind;
    bubble.textContent = text;
    messagesEl.appendChild(bubble);
    scrollToBottom();
    return bubble;
  }

  function appendTyping() {
    var bubble = document.createElement("div");
    bubble.className = "chat-bubble assistant typing-indicator";
    bubble.setAttribute("aria-label", "Assistant is typing");
    for (var i = 0; i < 3; i += 1) {
      bubble.appendChild(document.createElement("span"));
    }
    messagesEl.appendChild(bubble);
    scrollToBottom();
    return bubble;
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
})();
