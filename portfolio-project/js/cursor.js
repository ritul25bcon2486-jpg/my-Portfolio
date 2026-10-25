/**
 * Custom Cursor & Magnetic Micro-Interactions
 * Performance-first vanilla JS with RAF lerp loop and pooled DOM elements.
 * Only activates on fine-pointer devices with hover capability.
 */
(function () {
  "use strict";

  // Feature detection: only activate on devices with fine pointer & hover support
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    return;
  }

  var isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // State variables
  var mouseX = -100;
  var mouseY = -100;
  var ringX = -100;
  var ringY = -100;
  var isVisible = false;
  var isHovered = false;
  var activeState = "";
  var rafId = null;

  // LERP factor (higher = snappier, lower = smoother lag)
  var LERP_FACTOR = isReducedMotion ? 1 : 0.16;
  var TRAIL_COUNT = isReducedMotion ? 0 : 6;

  // Create cursor DOM elements
  var dot = document.createElement("div");
  dot.className = "cursor-dot";
  dot.setAttribute("aria-hidden", "true");

  var ring = document.createElement("div");
  ring.className = "cursor-ring";
  ring.setAttribute("aria-hidden", "true");

  var label = document.createElement("span");
  label.className = "cursor-label";
  label.textContent = "";
  ring.appendChild(label);

  document.body.appendChild(dot);
  document.body.appendChild(ring);
  document.body.classList.add("custom-cursor-active");

  // Create trail dots if motion is not reduced
  var trails = [];
  var trailPositions = [];
  if (TRAIL_COUNT > 0) {
    for (var i = 0; i < TRAIL_COUNT; i++) {
      var t = document.createElement("div");
      t.className = "cursor-trail-dot";
      t.setAttribute("aria-hidden", "true");
      t.style.opacity = String((1 - (i / TRAIL_COUNT)) * 0.45);
      t.style.transform = "scale(" + (1 - (i / TRAIL_COUNT) * 0.55).toFixed(2) + ")";
      document.body.appendChild(t);
      trails.push(t);
      trailPositions.push({ x: -100, y: -100 });
    }
  }

  // Animation Loop
  function renderLoop() {
    if (isVisible) {
      // Linear interpolation for outer ring
      ringX += (mouseX - ringX) * LERP_FACTOR;
      ringY += (mouseY - ringY) * LERP_FACTOR;

      dot.style.transform = "translate3d(" + mouseX + "px, " + mouseY + "px, 0)";
      ring.style.transform = "translate3d(" + ringX + "px, " + ringY + "px, 0)";

      // Update trail dots
      if (TRAIL_COUNT > 0) {
        var prevX = mouseX;
        var prevY = mouseY;
        for (var j = 0; j < trails.length; j++) {
          var pos = trailPositions[j];
          pos.x += (prevX - pos.x) * 0.35;
          pos.y += (prevY - pos.y) * 0.35;
          trails[j].style.transform = "translate3d(" + pos.x + "px, " + pos.y + "px, 0) scale(" + (1 - (j / TRAIL_COUNT) * 0.55).toFixed(2) + ")";
          prevX = pos.x;
          prevY = pos.y;
        }
      }
    }
    rafId = requestAnimationFrame(renderLoop);
  }

  // Pointer Move
  window.addEventListener(
    "pointermove",
    function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (!isVisible) {
        isVisible = true;
        dot.classList.add("is-visible");
        ring.classList.add("is-visible");
        trails.forEach(function (t) {
          t.classList.add("is-visible");
        });
      }
    },
    { passive: true }
  );

  // Window Leave / Enter
  document.addEventListener("mouseleave", function () {
    isVisible = false;
    dot.classList.remove("is-visible");
    ring.classList.remove("is-visible");
    trails.forEach(function (t) {
      t.classList.remove("is-visible");
    });
    // Reset any stuck magnetic transforms or card tilts
    document.querySelectorAll(".is-magnet-active").forEach(function (elem) {
      elem.style.transform = "";
      elem.classList.remove("is-magnet-active");
    });
    document.querySelectorAll(".project-card").forEach(function (c) {
      c.style.transform = "";
    });
  });

  document.addEventListener("mouseenter", function () {
    isVisible = true;
    dot.classList.add("is-visible");
    ring.classList.add("is-visible");
    trails.forEach(function (t) {
      t.classList.add("is-visible");
    });
  });

  // Press & Click effects
  window.addEventListener(
    "pointerdown",
    function () {
      ring.classList.add("is-pressed");
      dot.classList.add("is-pressed");
    },
    { passive: true }
  );

  window.addEventListener(
    "pointerup",
    function () {
      ring.classList.remove("is-pressed");
      dot.classList.remove("is-pressed");
    },
    { passive: true }
  );

  // Click ripple burst
  window.addEventListener("click", function (e) {
    if (isReducedMotion) return;

    var ripple = document.createElement("div");
    ripple.className = "cursor-ripple";
    ripple.setAttribute("aria-hidden", "true");
    ripple.style.left = e.clientX + "px";
    ripple.style.top = e.clientY + "px";
    document.body.appendChild(ripple);

    ripple.addEventListener("animationend", function () {
      ripple.remove();
    });
  });

  // State Detection using Event Delegation (lightweight and works for dynamically added elements)
  document.addEventListener(
    "pointerover",
    function (e) {
      var target = e.target;
      if (!target || !(target instanceof Element)) return;

      // Inputs & Text fields -> restore native text cursor, hide custom cursor
      var isInput = target.closest(
        'input, textarea, select, [contenteditable="true"], .chat-messages'
      );
      if (isInput) {
        ring.classList.add("is-hidden");
        dot.classList.add("is-hidden");
        trails.forEach(function (t) {
          t.classList.add("is-hidden");
        });
        document.body.classList.add("cursor-native-override");
        return;
      }

      // Project Cards
      var card = target.closest(".project-card");
      if (card) {
        setState("state-card", "View");
        return;
      }

      // Hero Profile Image
      var profile = target.closest(".profile-frame-container, .profile-frame");
      if (profile) {
        setState("state-profile", "");
        return;
      }

      // Links, Buttons, Chips, Toggles
      var clickable = target.closest(
        'a, button, .btn, .chip, .icon-link, .nav-toggle, .theme-toggle, [role="button"], [role="switch"]'
      );
      if (clickable) {
        setState("state-clickable", "");
        return;
      }

      // Default state
      clearState();
    },
    { passive: true }
  );

  document.addEventListener(
    "pointerout",
    function (e) {
      var target = e.target;
      if (!target || !(target instanceof Element)) return;

      var isInput = target.closest(
        'input, textarea, select, [contenteditable="true"], .chat-messages'
      );
      if (isInput) {
        ring.classList.remove("is-hidden");
        dot.classList.remove("is-hidden");
        trails.forEach(function (t) {
          t.classList.remove("is-hidden");
        });
        document.body.classList.remove("cursor-native-override");
      }
    },
    { passive: true }
  );

  function setState(stateClass, labelText) {
    if (activeState === stateClass) return;
    clearState();
    activeState = stateClass;
    ring.classList.add(stateClass);
    dot.classList.add(stateClass);
    label.textContent = labelText || "";
  }

  function clearState() {
    if (!activeState) return;
    ring.classList.remove(activeState);
    dot.classList.remove(activeState);
    label.textContent = "";
    activeState = "";
  }

  // Start animation loop
  rafId = requestAnimationFrame(renderLoop);

  /* --------------------------------------------------------------------------
     MAGNETIC EFFECT FOR BUTTONS & ICONS
     -------------------------------------------------------------------------- */
  if (!isReducedMotion) {
    initMagneticElements();
  }

  function initMagneticElements() {
    var magneticSelectors = [
      ".btn",
      ".icon-link",
      ".contact-card-link",
      ".chat-launcher",
      ".footer-back-to-top",
      ".theme-toggle"
    ];

    document.addEventListener(
      "mousemove",
      function (e) {
        var targets = document.querySelectorAll(magneticSelectors.join(","));
        var mousePoint = { x: e.clientX, y: e.clientY };

        targets.forEach(function (elem) {
          if (elem.closest(".chat-panel") && elem.closest(".chat-panel").hidden) return;

          var rect = elem.getBoundingClientRect();
          var centerX = rect.left + rect.width / 2;
          var centerY = rect.top + rect.height / 2;
          var distX = mousePoint.x - centerX;
          var distY = mousePoint.y - centerY;
          var distance = Math.hypot(distX, distY);
          var maxPullRadius = Math.max(rect.width, rect.height) * 0.9 + 40;

          if (distance < maxPullRadius) {
            var pullPower = 0.28;
            var moveX = distX * pullPower;
            var moveY = distY * pullPower;
            elem.style.transform = "translate3d(" + moveX.toFixed(2) + "px, " + moveY.toFixed(2) + "px, 0)";
            elem.classList.add("is-magnet-active");
          } else if (elem.classList.contains("is-magnet-active")) {
            elem.style.transform = "";
            elem.classList.remove("is-magnet-active");
          }
        });
      },
      { passive: true }
    );
  }

  /* --------------------------------------------------------------------------
     PROJECT CARD SPOTLIGHT & 3D TILT
     -------------------------------------------------------------------------- */
  document.addEventListener(
    "mousemove",
    function (e) {
      var card = e.target && e.target instanceof Element ? e.target.closest(".project-card") : null;
      if (!card) return;

      var rect = card.getBoundingClientRect();
      var x = ((e.clientX - rect.left) / rect.width) * 100;
      var y = ((e.clientY - rect.top) / rect.height) * 100;

      card.style.setProperty("--mx", x.toFixed(2) + "%");
      card.style.setProperty("--my", y.toFixed(2) + "%");

      // Subtle 3D tilt on desktop (max ~5deg)
      if (!isReducedMotion && window.innerWidth >= 768) {
        var tiltX = ((y - 50) / 50) * -5;
        var tiltY = ((x - 50) / 50) * 5;
        card.style.transform = "perspective(900px) rotateX(" + tiltX.toFixed(2) + "deg) rotateY(" + tiltY.toFixed(2) + "deg) translateY(-4px)";
      }
    },
    { passive: true }
  );

  document.addEventListener(
    "mouseout",
    function (e) {
      var card = e.target && e.target instanceof Element ? e.target.closest(".project-card") : null;
      if (card && (!e.relatedTarget || !card.contains(e.relatedTarget))) {
        card.style.transform = "";
      }
    },
    { passive: true }
  );

  /* --------------------------------------------------------------------------
     DIRECTION-AWARE NAV UNDERLINE (Smooth entry from left or right)
     -------------------------------------------------------------------------- */
  var navLinks = document.querySelectorAll('.nav-list a[href^="#"]');
  navLinks.forEach(function (link) {
    link.addEventListener("mouseenter", function (e) {
      var rect = link.getBoundingClientRect();
      var fromLeft = e.clientX - rect.left < rect.width / 2;
      link.style.setProperty("--underline-origin", fromLeft ? "left" : "right");
    });
  });
})();
