(function () {
  var KEY = "portfolio-theme";
  var root = document.documentElement;

  function setThemeColorMeta() {
    var t = root.dataset.theme;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta && (t === "light" || t === "dark")) {
      meta.setAttribute("content", t === "light" ? "#f1f5f9" : "#171721");
    }
  }

  function syncToggleButton(btn) {
    if (!btn) return;
    var dark = root.dataset.theme === "dark";
    btn.setAttribute(
      "aria-label",
      dark ? "Switch to light mode" : "Switch to dark mode"
    );
    btn.title = btn.getAttribute("aria-label") || "";
    var d = btn.querySelector(".theme-icon-dark");
    var l = btn.querySelector(".theme-icon-light");
    if (d) d.hidden = !dark;
    if (l) l.hidden = dark;
  }

  function save(next) {
    try {
      localStorage.setItem(KEY, next);
    } catch (e) {}
  }

  root.addEventListener("click", function (ev) {
    var btn = ev.target.closest("#theme-toggle");
    if (!btn) return;
    var next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    save(next);
    setThemeColorMeta();
    syncToggleButton(btn);
    try {
      window.dispatchEvent(new CustomEvent("portfolio-theme", { detail: { theme: next } }));
    } catch (e) {}
  });

  document.addEventListener("DOMContentLoaded", function () {
    setThemeColorMeta();
    syncToggleButton(document.getElementById("theme-toggle"));
  });
})();
