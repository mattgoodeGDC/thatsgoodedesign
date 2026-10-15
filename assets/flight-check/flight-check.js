/* flight-check.js – the CLUTCH flight check runner (WEBSITE, 15 Oct 2026).
 *
 * One runner, one config per check. The page sets data-check="engine" on
 * #fc-root and loads the matching config (engine.js) before this file.
 * Gear, compass and handoff are added later as gear.js, compass.js and
 * handoff.js; nothing in this file names a cylinder or a statement.
 *
 * What it does: one statement at a time, prime scoring with reversed warning
 * signs, bands, Start here with the override and the one upstream line,
 * strongest with the tie rule, patterns, steps by band, the pair line, the
 * mixed-signal flag, the candor reading, personal-pace hesitation, the
 * 8-second nudge, the clock (paused during interstitials), keyboard 1 to 5.
 *
 * Data: answers and timings live in this tab only until the last statement.
 * On finish, one anonymous "complete" record goes to the hidden Jotform.
 * If the person asks for the full report, a "contact" record with the same
 * Record ID follows. Abandoned runs and the example readout send nothing.
 */
(function () {
  "use strict";

  /* ---- Capture form: "GDC - Flight check - Capture (hidden)", from
     "handover - 2026-10-15 - DALE - Flight check capture form". One form for
     all four checks. Field names are DALE's (intake design v0.2, 2.1); the
     input names are read from the live form (q2_q2_textbox0 style, not the
     q2_textbox0 in the handover). Setting formId to null stops all posting
     (records are still kept in window.FC_POSTS for checking). ---- */
  var FORM = {
    formId: "262873859807072",
    endpoint: "https://submit.jotform.com/submit/262873859807072/",
    fields: {
      event: "q2_q2_textbox0", recordId: "q3_q3_textbox1", flightId: "q4_q4_textbox2", check: "q5_q5_textbox3",
      copyVersion: "q6_q6_textbox4", source: "q7_q7_textbox5", completedAt: "q8_q8_textbox6",
      answers: "q9_q9_textarea7", timings: "q10_q10_textarea8", medianMs: "q11_q11_textbox9", hesitationLimitMs: "q12_q12_textbox10",
      groupScores: "q13_q13_textarea11", groupBands: "q14_q14_textarea12", total: "q15_q15_textbox13", scaled: "q16_q16_textbox14",
      pattern: "q17_q17_textbox15", weakest: "q18_q18_textbox16", ethicsOverride: "q19_q19_textbox17", strongest: "q20_q20_textbox18",
      upstream: "q21_q21_textbox19", hesitated: "q22_q22_textarea20", hesitationCount: "q23_q23_textbox21", mixed: "q24_q24_textbox22",
      candorScore: "q25_q25_textbox23", candor: "q26_q26_textbox24", homeGear: "q27_q27_textbox25", stretchGear: "q28_q28_textbox26",
      checksInFlight: "q29_q29_textbox27", flightSkip: "q30_q30_textbox28", timeToFinishS: "q31_q31_textbox29", underLimit: "q32_q32_textbox30",
      reportRequested: "q33_q33_textbox31", requestedAt: "q34_q34_textbox32", firstName: "q35_q35_textbox33", email: "q36_q36_textbox34",
      organization: "q37_q37_textbox35", orgType: "q38_q38_textbox36", seat: "q39_q39_textbox37", kitTags: "q40_q40_textarea38",
      rpt_pattern: "q41_q41_textarea39", rpt_start: "q42_q42_textarea40", rpt_cylinders: "q43_q43_textarea41",
      rpt_steps: "q44_q44_textarea42", rpt_questions: "q45_q45_textarea43", rpt_candor: "q46_q46_textarea44"
    }
  };

  var root = document.getElementById("fc-root");
  if (!root) return;
  var CFG = (window.FLIGHT_CHECKS || {})[root.getAttribute("data-check")];
  if (!CFG) return;

  var PRIME = [2, 3, 5, 7, 11];
  var LABELS = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"];
  var CAL = root.getAttribute("data-calendly") || "https://calendly.com/matt-thatsgoodedesign/chatt-with-matt";
  var N = CFG.items.length;
  var ORDER = CFG.order, NAME = CFG.names;
  window.FC_POSTS = window.FC_POSTS || [];

  /* ---------- helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function fmt(t) { var s = Math.max(0, Math.round(t / 1000)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function rid(prefix) {
    var a = new Uint8Array(8);
    try { crypto.getRandomValues(a); } catch (e) { for (var i = 0; i < 8; i++) a[i] = Math.random() * 256; }
    return prefix + Array.prototype.map.call(a, function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }
  /* Flight ID: random, per browser, kept 30 days; joins up to four checks. */
  function flight() {
    var f = null;
    try { f = JSON.parse(store("gdc-flight") || "null"); } catch (e) {}
    if (!f || !f.id || Date.now() - f.at > 30 * 864e5) f = { id: rid("fl_"), at: Date.now(), done: {} };
    return f;
  }
  function flightDone(check) {
    var f = flight(); f.done[check] = 1; store("gdc-flight", JSON.stringify(f));
    return Object.keys(f.done).length;
  }
  function bandOf(s) { for (var i = 0; i < CFG.bands.length; i++) if (s >= CFG.bands[i].min) return CFG.bands[i].key; }
  function bandLabel(k) { for (var i = 0; i < CFG.bands.length; i++) if (CFG.bands[i].key === k) return CFG.bands[i].label; }
  function score(i, v) { return CFG.items[i][2] ? PRIME[4 - v] : PRIME[v]; }
  function idxOf(field) { for (var i = 0; i < N; i++) if (CFG.items[i][0] === field) return i; return -1; }

  /* ---------- state ---------- */
  var ans, ms, cur, shownAt, startAt, pausedMs, pauseAt, tick, locked, inInter, autoT, seen, R, REC;

  /* ---------- scoring and rules ---------- */
  function compute(answers, timings) {
    var tot = {}, hes = {};
    ORDER.forEach(function (k) { tot[k] = 0; hes[k] = 0; });
    CFG.items.forEach(function (it, i) { tot[it[1]] += score(i, answers[i]); });

    /* R7: hesitation is relative to this person's own pace. */
    var sorted = timings.slice().sort(function (a, b) { return a - b; });
    var med = N % 2 ? sorted[(N - 1) / 2] : (sorted[N / 2 - 1] + sorted[N / 2]) / 2;
    var limit = Math.max(4000, med * 1.75);
    var slow = CFG.items.map(function (it, i) { return { i: i, t: timings[i] }; })
      .filter(function (o) { return o.t > limit; })
      .sort(function (a, b) { return b.t - a.t; });
    slow.forEach(function (o) { hes[CFG.items[o.i][1]]++; });

    var bands = {};
    ORDER.forEach(function (k) { bands[k] = bandOf(tot[k]); });
    var sum = ORDER.reduce(function (a, k) { return a + tot[k]; }, 0);
    var nMiss = ORDER.filter(function (k) { return bands[k] === "miss"; }).length;
    var nFire = ORDER.filter(function (k) { return bands[k] === "fire"; }).length;
    var P = CFG.pattern(nMiss, nFire, ORDER.length);
    var oi = function (k) { return ORDER.indexOf(k); };

    /* R2: weakest = lowest; ties go to more hesitations, then CREATE order. */
    var weakest = ORDER.slice().sort(function (a, b) { return tot[a] - tot[b] || hes[b] - hes[a] || oi(a) - oi(b); })[0];
    /* Start here: the override group starts when it is in the override band. */
    var ov = CFG.startOverride, start = weakest, startBlock = CFG.startQ;
    if (ov && bands[ov.group] === ov.band) { start = ov.group; startBlock = ov.block; }
    /* R12: at most one upstream line. */
    var upstream = null, upstreamId = null;
    (CFG.upstream || []).some(function (u) {
      if (u[0] === start && bands[u[1]] !== "fire") { upstream = u[2]; upstreamId = "upstream." + u[0] + "." + u[1]; return true; }
      return false;
    });
    /* R3: strongest = highest other than Start here, same tie rule. */
    var strong = ORDER.filter(function (k) { return k !== start; })
      .sort(function (a, b) { return tot[b] - tot[a] || hes[b] - hes[a] || oi(a) - oi(b); })[0];

    /* R8: strongly agree on a strength and on its own warning sign. */
    var mixed = ORDER.filter(function (k) {
      var s = false, w = false;
      CFG.items.forEach(function (it, i) { if (it[1] === k && answers[i] === 4) { if (it[2]) w = true; else s = true; } });
      return s && w;
    });
    var paused = ORDER.filter(function (k) { return hes[k] > 0; })
      .sort(function (a, b) { return hes[b] - hes[a] || oi(a) - oi(b); }).slice(0, 2);

    var candor = null, cBand = null;
    if (CFG.candor) {
      candor = CFG.candor.fields.reduce(function (a, f) { var i = idxOf(f); return a + score(i, answers[i]); }, 0);
      for (var c = 0; c < CFG.candor.bands.length; c++) if (candor >= CFG.candor.bands[c].min) { cBand = CFG.candor.bands[c].key; break; }
    }
    var B = CFG.blocks;
    var qsScreen = [B[start].q[0]];
    var qsFull = B[start].q.slice();
    if (paused[0] && paused[0] !== start) qsFull.push(B[paused[0]].q[0]);

    return { med: med, limit: limit, tot: tot, hes: hes, bands: bands, sum: sum, P: P,
      weakest: weakest, start: start, startBlock: startBlock, override: !!(ov && start === ov.group && bands[ov.group] === ov.band), upstream: upstream, upstreamId: upstreamId, strong: strong,
      mixed: mixed, slow: slow, paused: paused, candor: candor, cBand: cBand,
      qsScreen: qsScreen, qsFull: qsFull };
  }

  /* ---------- markup ---------- */
  function gaugeSvg() {
    /* VISUALS round 1 progress gauge: the diagnostic's arc, one segment per statement. */
    var cx = 120, cy = 112, r = 92, gap = 1.6, a0 = 180, span = 180, seg = span / N, out = "";
    for (var i = 0; i < N; i++) {
      var s = (a0 + i * seg + gap / 2) * Math.PI / 180, e = (a0 + (i + 1) * seg - gap / 2) * Math.PI / 180;
      out += '<path data-seg="' + i + '" d="M' + (cx + r * Math.cos(s)).toFixed(1) + " " + (cy + r * Math.sin(s)).toFixed(1) +
        "A" + r + " " + r + " 0 0 1 " + (cx + r * Math.cos(e)).toFixed(1) + " " + (cy + r * Math.sin(e)).toFixed(1) + '"/>';
    }
    return '<svg class="fc-arc" viewBox="0 0 240 124" aria-hidden="true">' + out +
      '<text x="120" y="96" class="fc-arc-n" id="fc-arc-n">1</text><text x="120" y="116" class="fc-arc-of">of ' + N + "</text></svg>";
  }

  function build() {
    var S = CFG.start;
    root.innerHTML =
      '<section class="fc-screen" id="fc-start">' +
        '<div class="fc-hero">' +
          '<img class="fc-icon" src="' + root.getAttribute("data-icon") + '" alt="" width="72" height="72">' +
          '<p class="eyebrow">' + esc(S.eyebrow) + "</p>" +
          "<h1>" + esc(S.title) + "</h1>" +
          '<p class="fc-lede">' + esc(S.lede) + "</p>" +
        "</div>" +
        '<ol class="fc-rules">' + S.rules.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("") + "</ol>" +
        '<div class="fc-counts">' + S.counts.map(function (c) { return "<div><b>" + esc(c[0]) + "</b><span>" + esc(c[1]) + "</span></div>"; }).join("") + "</div>" +
        '<p class="fc-privacy">' + esc(CFG.privacy) + "</p>" +
        '<div class="fc-row"><button class="btn btn-lg" type="button" id="fc-go">' + esc(S.button) + "</button>" +
        '<button class="fc-link" type="button" id="fc-sample">' + esc(S.example) + "</button></div>" +
      "</section>" +

      '<section class="fc-screen" id="fc-q" hidden>' +
        '<div class="fc-top"><div class="fc-gauge">' + gaugeSvg() + '</div><div class="fc-clockbox"><span class="fc-k">Clock</span><span id="fc-clock">5:00</span></div></div>' +
        '<div class="fc-card" id="fc-card" aria-live="polite">' +
          '<div class="fc-cardtop"><span class="eyebrow">First reaction</span><span class="fc-count" id="fc-count" aria-hidden="true"></span></div>' +
          '<p class="fc-stmt" id="fc-stmt"></p>' +
          '<div class="fc-nudge" id="fc-nudge"><i></i></div>' +
          '<div class="fc-answers" id="fc-answers" role="group" aria-label="Your answer">' +
            LABELS.map(function (l, v) { return '<button type="button" data-v="' + v + '"><span>' + l + "</span><kbd>" + (v + 1) + "</kbd></button>"; }).join("") +
          "</div>" +
        "</div>" +
        '<div class="fc-inter" id="fc-inter" hidden aria-live="polite">' +
          '<p class="eyebrow" id="fc-i-eyebrow"></p><h2 id="fc-i-head"></h2><p id="fc-i-body"></p>' +
          '<div class="fc-autobar" id="fc-autobar" hidden><i></i></div>' +
          '<div class="fc-row"><button class="btn" id="fc-i-go" type="button">Keep going</button><span class="fc-note">The clock is paused.</span></div>' +
        "</div>" +
        '<div class="fc-row fc-foot" id="fc-qfoot"><button class="fc-link" id="fc-back" type="button">Back one</button><span class="fc-note fc-keys">Keyboard: 1 to 5</span></div>' +
      "</section>" +

      '<section class="fc-screen" id="fc-r" hidden></section>';

    $("fc-go").onclick = begin;
    $("fc-sample").onclick = function () {
      var t = CFG.example.timings;
      ans = CFG.example.answers.slice(); ms = t.slice();
      finish(t.reduce(function (a, b) { return a + b; }, 0) + N * 150, true);
    };
    $("fc-answers").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) pick(+b.dataset.v); });
    $("fc-i-go").onclick = leaveInter;
    $("fc-back").onclick = function () { if (cur > 0 && !inInter) { cur--; ask(); } };
    document.addEventListener("keydown", function (e) {
      if ($("fc-q").hidden || e.metaKey || e.ctrlKey || e.altKey) return;
      if (inInter && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); return leaveInter(); }
      var n = +e.key; if (n >= 1 && n <= 5) pick(n - 1);
    });
  }

  function show(id) { ["fc-start", "fc-q", "fc-r"].forEach(function (s) { $(s).hidden = s !== id; }); var nav = document.querySelector(".nav"), h = nav && getComputedStyle(nav).position !== "static" ? nav.offsetHeight : 0;
    window.scrollTo(0, Math.max(0, root.getBoundingClientRect().top + window.scrollY - h - 12)); }
  function elapsed() { var now = performance.now(); return now - startAt - pausedMs - (inInter ? now - pauseAt : 0); }

  /* ---------- the run ---------- */
  function begin() {
    ans = []; ms = []; cur = 0; pausedMs = 0; inInter = false; seen = {}; REC = null;
    startAt = performance.now(); show("fc-q"); ask(); frame();
    clearInterval(tick); tick = setInterval(frame, 200);
  }
  function setGauge(done, now) {
    Array.prototype.forEach.call(root.querySelectorAll(".fc-arc [data-seg]"), function (p, i) {
      p.setAttribute("class", i < done ? "done" : i === now ? "now" : "");
    });
    $("fc-arc-n").textContent = Math.min(N, now + 1 || done);
  }
  function ask() {
    inInter = false; $("fc-inter").hidden = true; $("fc-card").hidden = false; $("fc-qfoot").hidden = false;
    $("fc-stmt").textContent = CFG.items[cur][3];
    setGauge(cur, cur);
    Array.prototype.forEach.call(root.querySelectorAll("#fc-answers button"), function (b) { b.classList.toggle("picked", +b.dataset.v === ans[cur]); });
    $("fc-back").hidden = cur === 0;
    var n = $("fc-nudge"); n.classList.remove("run"); void n.offsetWidth; n.style.setProperty("--nudge", CFG.nudgeMs + "ms"); n.classList.add("run");
    var c = $("fc-card"); c.classList.remove("flash"); void c.offsetWidth; c.classList.add("flash");
    shownAt = performance.now(); locked = false;
  }
  function interstitial(at) {
    var m = CFG.inter[at]; inInter = true; pauseAt = performance.now();
    $("fc-card").hidden = true; $("fc-qfoot").hidden = true; $("fc-inter").hidden = false;
    $("fc-i-eyebrow").textContent = m.eyebrow; $("fc-i-head").textContent = m.head; $("fc-i-body").textContent = m.body;
    setGauge(cur, -1); $("fc-arc-n").textContent = cur;
    $("fc-autobar").hidden = !m.auto;
    clearTimeout(autoT);
    if (m.auto) { var a = $("fc-autobar"); a.innerHTML = "<i></i>"; a.style.setProperty("--auto", m.auto + "ms"); autoT = setTimeout(leaveInter, m.auto); }
    $("fc-i-go").focus({ preventScroll: true });
  }
  function leaveInter() { if (!inInter) return; clearTimeout(autoT); pausedMs += performance.now() - pauseAt; inInter = false; ask(); }
  function frame() {
    var left = CFG.limitMs - elapsed(), ck = $("fc-clock");
    ck.textContent = left > 0 ? fmt(left) : "Over time";
    ck.classList.toggle("low", left < 60000); ck.classList.toggle("paused", inInter);
    if (inInter) return;
    var per = Math.ceil((CFG.nudgeMs - (performance.now() - shownAt)) / 1000), el = $("fc-count");
    if (per > 0) { el.textContent = per; el.classList.remove("over"); } else { el.textContent = "Over"; el.classList.add("over"); }
  }
  function pick(v) {
    if (locked || inInter || cur >= N) return; locked = true;
    ans[cur] = v; ms[cur] = (ms[cur] || 0) + (performance.now() - shownAt);
    Array.prototype.forEach.call(root.querySelectorAll("#fc-answers button"), function (b) { b.classList.toggle("picked", +b.dataset.v === v); });
    setTimeout(function () {
      cur++;
      if (cur >= N) return finish(elapsed(), false);
      if (CFG.inter[cur] && !seen[cur]) { seen[cur] = true; interstitial(cur); } else ask();
    }, 150);
  }

  /* ---------- the readout (layer 1) ---------- */
  function finish(el, example) {
    clearInterval(tick);
    var r = R = compute(ans, ms), B = CFG.blocks, pat = CFG.patterns[r.P];
    var w = r.start, s = r.strong, tone = { fire: "clean", rough: "rough", miss: "miss" };

    var engine = ORDER.map(function (k) {
      var sc = r.tot[k], b = r.bands[k], pct = (sc - CFG.groupMin) / (CFG.groupMax - CFG.groupMin) * 100;
      return '<li class="fc-cyl ' + tone[b] + '"><span class="fc-light" aria-hidden="true"></span>' +
        '<span class="fc-bar" role="img" aria-label="' + esc(NAME[k] + " " + sc + " of " + CFG.groupMax + ", " + bandLabel(b)) + '"><i style="height:' + pct.toFixed(1) + '%"></i></span>' +
        "<b>" + sc + "</b><small>" + esc(NAME[k]) + "</small><em>" + esc(bandLabel(b)) + "</em></li>";
    }).join("");

    var candorHtml = "";
    if (CFG.candor) {
      var ct = { open: "clean", guarded: "rough", quiet: "miss" }[r.cBand];
      candorHtml = '<div class="fc-candor ' + ct + '"><div class="fc-candor-top"><b>Candor reading</b><span>' + esc(r.cBand) + " · " + r.candor + " of " + CFG.candor.max + "</span></div>" +
        '<div class="fc-meter" role="img" aria-label="Candor ' + r.candor + " of " + CFG.candor.max + ", " + r.cBand + '"><i style="width:' + ((r.candor - CFG.candor.min) / (CFG.candor.max - CFG.candor.min) * 100).toFixed(1) + '%"></i></div>' +
        "<p>" + esc(CFG.candor.read[r.cBand]) + "</p></div>";
    }

    var steps = B[w].step[r.bands[w]];
    var lean = "";
    if (r.bands[s] !== "miss") {
      lean = '<div class="fc-lean"><p class="eyebrow">Lean on this</p><p><strong>' + esc(NAME[s]) + " is your strongest " + esc(CFG.unit) + " at " + r.tot[s] + " of " + CFG.groupMax + ".</strong> " + esc(B[s].lean) + "</p>" +
        (r.tot[w] === r.tot[s] || !CFG.pairs[w + "." + s] ? "" : "<p>" + esc(CFG.pairs[w + "." + s]) + "</p>") + "</div>";
    }
    var flags = [];
    if (r.slow.length) flags.push('<div class="fc-flag"><strong>You hesitated on ' + (r.slow.length === 1 ? "one statement" : r.slow.length + " statements") + ".</strong>" +
      r.paused.map(function (k) { return "<span>" + esc(B[k].pause) + "</span>"; }).join("") + "</div>");
    if (r.mixed.length) flags.push('<div class="fc-flag"><strong>' + esc(CFG.mixed.head.replace("{cylinder}", r.mixed.map(function (k) { return NAME[k]; }).join(" and "))) + "</strong><span>" + esc(CFG.mixed.line) + "</span></div>");

    var R0 = CFG.report;
    var opt = function (o) { return '<option value="">Choose one</option>' + o.options.map(function (x) { return "<option>" + esc(x) + "</option>"; }).join(""); };

    $("fc-r").innerHTML =
      (example ? '<p class="fc-tag">Example readout</p>' : "") +
      '<div class="fc-readhead">' +
        '<p class="eyebrow">' + esc(CFG.readoutEyebrow) + "</p>" +
        "<h2>" + esc(pat.head) + "</h2><p class=\"fc-patline\">" + esc(pat.line) + "</p>" +
        '<div class="fc-stats"><div><b>' + r.sum + "</b><span>of " + (CFG.groupMax * ORDER.length) + " " + esc(CFG.totalLabel) + '</span></div><div><b>' + fmt(el) + "</b><span>" +
          (el <= CFG.limitMs ? "to finish, inside the five minutes" : "to finish, past the five minutes") + "</span></div></div>" +
      "</div>" +
      '<div class="fc-panel fc-enginepanel"><ul class="fc-engine">' + engine + "</ul>" +
        '<p class="fc-legend"><span class="miss">Misfiring 6 to 15</span><span class="rough">Running rough 16 to 23</span><span class="clean">Running clean 24 to 33</span></p>' +
        candorHtml +
        '<p class="fc-book">In the book: CLUTCH, ' + esc(CFG.book.whole) + "</p></div>" +

      '<div class="fc-focus"><p class="eyebrow">Start here</p><h3>' + esc(NAME[w]) + ", " + r.tot[w] + " of " + CFG.groupMax + "</h3>" +
        "<p><strong>" + esc(bandLabel(r.bands[w])) + ".</strong> " + esc(B[w].read[r.bands[w]]) + "</p>" +
        '<p class="fc-book">In the book: CLUTCH, ' + esc(CFG.book[w]) + "</p>" +
        '<p class="fc-startq">' + esc(r.startBlock) + "</p>" +
        (r.upstream ? '<p class="fc-upstream">' + esc(r.upstream) + "</p>" : "") +
        "<p><strong>Next steps this week</strong></p><ol>" + steps.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ol></div>" +
      lean +
      (flags.length ? '<div class="fc-flags">' + flags.join("") + "</div>" : "") +
      '<div class="fc-panel"><h3>A question to sit with</h3><ul class="fc-qs">' + r.qsScreen.map(function (q) { return "<li>" + esc(q) + "</li>"; }).join("") + "</ul></div>" +
      '<div class="fc-cta"><h3>' + esc(CFG.cta.head) + "</h3><p>" + esc(CFG.cta.line) + '</p><a class="btn" href="' + esc(CAL + "?utm_content=" + CFG.id + "-check-readout") + '">Book a time with Matt</a></div>' +

      '<div class="fc-panel" id="fc-reqpanel"><h3>Send me the full report</h3>' +
        '<p class="fc-note">All six cylinder reads, the statements you hesitated on and three more questions.</p>' +
        '<form class="fc-req" id="fc-req" novalidate>' +
          '<div class="fc-field"><label for="fc-name">First name</label><input id="fc-name" autocomplete="given-name" required></div>' +
          '<div class="fc-field"><label for="fc-email">Email</label><input id="fc-email" type="email" autocomplete="email" required></div>' +
          '<div class="fc-field"><label for="fc-org">Organization (optional)</label><input id="fc-org" autocomplete="organization"></div>' +
          '<div class="fc-field"><label for="fc-orgtype">' + esc(R0.org.label) + '</label><select id="fc-orgtype">' + opt(R0.org) + "</select></div>" +
          '<div class="fc-field"><label for="fc-seat">' + esc(R0.seat.label) + '</label><select id="fc-seat">' + opt(R0.seat) + "</select></div>" +
          '<p class="fc-err" id="fc-err" hidden>Add your first name and a full email address, like name@company.com.</p>' +
          '<div class="fc-row"><button class="btn" type="submit">Send the full report</button></div>' +
        "</form>" +
        '<p class="fc-done" id="fc-done" hidden role="status">' + esc(R0.confirm) + "</p>" +
      "</div>" +
      '<div class="fc-row"><button class="btn btn-ghost" type="button" id="fc-again">Take it again</button></div>' +
      '<details class="fc-how"><summary>How the score works</summary><p>Each answer is worth a prime: 2, 3, 5, 7, 11 from strongly disagree to strongly agree, so conviction counts for more than mild agreement. One statement per cylinder is a warning sign and scores in reverse. Each cylinder scores 6 to 33, and because the steps are primes, only 22 of those scores can happen. Neutral all the way through leaves a cylinder at 15, still misfiring, because a cylinder only runs clean on conviction. Three statements also make up your candor reading. A hesitation is any answer that took more than 1.75 times your own typical answer time, and at least four seconds, so a careful reader is never marked down for reading speed.</p></details>';

    $("fc-again").onclick = function () { show("fc-start"); };
    $("fc-req").addEventListener("submit", requestReport);

    REC = record(r, el, example);
    if (!example) post(REC);
    show("fc-r");
  }

  /* ---------- records (layer 3), in DALE's field names ---------- */
  function two(n) { return String(n).padStart(2, "0"); }
  function record(r, el, example) {
    var pairSkipped = r.tot[r.start] === r.tot[r.strong];
    var rec = {
      event: "complete", recordId: rid(/[?&]test=1\b/.test(location.search) ? "TEST-fc_" : "fc_"), flightId: flight().id, check: CFG.id,
      copyVersion: CFG.copyVersion, source: "flight-check", completedAt: new Date().toISOString(),
      answers: CFG.items.map(function (it, i) { return two(i + 1) + ":" + score(i, ans[i]); }).join(" "),
      timings: CFG.items.map(function (it, i) { return two(i + 1) + ":" + Math.round(ms[i]); }).join(" "),
      medianMs: Math.round(r.med), hesitationLimitMs: Math.round(r.limit),
      groupScores: ORDER.map(function (k) { return NAME[k] + " " + r.tot[k]; }).join(" \u00b7 "),
      groupBands: ORDER.map(function (k) { return bandLabel(r.bands[k]); }).join(" \u00b7 "),
      total: r.sum,
      scaled: Math.round((r.sum - CFG.groupMin * ORDER.length) / ((CFG.groupMax - CFG.groupMin) * ORDER.length) * 100),
      pattern: CFG.patterns[r.P].slug, weakest: NAME[r.start], strongest: pairSkipped ? "" : NAME[r.strong],
      hesitated: r.slow.map(function (o) { return "\u201c" + CFG.items[o.i][3] + "\u201d " + (o.t / 1000).toFixed(1) + "s"; }).join("\n"),
      hesitationCount: r.slow.length,
      mixed: r.mixed.map(function (k) { return NAME[k]; }).join(", "),
      timeToFinishS: Math.round(el / 1000), underLimit: el <= CFG.limitMs ? 1 : 0,
      kitTags: CFG.kitTags(r).join(", ")
    };
    if (CFG.startOverride) { rec.ethicsOverride = r.override ? 1 : 0; rec.upstream = r.upstreamId || "None"; }
    if (CFG.candor) { rec.candorScore = r.candor; rec.candor = r.cBand.charAt(0).toUpperCase() + r.cBand.slice(1); }
    rec.checksInFlight = example ? 0 : flightDone(CFG.id);
    rec.example = !!example;
    return rec;
  }

  /* Layer 2 as plain text, built only from library blocks (addendum, 15 Oct). */
  function reportText(r) {
    var B = CFG.blocks, w = r.start, pat = CFG.patterns[r.P];
    var cyl = function (k) { return NAME[k] + ": " + bandLabel(r.bands[k]) + ". " + B[k].read[r.bands[k]]; };
    var lines = [cyl(w), r.startBlock]; if (r.upstream) lines.push(r.upstream);
    return {
      rpt_pattern: pat.head + " " + pat.line,
      rpt_start: lines.join("\n"),
      rpt_cylinders: ORDER.map(cyl).join("\n"),
      rpt_steps: B[w].step[r.bands[w]].map(function (x, i) { return (i + 1) + ". " + x; }).join("\n"),
      rpt_questions: r.qsFull.join("\n"),
      rpt_candor: CFG.candor ? CFG.candor.read[r.cBand] : ""
    };
  }

  function requestReport(e) {
    e.preventDefault();
    var n = $("fc-name").value.trim(), em = $("fc-email").value.trim();
    if (!n || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { $("fc-err").hidden = false; return; }
    $("fc-err").hidden = true;
    var rec = {
      event: "contact", recordId: REC.recordId, flightId: REC.flightId, check: CFG.id,
      reportRequested: 1, requestedAt: new Date().toISOString(),
      firstName: n, email: em, organization: $("fc-org").value.trim(),
      orgType: $("fc-orgtype").value, seat: $("fc-seat").value,
      kitTags: REC.kitTags, example: REC.example
    }, k;
    var t = reportText(R); for (k in t) rec[k] = t[k];
    if (!REC.example) post(rec);
    $("fc-req").hidden = true; $("fc-done").hidden = false;
    requestAnimationFrame(function () {
      var nav = document.querySelector(".nav"), h = nav && getComputedStyle(nav).position !== "static" ? nav.offsetHeight : 0;
      window.scrollTo(0, Math.max(0, $("fc-reqpanel").getBoundingClientRect().top + window.scrollY - h - 16));
    });
  }

  function post(rec) {
    window.FC_POSTS.push(rec);
    if (!FORM.formId) { if (window.console) console.info("[flight-check] capture form off; record kept in FC_POSTS", rec.event); return; }
    var body = new URLSearchParams();
    body.append("formID", FORM.formId);
    body.append("simple_spc", FORM.formId + "-" + FORM.formId);   /* Jotform's own anti-spam pair */
    body.append("website", "");                                       /* its honeypot, left empty */
    for (var k in FORM.fields) if (rec[k] !== undefined && rec[k] !== null && rec[k] !== "") body.append(FORM.fields[k], String(rec[k]));
    try {
      fetch(FORM.endpoint || "https://submit.jotform.com/submit/" + FORM.formId + "/", { method: "POST", mode: "no-cors", body: body, keepalive: true })
        .catch(function () {});
    } catch (err) {}
  }

  window.FC_TEST = { compute: compute, config: CFG };
  build();
})();
