/**
 * VinUni AI Chat Widget — embeddable chat for external sites.
 *
 * Usage: <script src="https://vinunits.cloud/widget.js" data-org="vinuni"></script>
 *
 * The script injects a floating chat bubble + iframe pointing to
 * /widget?embed=true. No framework dependencies — vanilla JS.
 */
;(function () {
  "use strict"

  var script = document.currentScript
  if (!script) return

  var ORG = script.getAttribute("data-org") || "vinuni"
  var rawUrl =
    script.getAttribute("data-widget-url") || "https://vinunits.cloud"
  // Only allow HTTPS URLs to prevent javascript: or data: URI injection
  var WIDGET_URL = /^https:\/\/.+/.test(rawUrl) ? rawUrl : "https://vinunits.cloud"
  var rawColor = script.getAttribute("data-primary") || "#0f172a"
  // Only allow valid hex (#rgb / #rrggbb) or rgb()/rgba() color strings
  var PRIMARY_COLOR = /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})|rgba?\(.+\))$/.test(rawColor)
    ? rawColor
    : "#0f172a"
  var POSITION = script.getAttribute("data-position") || "right" // "right" | "left"

  // ── State ────────────────────────────────────────────────────────
  var isOpen = false
  var isMobile =
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    window.innerWidth < 640

  // ── Floating button ──────────────────────────────────────────────
  var bubble = document.createElement("button")
  bubble.setAttribute("aria-label", "Chat with VinUni Admissions")
  bubble.setAttribute("id", "vinuni-chat-bubble")
  bubble.innerHTML =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'

  var bubbleStyles = {
    position: "fixed",
    bottom: "20px",
    zIndex: "2147483647",
    width: "52px",
    height: "52px",
    borderRadius: "50%",
    border: "none",
    background: PRIMARY_COLOR,
    color: "white",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow:
      "0 8px 24px rgba(15,23,42,0.25), 0 2px 8px rgba(15,23,42,0.12)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    outline: "none",
    WebkitTapHighlightColor: "transparent",
  }
  bubbleStyles[POSITION === "left" ? "left" : "right"] = "20px"

  for (var k in bubbleStyles) {
    bubble.style[k] = bubbleStyles[k]
  }

  // Hover effects
  bubble.addEventListener("mouseenter", function () {
    bubble.style.transform = "scale(1.08)"
    bubble.style.boxShadow =
      "0 12px 32px rgba(15,23,42,0.32), 0 4px 12px rgba(15,23,42,0.16)"
  })
  bubble.addEventListener("mouseleave", function () {
    if (!isOpen) {
      bubble.style.transform = "scale(1)"
      bubble.style.boxShadow = bubbleStyles.boxShadow
    }
  })

  // ── Online badge ─────────────────────────────────────────────────
  var badge = document.createElement("span")
  badge.style.cssText =
    "position:absolute;top:2px;right:2px;width:11px;height:11px;border-radius:50%;background:#22c55e;border:2px solid white;"
  bubble.appendChild(badge)

  // ── Container (bubble + iframe wrapper) ──────────────────────────
  var container = document.createElement("div")
  container.setAttribute("id", "vinuni-chat-container")
  container.style.cssText = "position:fixed;z-index:2147483646;"
  container.style[POSITION === "left" ? "left" : "right"] = "20px"
  container.style.bottom = "20px"
  container.appendChild(bubble)

  // ── iframe wrapper ───────────────────────────────────────────────
  var frameWrapper = document.createElement("div")
  frameWrapper.setAttribute("id", "vinuni-chat-frame-wrapper")
  frameWrapper.setAttribute("aria-hidden", "true")
  frameWrapper.style.cssText = [
    "display:none",
    "width:" + (isMobile ? "100dvw" : "400px"),
    "height:" + (isMobile ? "100dvh" : "600px"),
    "max-height:" + (isMobile ? "100dvh" : "min(600px, calc(100dvh - 100px))"),
    "border-radius:" + (isMobile ? "0" : "16px"),
    "overflow:hidden",
    "box-shadow:0 16px 48px rgba(15,23,42,0.22), 0 4px 16px rgba(15,23,42,0.10)",
    "background:#faf9f6",
    "margin-bottom:8px",
    "transition:opacity 0.25s ease, transform 0.25s ease",
    "opacity:0",
    "transform:translateY(12px)",
  ].join(";")

  // ── iframe ───────────────────────────────────────────────────────
  var iframe = document.createElement("iframe")
  iframe.setAttribute("id", "vinuni-chat-iframe")
  iframe.setAttribute("title", "VinUni Admissions Chat")
  iframe.setAttribute("allow", "microphone")
  // allow-same-origin is safe here: the iframe loads from WIDGET_URL (a
  // different origin than the embedding site), so it only has access to its
  // own localStorage — not the parent's. Without it, the origin becomes null
  // and storage APIs break, preventing the chat from persisting session state.
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms")
  var srcUrl =
    WIDGET_URL +
    "/widget?embed=true&org=" +
    encodeURIComponent(ORG) +
    "&source_domain=" +
    encodeURIComponent(window.location.hostname) +
    "&parent_origin=" +
    encodeURIComponent(window.location.origin)
  iframe.src = srcUrl

  iframe.style.cssText = [
    "width:100%",
    "height:100%",
    "border:none",
    "background:transparent",
  ].join(";")

  frameWrapper.appendChild(iframe)
  container.appendChild(frameWrapper)
  document.body.appendChild(container)

  // ── Open / Close ─────────────────────────────────────────────────
  function open() {
    isOpen = true
    bubble.setAttribute("aria-expanded", "true")
    bubble.style.transform = "scale(0.9)"
    bubble.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'

    // On mobile, pin container to full screen edges
    if (isMobile) {
      container.style.left = "0"
      container.style.right = "0"
      container.style.bottom = "0"
    }

    frameWrapper.style.display = "block"
    // Force reflow for transition
    frameWrapper.offsetHeight
    frameWrapper.style.opacity = "1"
    frameWrapper.style.transform = "translateY(0)"
  }

  function close() {
    isOpen = false
    bubble.setAttribute("aria-expanded", "false")
    bubble.style.transform = "scale(1)"
    bubble.innerHTML =
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'

    // Restore container offset
    if (isMobile) {
      container.style.left = ""
      container.style.right = ""
      container.style.bottom = ""
      container.style[POSITION === "left" ? "left" : "right"] = "20px"
      container.style.bottom = "20px"
    }

    frameWrapper.style.opacity = "0"
    frameWrapper.style.transform = "translateY(12px)"
    setTimeout(function () {
      if (!isOpen) frameWrapper.style.display = "none"
    }, 260)
  }

  bubble.addEventListener("click", function () {
    if (isOpen) close()
    else open()
  })

  // ── Listen for messages from iframe ──────────────────────────────
  window.addEventListener("message", function (event) {
    // Only accept messages from the widget origin
    if (event.origin !== _resolveWidgetOrigin()) return
    if (!event.data || typeof event.data !== "object") return

    if (event.data.type === "vinuni-widget-ready") {
      console.log("[VinUni Widget] Chat ready")
    }

    if (event.data.type === "vinuni-widget-close") {
      close()
    }
  })

  function _resolveWidgetOrigin() {
    // Parse the widget URL to get its origin for postMessage validation
    try {
      return new URL(WIDGET_URL).origin
    } catch (_) {
      return WIDGET_URL
    }
  }

  // ── Resize handler ───────────────────────────────────────────────
  var resizeTimer
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(function () {
      var nowMobile =
        /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        window.innerWidth < 640
      if (nowMobile !== isMobile) {
        isMobile = nowMobile
        frameWrapper.style.width = isMobile ? "100dvw" : "400px"
        frameWrapper.style.height = isMobile ? "100dvh" : "600px"
        frameWrapper.style.borderRadius = isMobile ? "0" : "16px"
        frameWrapper.style.maxHeight = isMobile
          ? "100dvh"
          : "min(600px, calc(100dvh - 100px))"

        // Re-snap container edges when open on mobile
        if (isOpen) {
          if (isMobile) {
            container.style.left = "0"
            container.style.right = "0"
            container.style.bottom = "0"
          } else {
            container.style.left = ""
            container.style.right = ""
            container.style.bottom = ""
            container.style[POSITION === "left" ? "left" : "right"] = "20px"
            container.style.bottom = "20px"
          }
        }
      }
    }, 200)
  })

  console.log("[VinUni Widget] Loaded — click the chat bubble to start")
})()
