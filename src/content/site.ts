/* ==================================================================
   ALL SITE CONTENT LIVES HERE.
   Replace text, links and images in this file; components read from it.
   Images live in /public/images — swap a file and keep the same name,
   or point the `src` fields below at new files.
   ================================================================== */

export const site = {
  name: "Lisa Gammeltoft",
  firstName: "Lisa",
  lastName: "Gammeltoft",
  role: "Product designer & design engineer",
  positioning:
    "Product designer in Stockholm who designs and builds websites and digital products, from user research to the live site.",
  city: "Stockholm",
  coords: { lat: "59.33° N", lng: "18.07° E" },
  // TODO: replace with your real addresses
  email: "hello@example.com",
  linkedin: "https://www.linkedin.com/in/your-handle",
  github: "https://github.com/lisagammeltoft2002-web",
  cv: "/cv.pdf",
  year: 2026,
  status: "Open to roles at UX and creative studios",
  portrait: { src: "/images/portrait.jpg", alt: "Lisa Gammeltoft by the water in Stockholm" },
};

/* The first thing a hiring lead reads: one promise, who I am, where I am now. */
export const intro =
  "I design digital products people understand, and I build them.";
export const introMore = [
  "I’m a product designer in Stockholm, working across UX, UI and front-end. Trained at Hyper Island, with a background in psychology and behaviour.",
  "Currently at Velory, where I designed the journeys through the new portal, rebuilt velory.com and created the in-house studio the whole company now makes its marketing in.",
];

export type CaseCopy = { title: string; role: string; metrics: { figure: string; label: string }[] };

/* The board's own words (the rectangles on the home page). */
export const board = {
  title: "Product designer who builds",
  hello: "Hi, I’m Lisa.",
  now: {
    role: "Product engineer at Velory.",
    open: "Open to roles at UX and creative studios.",
  },
  about: {
    hello: "A bit about me",
    facts: ["Lived in Australia", "Cheerleading world championships", "75 Hard"],
  },
  /* each case study's rectangle: its name, what I did, and the two numbers worth knowing */
  cases: {
    "velory-com": {
      title: "velory.com",
      role: "A fresher landing page, same brand.",
      metrics: [{ figure: "1 field", label: "to book a demo, was 5" }],
    },
    "velory-studio": {
      title: "Velory Studio",
      role: "One sentence in, on-brand work out.",
      metrics: [{ figure: "~90 h", label: "saved in three weeks" }],
    },
    "actionable-insights": {
      title: "Actionable Insights",
      role: "The portal finds the savings.",
      metrics: [{ figure: "9 600 kr", label: "saved a year (example)" }],
    },
  } as Record<string, CaseCopy>,
};

/* What I bring: three rows, concrete enough to check. */
export const bring = [
  {
    label: "UX & product design",
    line: "Research, user journeys, interaction and design systems in Figma. Grounded in UX principles and in how people actually behave.",
  },
  {
    label: "Front-end",
    line: "I build what I design, in Next.js, React and Webflow. I work daily with Claude Code and know how to use AI tools well, not just a lot.",
  },
  {
    label: "Brand & marketing",
    line: "Graphic design for campaigns, banners, one-pagers and website imagery. I also built the tool Velory now uses to make it all on-brand.",
  },
];

/* How I work: four beats, written across the sky while one bird flies. */
export const process = [
  { label: "Journeys" },
  { label: "People" },
  { label: "Business" },
  { label: "Build" },
];

export const journey = {
  opening: "I don’t start with a page. I start with a journey.",
  lines: [
    "How did they get here, what did they come to do, and why? Everything on the page answers one of those.",
    "I talk to users and design for how people really behave, so it feels calm and clear and never in the way.",
    "Good design has to earn its place. I always ask how it helps the business, not just how it looks.",
    "Then I build it, test it with real people and keep improving it after launch.",
  ],
};

/* The home page's chapters, by the beat (screen of scrolling) where each begins. */
export const film = {
  chapters: [
    { id: "top", label: "Introduction", from: 0 },
    { id: "work", label: "Selected work", from: 6 },
    { id: "process", label: "How I work", from: 15 },
    { id: "bring", label: "What I bring", from: 20 },
    { id: "about", label: "About", from: 21 },
    { id: "contact", label: "Contact", from: 26 },
  ],
};

/* What each project's drawing shows, in a few words under it. */
export const workNotes = {
  "velory-com": ["Problem", "Proof", "One engine", "Platform", "Try it"],
  story: "The page now tells the story the way sales does.",
  before: "Before: five fields and a captcha.",
  after: "After: an email address. That’s it.",
  portal: "Laptops, licences and phone plans, in one engine.",
  brief: "One sentence in…",
  fan: "…on-brand work out.",
  studio: [
    { value: 30, label: "pieces in three weeks" },
    { value: 5, label: "colleagues using it" },
    { value: 90, label: "hours saved", prefix: "~" },
  ],
  tickets: ["2026 · 4 months · 1 field", "2026 · every asset, one engine", "2026 · ~90 h saved in 3 weeks", "2026 · in progress"],
  cloud: "Costs scattered across systems nobody owns.",
  bars: "Sorted into what matters most.",
  line: "Then followed over time, toward the next step worth taking.",
};

/* The human part, shown at sunset next to the contact details. */
export const about = {
  hello: "Hi, I’m Lisa.",
  body: [
    "I’m happiest when I’m learning something new. In a project that means stepping in without waiting to be asked, asking the questions that matter and finding where I can help most. I’m cheerful and social, and just as happy in a team as heads-down on my own.",
    "Outside work I’m usually making something: pottery, crochet, rug tufting, painting or sewing my own clothes. I’ve lived in Australia, competed at the cheerleading world championships and taken on challenges like 75 Hard.",
  ],
  facts: [
    { label: "Based in", value: "Stockholm" },
    { label: "Studied", value: "Hyper Island, two years · Psychology and behaviour" },
    { label: "Now", value: "Product engineer at Velory" },
    { label: "Toolbox", value: "Figma, Webflow, Next.js, React, Claude Code" },
  ],
  /* the sideways walk through what I make, one line per drawing */
  walk: [
    "I throw pottery.",
    "I crochet.",
    "And I sew my own clothes.",
    "I’ve lived in Australia, competed at the cheerleading world championships and taken on challenges like 75 Hard.",
  ],
  makes: [
    { src: "/images/make-pottery.jpg", alt: "Pottery I made" },
    { src: "/images/make-crochet.jpg", alt: "Crochet I made" },
    { src: "/images/make-sewing.jpg", alt: "Clothes I sewed" },
  ],
};

export const contact = {
  title: "Let’s make something good.",
  note: `${site.status} · Stockholm & remote`,
};

/* ------------------------------------------------------------------
   CASE STUDIES
------------------------------------------------------------------- */

export type CaseStudy = {
  slug: string;
  title: string;
  /** shown in the little browser bar above the preview */
  url: string;
  /** a real screenshot (landscape, ~1600 × 1000). Until then a drawn preview is shown. */
  shot?: string;
  kind: string;
  year: string;
  tilt: number;
  image: { src: string; alt: string };
  /** one short sentence, shown inside the torn-paper card on the home page */
  short: string;
  outcome: string;
  meta: { label: string; value: string }[];
  problem: string[];
  role: string[];
  insight: { quote: string; note: string };
  journey: { label: string; note: string }[];
  decisions: { title: string; body: string }[];
  solution: { src: string; alt: string; caption: string }[];
  results: { value: string; label: string }[];
  reflection: string[];
};

/* Each case study, shortened to what a hiring lead reads: the problem,
   what I did, the numbers and what I learned. Add a real screenshot with
   `shot: "/images/work/velory-com.jpg"` and it replaces the drawn preview. */
export const caseStudies: CaseStudy[] = [
  {
    slug: "velory-com",
    short: "A new website that sells the way sales does.",
    url: "velory.com",
    title: "velory.com",
    kind: "Website · UX, design and build",
    year: "2026",
    tilt: -5,
    image: {
      src: "/images/work-layer-up.jpg",
      alt: "Layer Up poster: a fleece jacket on a blue panel over snowy mountains",
    },
    outcome:
      "A new website built around how Velory actually sells: problem first, proof early, and a demo that asks for one field. Research to launch in four months.",
    meta: [
      {
        label: "Role",
        value: "Research, information architecture, design, motion and build",
      },
      { label: "Team", value: "Just me, with input from sales" },
      { label: "Timeline", value: "About four months" },
      {
        label: "Tools",
        value: "Figma, Webflow, coded components, Claude Code, HubSpot",
      },
    ],
    problem: [
      "Velory had launched a new product, but the website still sold the old one. The headline, “IT Lifecycle on Autopilot”, could describe almost any software, the page read like a feature list, and the demo form asked for five things before anyone could talk to us.",
      "The brief: make velory.com feel as new as the product and speak to the people who buy it, IT admins. The constraint: no rebrand. Same logo, same colours, same type.",
    ],
    role: [],
    insight: {
      quote:
        "Good sales calls don’t start with features. They start with pain.",
      note: "What I learned from sitting with our sales team",
    },
    journey: [],
    decisions: [
      {
        title: "Built the story sales already tells",
        body: "I mapped how our best sellers run a call and turned it into the page: the problems IT admins recognise, then proof from peers, then the platform, then a way to try it.",
      },
      {
        title: "Problems first",
        body: "A new section opens with situations admins know from last Tuesday, like “someone left, licences stayed”. Each one links straight to the page that solves it.",
      },
      {
        title: "Modern without a rebrand",
        body: "I turned the brand into a real design system in Webflow: colour, type, spacing and radius tokens, a louder heading scale and one accent colour reserved for actions.",
      },
      {
        title: "One field to start",
        body: "The demo form went from five required fields and a captcha to an email address, wired into HubSpot so sales workflows still run.",
      },
      {
        title: "Motion that explains",
        body: "A lifecycle that animates as you scroll, a pinned feature scroll and small rewards on the call to action. Every animation has to explain something and respects reduced motion.",
      },
    ],
    solution: [],
    results: [
      { value: "4 mo", label: "research to live site" },
      { value: "26", label: "coded components" },
      { value: "176", label: "pull requests merged" },
      { value: "1", label: "field in the demo form" },
    ],
    reflection: [
      "Sales already knows the story; put it on the page. And you can make a brand feel new without rebranding it, through discipline in type, colour, spacing and motion.",
      "Building with AI removed the gap between an idea and a live site. The research, story, taste and decisions were mine; what changed is that one person can take all of it the whole way.",
    ],
  },
  {
    slug: "velory-portal",
    short: "Every laptop, licence and phone plan in one place.",
    url: "app.velory.com",
    title: "Velory portal",
    kind: "Product · UX and UI",
    year: "2026",
    tilt: 4,
    image: { src: "/images/gallery-valley.jpg", alt: "The new Velory portal" },
    outcome:
      "The UX and UI for Velory’s new portal, where companies run every laptop, licence and phone plan from one place. I designed the journeys while the developers built it.",
    meta: [
      { label: "Role", value: "UX, UI and user journeys" },
      { label: "Team", value: "Me, with Velory’s developers" },
      { label: "Timeline", value: "Lorem ipsum" },
      { label: "Tools", value: "Figma, Next.js" },
    ],
    problem: [
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum id ligula porta felis euismod semper. Cras mattis consectetur purus sit amet fermentum.",
    ],
    role: [],
    insight: {
      quote: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      note: "lorem ipsum",
    },
    journey: [],
    decisions: [
      {
        title: "Lorem ipsum",
        body: "Maecenas faucibus mollis interdum. Nullam quis risus eget urna mollis ornare vel eu leo.",
      },
    ],
    solution: [],
    results: [
      { value: "00%", label: "lorem ipsum" },
      { value: "0×", label: "dolor sit" },
    ],
    reflection: ["Lorem ipsum dolor sit amet, consectetur adipiscing elit."],
  },
  {
    slug: "velory-studio",
    short: "On-brand marketing in minutes, for everyone at Velory.",
    url: "Velory Studio",
    title: "Velory Studio",
    kind: "Internal tool · product design and build",
    year: "2026",
    tilt: 4,
    image: {
      src: "/images/work-unknown.jpg",
      alt: "Uncover the Unknown: snowy peaks under a thin grid with coordinates",
    },
    outcome:
      "It started as a faster way to make banners. Now anyone at Velory creates on-brand decks, films and website images in minutes.",
    meta: [
      {
        label: "Role",
        value: "Idea, product design and build, on my own initiative",
      },
      { label: "Team", value: "Just me, with Claude Code" },
      { label: "Timeline", value: "Weeks, 250+ released versions" },
      { label: "Tools", value: "Claude, Google Slides, Webflow, Linear" },
    ],
    problem: [
      "Every banner, deck and product film went through the same narrow channel: a brief, a wait for a designer or an agency, then rounds of feedback. A ten-minute banner took a day. A product film took weeks and a budget.",
      "The quiet cost was worse: people made things themselves, and the brand slowly drifted. Everything about how Velory should look lived in a few people’s heads.",
    ],
    role: [],
    insight: {
      quote: "The value isn’t the AI. It’s the Velory knowledge built into it.",
      note: "Templates, brand rules, portal views and security rules, all inside the tool",
    },
    journey: [],
    decisions: [
      {
        title: "Start small, follow demand",
        body: "One banner tool first. Every new format, from decks to website films, exists because a colleague asked for it.",
      },
      {
        title: "The rules are built in",
        body: "Colours from the portal, logo placement, film rules and licensed demo faces. A sales rep on a Friday afternoon gets the same brand quality as the marketing team.",
      },
      {
        title: "Safe by design",
        body: "Every input and output is classified as public, internal or confidential. Confidential material simply can’t be published.",
      },
      {
        title: "Calm interface",
        body: "Chat on the left, the piece on the right, and you start from what you want to make, not from a blank page.",
      },
    ],
    solution: [],
    results: [
      { value: "30", label: "finished pieces in 3 weeks" },
      { value: "5", label: "colleagues using it" },
      { value: "1 min", label: "for a banner" },
      { value: "~90 h", label: "saved in 3 weeks" },
    ],
    reflection: [
      "Solve one narrow problem really well, then grow only where people pull. And a company tool can’t depend on one person’s laptop, so the last phase moved everything into the browser.",
    ],
  },
  {
    slug: "actionable-insights",
    short: "The portal finds the savings and tells admins what to do.",
    url: "app.velory.com/insights",
    title: "Actionable Insights",
    kind: "Velory portal · user journeys, UX and UI",
    year: "2026",
    tilt: -3,
    image: {
      src: "/images/work-mirror-field.jpg",
      alt: "A mirrored glass block standing in a golden field below the hills",
    },
    outcome:
      "In the Velory portal, admins no longer have to work out where money leaks. The portal spots it, like licences nobody uses, and suggests the next step. One click asks the people holding them in Slack or Teams, and every “not using it” becomes a cancelled licence and money saved.",
    meta: [
      { label: "Role", value: "The admin's journey: from insight to task to saving" },
      { label: "Team", value: "Lorem ipsum" },
      { label: "Timeline", value: "Lorem ipsum" },
      { label: "Tools", value: "Figma" },
    ],
    problem: [
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum id ligula porta felis euismod semper. Cras mattis consectetur purus sit amet fermentum.",
    ],
    role: [],
    insight: {
      quote: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      note: "lorem ipsum",
    },
    journey: [],
    decisions: [
      {
        title: "Lorem ipsum",
        body: "Maecenas faucibus mollis interdum. Nullam quis risus eget urna mollis ornare vel eu leo.",
      },
    ],
    solution: [],
    results: [
      { value: "00%", label: "lorem ipsum" },
      { value: "0×", label: "dolor sit" },
    ],
    reflection: ["Lorem ipsum dolor sit amet, consectetur adipiscing elit."],
  },
];

export const pad = (n: number) => String(n).padStart(2, "0");
