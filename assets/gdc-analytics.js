/* gdc-analytics.js
 *
 * Shared analytics loader for thatsgoodedesign.com.
 *
 * Why this file exists: the site has no shared templates, so every page carries
 * its own <head> and its own footer. Without this file, adding or changing
 * analytics means editing every page by hand, and any new page is silently
 * untracked. Every page loads this one file instead, so switching provider,
 * changing the token, or turning tracking off is a single edit here.
 *
 * Same pattern as mkirk-analytics.js on the author site. Deliberately a
 * separate file with its own token, so the two properties report separately.
 *
 * Currently wired for: Cloudflare Web Analytics (free, cookieless, no consent
 * banner required, no DNS change needed).
 *
 * Live since 12 September 2026. Setting TOKEN back to an empty string turns
 * all tracking off site-wide in one edit, which is the point of this file.
 * The property is thatsgoodedesign.com in Cloudflare Web Analytics; the
 * author site is a separate property with its own token, so the two report
 * separately.
 */
(function () {
  "use strict";

  /* Cloudflare Web Analytics site token. Cloudflare dashboard:
     Analytics & Logs > Web Analytics > Manage site > the token in the JS snippet.
     Empty string means tracking is off. */
  var TOKEN = "f75527e4c68b4094a603e6850d4d8e71";

  if (!TOKEN) return;

  /* Don't record local previews or the file:// opens used while editing. */
  var host = location.hostname;
  if (!host || host === "localhost" || host === "127.0.0.1" || location.protocol === "file:") return;

  /* Respect an explicit Do Not Track signal. Cloudflare is cookieless and
     collects no personal data, but honouring this costs nothing. */
  if (navigator.doNotTrack === "1" || window.doNotTrack === "1") return;

  var s = document.createElement("script");
  s.src = "https://static.cloudflareinsights.com/beacon.min.js";
  /* Cloudflare serves the beacon as an ES module. Loading it as a classic
     script fails, so this must stay type="module". Modules are deferred by
     default, so no defer is needed. */
  s.type = "module";
  /* The beacon reads its config off its own script tag, so this attribute has
     to be set before the element is appended. */
  s.setAttribute("data-cf-beacon", JSON.stringify({ token: TOKEN }));
  (document.head || document.documentElement).appendChild(s);
})();
