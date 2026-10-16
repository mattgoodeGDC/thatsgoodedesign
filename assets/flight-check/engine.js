/* Engine check (CREATE), check 1 of 4 in the CLUTCH flight check.
 *
 * Configuration only. Every string below is copied word for word from
 * "CLUTCH - Engine check - Block library v0.2" (approved 14 Oct 2026, citation
 * fixes 15 Oct, Changes and Approved additions 16 Oct). Do not edit copy
 * here; change the library first, then copy.
 * The runner in flight-check.js reads this object. Gear, compass and handoff
 * become gear.js, compass.js and handoff.js with the same shape.
 */
window.FLIGHT_CHECKS = window.FLIGHT_CHECKS || {};
window.FLIGHT_CHECKS.engine = {
  id: "engine",
  copyVersion: "engine v0.2 (16 Oct)",   /* block library version this config copies */
  limitMs: 300000,          /* five-minute clock */
  nudgeMs: 8000,            /* the count on each statement; a nudge only */
  order: ["C", "R", "E", "A", "T", "X"],
  names: { C: "Culture", R: "Relationships", E: "Execution", A: "Agility", T: "Teaching", X: "Ethics" },
  /* Book sections, shown as text only (paperback, no links). */
  book: { C: "3.3", R: "3.4", E: "3.5", A: "3.6", T: "3.7", X: "3.8", whole: "3.9" },

  /* Bands, from the library's Band names table. */
  bands: [
    { key: "fire",  label: "Running clean", min: 24 },
    { key: "rough", label: "Running rough", min: 16 },
    { key: "miss",  label: "Misfiring",     min: 0 }
  ],
  groupMin: 6, groupMax: 33,

  /* Statements: [Block ID, group, warning?, text], in statement.order
     (Approved additions, 16 Oct): one fixed order, the same for everyone.
     Records are keyed by Block ID, never by position. */
  items: [
    ["A03", "E", 0, "Work gets done without me chasing it."],
    ["A08", "R", 0, "People disagree with me in the room."],
    ["A13", "C", 0, "Under pressure, we keep our norms."],
    ["A16", "A", 1, "“That’s not how we do it” ends the debate."],
    ["A05", "T", 0, "Someone else could run my meeting tomorrow."],
    ["A12", "X", 0, "Our values settle the close calls."],
    ["A02", "R", 0, "Everyone knows who owns what."],
    ["A09", "E", 1, "Our deadlines run on heroics."],
    ["A01", "C", 0, "My team could say what we stand for."],
    ["A10", "A", 0, "Someone flags a failing plan before the deadline."],
    ["A18", "X", 1, "Some rules don't apply at the top."],
    ["A17", "T", 0, "I explain why I decided, not just what."],
    ["A04", "A", 0, "We change course before a crisis makes us."],
    ["A07", "C", 1, "Our values are posted, not practiced."],
    ["A06", "X", 0, "People raise concerns without fear."],
    ["A11", "T", 1, "Some work stops when one person is out."],
    ["A15", "E", 0, "Our check-ins run when I'm away."],
    ["A14", "R", 1, "Handoffs get dropped between people."]
  ],

  /* Patterns, by count of misfiring and running-clean groups (R4). */
  pattern: function (nMiss, nFire, nGroups) {
    if (nFire === nGroups) return 1;
    if (nMiss === 0) return 2;
    if (nMiss <= 2) return 3;
    if (nMiss === 3) return 4;
    return 5;
  },
  patterns: {
    1: { slug: "strong",        head: "A strong engine.",                 line: "All six cylinders are running clean. The work now is keeping the engine tuned as you grow." },
    2: { slug: "sound",         head: "A sound engine with room to tune.", line: "No cylinder is misfiring. The gains are in the ones running rough." },
    3: { slug: "partly-on-you", head: "The engine runs, partly on you.",   line: "One or two cylinders are carrying less than their share, and you are making up the difference." },
    4: { slug: "on-you",        head: "The engine is running on you.",     line: "Half the engine is misfiring. You are supplying power the system should." },
    5: { slug: "rebuild",       head: "Rebuild, don't push harder.",       line: "Most of the engine is misfiring. That is a design problem, not an effort problem, and design can change." }
  },

  /* Start here (R2 with overrides): lowest score, block start.q under it;
     Ethics misfiring always starts, with block start.X. */
  startOverride: { group: "X", band: "miss", block: "Ethics comes first here. When it misfires, the other cylinders lose the trust they run on." },
  startQ: "If you could strengthen just one cylinder, which would create the most lift for the others?",
  /* R12: at most one upstream line. [start group, upstream group, text] */
  upstream: [
    ["E", "R", "Check Relationships too. An Execution problem often starts upstream, in unclear ownership and thin trust."],
    ["A", "C", "Check Culture too. A team that can't adapt is often one where early warnings don't feel safe to raise."]
  ],

  blocks: {
    C: {
      read: {
        miss: "Your culture lives in your head, not in the room. People learn the rules by guessing, and the guessing burns energy the work needs.",
        rough: "The culture holds on good days. Under pressure it bends toward what you do, not what you say.",
        fire: "People know what you stand for and keep it under pressure. Culture is the first cylinder, and the others run smoother when it fires."
      },
      step: {
        miss: [
          "Run a clarity check. Ask three people separately what our number-one team value is. Don't grade the answers. Listen for drift.",
          "Tell your next new hire the real rules in week one, out loud.",
          "Pick one norm that bent recently and name it in your next team meeting."
        ],
        rough: [
          "Ask two people which norm bends first under pressure. Compare their answers.",
          "The next time something goes wrong, lead with one question before anything else: what did we learn?"
        ],
        fire: ["Name two other people who could carry the culture conversation when you're away, and make it part of their role."]
      },
      lean: "Use it to carry change. Tie your next hard ask to something the team already believes.",
      q: [
        "When the heat is on, do your people feel safe enough to tell you to stop?",
        "Which rule does a new hire only learn the hard way?",
        "When mistakes happen, what's the reflex – silence, blame, or curiosity?"
      ],
      pause: "You paused on Culture. That can mean the culture you would describe and the one people experience have started to separate."
    },
    R: {
      read: {
        miss: "Ownership is blurry and trust is thin. Work falls between people, and you spend your time refereeing instead of leading.",
        rough: "Trust is strong with some people and thin with others. Where it is thin, every handoff needs backup.",
        fire: "People know who owns what and trust each other to hold it. Disagreement sharpens ideas instead of starting turf wars."
      },
      step: {
        miss: [
          "In your next huddle, build a simple RACI for one live project with the team. Use it to find where you collide and where the gaps are.",
          "The next time something breaks, name your own part in it first, in one sentence.",
          "Turn the RACI into a one-page map of who owns what. New people get it on day one."
        ],
        rough: [
          "Ask one person privately: what's one small behavior I could shift that would make working with me easier?",
          "Start one meeting a week with a three-minute round: one way someone here made your work easier."
        ],
        fire: ["Teach a direct report to build the same trust with their own team."]
      },
      lean: "Spend that trust when the work gets tough. It is what lets a hard conversation land instead of detonate.",
      q: [
        "If two people both thought they owned the same decision, what would happen first – collaboration, conflict, or silence?",
        "If you weren't in the room, would trust rise, fall, or stay steady?",
        "When the stakes are high, do your people trust that you'll still be you?"
      ],
      pause: "You paused on Relationships. That can mean ownership is clear in some places and blurry in others."
    },
    E: {
      read: {
        miss: "The work moves when you push it and stalls when you don't. Right now you are the engine.",
        rough: "Things get done, but too many of them route through you on the way.",
        fire: "Work moves without you chasing it, and your rhythms run on their own."
      },
      step: {
        miss: [
          "Name the three decisions you touch most. For each, name who could own it, the guardrails, and the checkpoint that replaces your sign-off. Hand one over this month.",
          "Set a weekly check-in with three questions – what's on track, what's at risk, what needs help – then skip one on purpose.",
          "Put priorities, owners, and progress in one shared tracker, so anyone can answer “where are we?” without asking you."
        ],
        rough: [
          "For one week, track which decisions come back to you. Hand off the most frequent one for good.",
          "In your next huddle, swap “what's everyone working on?” for “what's the most important outcome this week, and what does success look like?”"
        ],
        fire: ["Take a full day off this month without checking in, and see what holds."]
      },
      lean: "Use that reliability to give people room on the cylinders that need it.",
      q: [
        "Where does your team's execution depend on heroics that a better system could prevent?",
        "If you stepped away for two weeks tomorrow, what would your team carry forward – and what would stall?",
        "What did you do this week that someone else is paid to do?"
      ],
      pause: "You paused on Execution. That can mean you already know which work is waiting on you."
    },
    A: {
      read: {
        miss: "Change only happens when a crisis forces it. Until then, last year's process wins by default.",
        rough: "You adapt, but late. Plans get corrected after the deadline, not before.",
        fire: "You change course before you have to, and people flag a failing plan early."
      },
      step: {
        miss: [
          "Pick one process you run because it is familiar and ask who it still serves.",
          "Add one question to your next review: what should we stop doing?",
          "Make it a standing check-in question: what's something small that concerns you this week? Reward the surfacing, not the severity."
        ],
        rough: [
          "After your next milestone, ask two questions only: what did we learn, and what's one tweak we'll make?",
          "At your next check-in, ask: what are we seeing that the plan didn't expect?"
        ],
        fire: ["Retire one process this quarter on purpose, before it retires itself."]
      },
      lean: "Point it at your weakest cylinder. Treat the fix as an experiment, not a mandate.",
      q: [
        "What part of your current success story is becoming a liability?",
        "What would you change tomorrow if no one would be upset?",
        "What did you know was failing before anyone said it?"
      ],
      pause: "You paused on Agility. That can mean a plan you are defending is one you have started to doubt."
    },
    T: {
      read: {
        miss: "You do the hard things yourself because it's faster. It is, today. It is also why no one else can.",
        rough: "You teach when there's time, and there rarely is.",
        fire: "Others can run what you run, and they know why you decide what you decide."
      },
      step: {
        miss: [
          "In your next one-on-one, pick one problem you'd normally solve yourself, and don't. Coach the thinking instead of giving the answer.",
          "When you decide something, say why out loud, not just what.",
          "Let someone else run one of your meetings this month, and stay quiet in it."
        ],
        rough: [
          "Pick three people. For each, name one decision they bring you that they could own within 90 days, and what support gets them there.",
          "After your next decision, write two lines on why and share them."
        ],
        fire: ["Ask the people you have taught to teach the next person. That is where it multiplies."]
      },
      lean: "Teach someone to tune your weakest cylinder, so the fix doesn't run through you.",
      q: [
        "Whose development have you neglected because you've been busy doing the work yourself?",
        "What could someone on your team do if you showed them once?",
        "Who could do your job in two years, and do they know it?"
      ],
      pause: "You paused on Teaching. That can mean doing it yourself has become a habit you would rather not look at."
    },
    X: {
      read: {
        miss: "Values settle the easy calls and go quiet on the hard ones. People notice when the rules bend at the top.",
        rough: "Your values hold in most calls. The exceptions are where trust leaks.",
        fire: "People speak up even when it costs them, and the rules apply at every level."
      },
      step: {
        miss: [
          "Name one rule that bends for senior people. Decide whether to fix the rule or the bending.",
          "Ask your team which close call last quarter didn't sit right.",
          "On the next close call, make your reasoning visible, values first."
        ],
        rough: [
          "Name the last exception you made and explain it to the team.",
          "Before the next close call, say which value is deciding it."
        ],
        fire: ["Before your next significant call, write tomorrow's headline about it. If it embarrasses you, the decision isn't done yet."]
      },
      lean: "Ethics anchors trust for the long run. Name the value behind each fix, so people can see it is worth the cost.",
      q: [
        "Where do the people at the top get an exception the rest of the team would not?",
        "What would someone have to risk here to tell you no?",
        "Which value did you trade for speed last quarter?"
      ],
      pause: "You paused on Ethics. That can mean there is a call you made that still doesn't sit right."
    }
  },

  /* Pair lines, weakest first, strongest second (R6). */
  pairs: {
    "C.R": "Your relationships can rebuild the culture. Ask the people who trust you to name what the culture really is.",
    "C.E": "Your execution keeps the work moving, but without shared norms. Write the norms down the way you would write a process.",
    "C.A": "You adapt well, but agility without clarity becomes chaos. Reset the culture on purpose so each change has a shared why.",
    "C.T": "You teach well. Teach the norms, not just the tasks.",
    "C.X": "Your values are solid. The gap is turning them into everyday norms people can see.",
    "R.C": "The culture is clear, but trust is built person by person, not by norms. Start with who owns what.",
    "R.E": "Work gets delivered, but it may be held together by effort rather than trust. Make who owns what visible before the next crunch.",
    "R.A": "You change course well. Clear ownership is what keeps a pivot from turning into a turf war.",
    "R.T": "Teaching without relationships feels hollow. Build the trust first, and your teaching will land.",
    "R.X": "People trust your values. Show them it is safe to disagree with you, too.",
    "E.C": "People know what you stand for. Now let them act on it without waiting for you.",
    "E.R": "Your team trusts you, which may be why they wait for you. Use that trust to hand off decisions.",
    "E.A": "You adapt quickly, but the follow-through runs through you. Pair every change with an owner who isn't you.",
    "E.T": "You teach well. Point that teaching at the work that waits on you, so the people you've taught can own it.",
    "E.X": "Your values are clear. Let people make the calls those values already answer.",
    "A.C": "Your culture is strong. Use its safety for early warnings, so change gets named before it is urgent.",
    "A.R": "Trust is strong on your team. Use it to ask which plan they would stop.",
    "A.E": "You execute well, maybe too well on last year's plan. Build in a point to question it.",
    "A.T": "You teach well. Teach people to question the process, not just run it.",
    "A.X": "Your values are steady, and steady values let you change methods without losing your footing.",
    "T.C": "The culture is clear, but it lives in you. Teach it before it depends on you.",
    "T.R": "People trust you, so they will learn from you. Start with one thing you always do yourself.",
    "T.E": "You get things done, often by doing them. The next gain is teaching others to do them.",
    "T.A": "You adapt well. Let others learn by owning the next change.",
    "T.X": "Your values are clear. Explaining why you decide is how others learn them.",
    "X.C": "The culture is strong, which makes exceptions at the top more visible. Close the gap.",
    "X.R": "People trust you. That trust depends on the rules applying to you too.",
    "X.E": "You get results. Execution without ethics becomes exploitation, so let values, not speed, settle the close calls.",
    "X.A": "You adapt well. Check that the values don't change when the plan does.",
    "X.T": "You teach well. Teach the reasoning behind the hard calls, not just the decisions."
  },

  mixed: { head: "Mixed signals in {cylinder}.", line: "You strongly agreed with a strength and with its warning sign. That cylinder probably fires for some people and not for others." },
  /* flag.flat: all eighteen answers the same. */
  flat: "You gave the same answer to all eighteen statements. This reading may say more about today than about your team. Take it again when you can go on instinct.",
  /* pause rewrite: {n} is the count; the list of statements sits between head and line. */
  pause: { head: "{n} statements took you longer.", headOne: "1 statement took you longer.", line: "A pause can mean a hard question, a careful read, or a phone buzzing. If one of these made you stop, ask your team how they would answer it." },
  /* lean.none: shown when the strongest cylinder is misfiring. */
  leanNone: "No cylinder is carrying the others yet. Pick the one you can move this month, and let the rest wait.",

  /* readout.snapshot and readout.time */
  snapshot: "This is your snapshot: your reading, the cylinder to start with, and where you hesitated. Your full report reads all six cylinders and comes by email.",
  time: { slow: "to finish. {n} of 18 statements took you longer than your usual pace.", steady: "to finish, at a steady pace." },

  /* cta.web, under the steps, with cta.quote beside it. Only two booking
     asks on the page: this one and confirm.next. */
  cta: {
    head: "Start with {cylinder}.",
    line: "Thirty minutes with me. Bring this readout. You'll leave with one move you can make this week, and who owns it, whether or not we work together.",
    button: "Book 30 minutes with me"
  },
  /* cta.quote, chosen by the Start here cylinder (confirmed by Matt 16 Oct). */
  quotes: {
    E: ["“I thought I needed better time management. Turns out I needed to get out of my own way.”", "Founder and CEO, growing services business"],
    T: ["“Our managers are getting better at letting their teams work through problems instead of jumping in with the answer.”", "Director of Engineering, manufacturing firm"],
    C: ["“It’s refreshing when you leave a session with something you can actually use on Monday morning.”", "Division Head, independent school"],
    R: ["“It’s refreshing when you leave a session with something you can actually use on Monday morning.”", "Division Head, independent school"],
    A: ["“Our meetings are probably a little less comfortable than they used to be. They’re certainly more useful.”", "Managing Partner, professional services firm"],
    X: ["“Our meetings are probably a little less comfortable than they used to be. They’re certainly more useful.”", "Managing Partner, professional services firm"]
  },

  /* how.method: the How the score works text, also linked from the start screen. */
  howLabel: "How the score works",
  method: "The engine check is a reflection tool, not a psychometric assessment. It hasn't been validated against outcomes, and it reads the team you lead as you see it this month. Eighteen statements, three for each of the six cylinders in CLUTCH, Chapter 3. Each answer is worth a prime: 2, 3, 5, 7, 11 from strongly disagree to strongly agree, so conviction counts for more than mild agreement. One statement per cylinder is a warning sign and scores in reverse. Each cylinder scores 6 to 33. Neutral all the way through leaves a cylinder at 15, still misfiring, because a cylinder only runs clean on conviction. Three statements also make up your candor reading. A statement counts as taking you longer when it took more than 1.75 times your own typical answer time, and at least four seconds, so reading speed never counts against you. Your answers are saved anonymously, and only Matt sees them.",

  /* Candor reading (R11): statements 06, 08 and 10, 6 to 33. */
  candor: {
    fields: ["A06", "A08", "A10"],
    min: 6, max: 33,
    bands: [ { key: "open", min: 24 }, { key: "guarded", min: 16 }, { key: "quiet", min: 0 } ],
    read: {
      open: "Your candor reading is open. People tell you the truth early, even when it costs them. Protect it. Pressure takes candor first.",
      guarded: "Your candor reading is guarded. Some truth reaches you early, and some waits until it feels safe or until it is too late.",
      quiet: "Your candor reading is quiet. The hard things are probably being said, just not to you."
    }
  },

  /* Interstitials, shown before statement 7 and 13. The clock pauses. */
  inter: {
    6:  { eyebrow: "One third done.", head: "This is about the system, not you.", body: "W. Edwards Deming argued that 94% of performance problems are system problems, not people problems. It is the finding that anchors CREATE. Keep going on instinct.", auto: 0 },
    12: { eyebrow: "Two thirds done.", head: "Six to go.", body: "First reaction only.", auto: 3000 }
  },

  /* Start screen (Changes, 16 Oct). Title test: start.title.b against the
     live title, 50/50, kept per browser; the shown title is sent as variant. */
  start: {
    eyebrow: "Engine check · 1 of 4",
    titles: ["Where does your team stall?", "Gut check your engine"],
    lede: "Eighteen statements about the team you lead. Most people finish in two minutes. You'll see which cylinder is running clean, which one is running on you, and which statements took you longer to answer.",
    /* start.rule.1 to 3, shown on the first statement screen, not here. */
    rules: [
      "Go with your first reaction. It is usually the honest one.",
      "Think about this month, under pressure. Not your best week, not your worst.",
      "The count is a nudge, not a test. The check learns your own pace, so reading slowly never counts against you."
    ],
    /* start.timing (CLUTCH-84, 16 Oct): a toggle under rule 03 that opens
       this copy in place. The clock is already paused on the rules screen.
       Plain words only; the scoring itself is R7 in flight-check.js
       (over 1.75 x the person's median and at least 4 seconds). */
    timing: {
      label: "How does the timing work?",
      body: [
        "The check times every answer. At the end it works out your normal speed. A pause only counts if that answer took much longer than your normal, roughly twice as long.",
        "So it compares you to you, never to other people.",
        "If you take about 9 seconds on every answer, nothing counts unless one takes about 16. If you take about 3 seconds, a 6-second answer stands out.",
        "The count on screen is just a reminder to go with your gut. It does not change your score."
      ]
    },
    counts: [["2 minutes", "most people finish"], ["18 statements", "on instinct"], ["Free readout", "no email needed"]],
    button: "Start the engine check",
    buttonNote: "Your readout is free and on screen straight away. Email only if you want the full report.",
    example: "See an example readout"
  },
  /* A worked example for "See an example readout" (never posted). */
  example: {
    /* Same example as before, listed in statement.order. */
    answers: [1,3,3,3,1,4,4,4,3,2,0,3,2,3,3,4,1,2],
    timings: [2600,2400,3500,6800,7400,2700,1800,1500,3100,3800,4100,3100,4200,3300,2900,8200,2900,2200]
  },
  unit: "cylinder",
  totalLabel: "engine score",
  readoutEyebrow: "Your engine reading",

  privacy: "Your answers are saved anonymously. Add your email at the end only if you want the full report. If you do, any other checks you took on this device are linked to your name too.",
  privacyWho: "Only Matt sees your answers.",

  report: {
    org:  { label: "What kind of organization are you in? (optional)", options: ["Company", "School", "Nonprofit", "Government", "Other"] },
    /* Options must match the Airtable Seat select exactly (run:dale, 16 Oct). */
    seat: { label: "Which best describes your role? (optional)", options: ["Founder or CEO", "Head of School or Executive Director", "Senior executive (VP or C-suite)", "People, HR or operations lead", "Team or department lead", "Coach, consultant or adviser", "Something else"] },
    /* report.promise */
    promise: "All six cylinder reads, the statements that took you longer, and more questions to sit with.",
    /* confirm.auto, block library v0.2 (Additions, 15 Oct), word for word.
       {email} is filled with the address the person typed. */
    confirm: "Done. Your full report is on its way to {email}. It comes from Matt Goode at matt@thatsgoodedesign.com. If it isn't in your inbox in ten minutes, check promotions or spam.",
    /* confirm.next, under confirm.auto, then cta.button. */
    next: "While you wait: thirty minutes with me, starting with {cylinder}. You'll leave with one move you can make this week.",
    /* rpt.hesitated when nothing took longer; the email recognises this line. */
    steady: "You answered every statement at a steady pace."
  },
  /* example.end: replaces the report form on the example readout only. */
  exampleEnd: "This is an example. Take the check for your own readout.",

  /* Added to kitTags on the report request only (DALE's Zapier adds it anyway). */
  reportTag: "engine-check-report",
  /* kit.tag.coach: added on the report request when the seat is this one. */
  seatTags: { "Coach, consultant or adviser": "engine-check-seat-coach" },

  kitTags: function (r) {
    return ["engine-check-" + this.patterns[r.P].slug, "engine-check-weak-" + this.names[r.start].toLowerCase()];
  }
};
