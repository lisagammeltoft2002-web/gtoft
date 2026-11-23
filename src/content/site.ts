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
    facts: ["Lived in Australia", "Cheer worlds", "75 Hard"],
  },
  /* each case study's rectangle: its name, what I did, and the two numbers worth knowing */
  cases: {
    "velory-com": {
      title: "velory.com",
      role: "A website for the people who now buy Velory.",
      metrics: [{ figure: "4 mo", label: "research to live site" }],
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
/* How I think: the four questions I always ask, in the order they come up, each with one
   line and a dot sculpture (a shape from journeyShapes.ts) */
export const howIThink = {
  label: "How I think",
  steps: [
    { question: "Who is it for?", line: "I talk to them before I draw.", shape: "people" },
    { question: "What are they trying to do?", line: "I map the whole journey.", shape: "map" },
    { question: "Why does it matter?", line: "Every choice ties to a goal.", shape: "coins" },
    { question: "Does it really work?", line: "I test it with real people.", shape: "magnifier" },
  ],
};

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
    { label: "Toolbox", value: "Figma, Webflow, Next.js, React, Claude Code, GitHub, Illustrator" },
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
  /** the problem section's heading, a claim (optional) */
  problemTitle?: string;
  role: string[];
  insight: { quote: string; note: string };
  /** four steps, each drawn as a dot sculpture (shape: a name from journeyShapes.ts) */
  journey: { label: string; note: string; shape: string }[];
  /** add `image: { src: "/images/work/…", alt: "…" }` to show a screenshot beside a decision */
  decisions: { title: string; body: string; image?: CaseMedia }[];
  /** a screenshot beside the problem (the "before") */
  problemImage?: CaseMedia;
  /** small drawings under the problem, one per pain (velory.com) */
  problemStrip?: { src: string; quote: string }[];
  /** how the case's images were made (velory.com) */
  imageSystem?: ImageSystem;
  /** how a good sales call maps onto the page, step by step, each with a real image */
  salesMap?: { title: string; steps: { call: string; page: string; image: { src: string; alt: string } }[] };
  /** how it was built, a few facts in a row (velory.com) */
  underHood?: { title: string; lead: string; facts: { value: string; label: string }[] };
  solution: { src: string; alt: string; caption: string }[];
  results: { value: string; label: string }[];
  /** what the same work would have cost bought in, with the sum shown on request */
  estimate?: { value: string; label: string; note: string; rows: { piece: string; hours: number }[] };
  reflection: string[];
  /** the live site, linked near the end */
  live?: { url: string; label: string };
};

/** an image beside a text card. "shot" = a page screenshot framed on blue,
    "still" = a transparent product close-up on white; a video plays on hover. */
export type CaseMedia = {
  /** the image; for "video" the poster (first frame); for "pair" the light version */
  src: string;
  alt: string;
  /** "video" = a screen recording that plays while in view (`video` = path without extension,
      .webm and .mp4 beside it); "pair" = light and dark captures with a switch (`dark`) */
  kind?: "shot" | "still" | "video" | "pair";
  caption?: string;
  video?: string;
  dark?: string;
};

export type ImageSystem = {
  lead: string;
  why: string;
  steps: { title: string; body: string }[];
  pair: { light: string; dark: string; alt: string };
  closeUps: { src: string; label: string }[];
  /** start = the resting frame (seconds), the same frame as the poster */
  films: { src: string; poster: string; label: string; start?: number }[];
  stats: { value: string; label: string }[];
};

const V = "/images/work/velory-com";

/* Each case study, shortened to what a hiring lead reads: the problem,
   what I did, the numbers and what I learned. Add a real screenshot with
   `shot: "/images/work/velory-com.jpg"` and it replaces the drawn preview. */
export const caseStudies: CaseStudy[] = [
  {
    slug: "velory-com",
    short: "A website for the people who now buy Velory.",
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
      "Velory started selling to IT admins. Its website was still talking to employees. So I pushed to rebuild it around the person who now buys it, from research to live site in four months.",
    meta: [
      { label: "Role", value: "My initiative: research, story, design, motion and build" },
      { label: "Team", value: "Me. Copy by Marielle (marketing), input from sales and IT admins" },
      { label: "Timeline", value: "Four months, research to launch" },
      {
        label: "Tools",
        value: "Figma, Webflow, coded components, Claude Code, HubSpot",
      },
    ],
    problemTitle: "We were losing deals to better-looking websites.",
    problem: [
      "Velory began as an employee perk: people picked a new laptop inside their budget. Then the product grew up. The new portal was built for IT admins, with every laptop, licence, phone plan and AI seat in one place, and ways to save money on all of it.",
      "The website still spoke to employees, and it looked its age. Sales kept hearing it from leads who walked away: next to a competitor’s modern site, ours made them doubt the product. And people in demos were surprised by features the site never showed.",
      "Nobody asked for a new site. I pushed for one, with one rule: no rebrand.",
    ],
    role: [],
    insight: {
      quote:
        "Good sales calls don’t start with features. They start with pain.",
      note: "What I took from a sales webinar, and heard again from every seller I interviewed",
    },
    /* the journey's four steps said the same as the decisions; the sales-call map below
       replaces it on this page */
    journey: [],
    salesMap: {
      title: "The page follows a good sales call",
      steps: [
        {
          call: "Start with the problems they recognise",
          page: "“Which one sounds like your week?”: five pains, in admins’ own words",
          image: { src: `${V}/map-1.webp`, alt: "One of the five pain cards: a person, their laptop and apps, and a phone marked missing" },
        },
        {
          call: "Then proof from peers",
          page: "Customer numbers right under the hero, from teams like Voyado, ZeroNorth and ZoCom",
          image: { src: `${V}/map-2.webp`, alt: "Trusted by top teams: customer logos with results like 80% faster forecasting and 20 h a month freed" },
        },
        {
          call: "Then the platform",
          page: "The product itself: real portal close-ups and the lifecycle ring",
          image: { src: `${V}/map-3.webp`, alt: "A portal close-up: Mei Lin’s laptop, licences and phone plan with their monthly costs" },
        },
        {
          call: "Then a way to try it",
          page: "Book a demo with one field: a work email",
          image: { src: `${V}/map-4.webp`, alt: "The book-a-demo page: “See how Velory would run your IT” and a form with only a work email field" },
        },
      ],
    },
    problemImage: {
      src: `${V}/before-hero.webp`,
      alt: "The old velory.com: a laptop with the portal on the left, the headline on the right, a pastel wave below",
      kind: "shot",
      caption: "Before · “IT Lifecycle on Autopilot”, and a demo that welcomes an employee, not an IT admin",
    },
    decisions: [
      {
        title: "Open with their week, not our features",
        body: "Picture an IT admin on a Friday, still chasing a laptop from someone who left in March. The page meets them there: five situations in their own words, each leading to the part of Velory that fixes it. After that, booking a demo takes one field.",
        image: {
          kind: "video",
          src: `${V}/pains-poster.webp`,
          video: `${V}/pains`,
          alt: "Scrolling through “Which one sounds like your week?”: five pain cards slide past one by one, then settle into a row",
          caption: "Which one sounds like your week? · the five pains, as you scroll",
        },
      },
      {
        title: "Look like the product they’ll log into",
        body: "Leads judge the portal by its website, so the site had to feel like the portal. Same logo, colours and type, rebuilt as a design system with more air and one accent for actions. And because many IT admins work in dark mode, the whole site follows them there.",
        image: {
          kind: "pair",
          src: `${V}/site-light.webp`,
          dark: `${V}/site-dark.webp`,
          alt: "The new velory.com hero, “The engine that runs IT lifecycle management”, in light and dark mode",
          caption: "Try the switch: the same page, light and dark",
        },
      },
      {
        title: "Show the product, not a laptop",
        body: "Prospects used to discover Velory’s features in the demo. Now the page shows them first: real close-ups from the portal, made in Velory Studio, and motion that explains. The lifecycle draws itself as you scroll, until eight stages close into one ring.",
        image: {
          kind: "video",
          src: `${V}/lifecycle-poster.webp`,
          video: `${V}/lifecycle`,
          alt: "Scrolling through the lifecycle: a new hire travels from Connect to Secure until eight stages close into a ring around the Velory logo",
          caption: "The lifecycle ring · words and scroll by me",
        },
      },
    ],
    underHood: {
      title: "Designed and coded as one system",
      lead: "I built the site in Webflow with my own React components, written with Claude Code and kept in GitHub. Marketing still changes words and images in Webflow, without touching code.",
      facts: [
        { value: "26", label: "components I coded, placed in Webflow like any other block" },
        { value: "176", label: "reviewed changes, each one recorded and easy to undo" },
      ],
    },
    solution: [],
    /* PLACEHOLDER: replace with real numbers before publishing (demo requests from HubSpot,
       bounce and pain-card clicks from analytics). These three are made up. */
    results: [
      { value: "+38%", label: "demo requests a month" },
      { value: "−24%", label: "bounce rate on the home page" },
      { value: "1 in 3", label: "visitors open a pain card" },
    ],
    /* a benchmark, not a quote: page counts from the velory.com sitemap, hours per piece
       estimated from published freelance ranges, at our old design consultant's 105 €/h */
    estimate: {
      value: "≈ 91 000 €",
      label: "what this site would have cost with our design consultant: about 870 hours at 105 € an hour. I designed and built it in-house instead.",
      note: "Page counts are from the site; hours per piece are my estimate from published freelance ranges.",
      rows: [
        { piece: "Research, interviews and structure", hours: 30 },
        { piece: "Design system", hours: 50 },
        { piece: "Home page, with motion", hours: 100 },
        { piece: "9 platform pages", hours: 126 },
        { piece: "6 solution pages", hours: 84 },
        { piece: "7 conversion pages (pricing, demo…)", hours: 84 },
        { piece: "9 hub pages (blog, integrations…)", hours: 72 },
        { piece: "7 CMS templates", hours: 70 },
        { piece: "26 code components", hours: 104 },
        { piece: "21 product scenes in light and dark, 7 films", hours: 70 },
        { piece: "QA and revisions", hours: 79 },
      ],
    },
    reflection: [
      "A website is part of the product. If it looks old, people assume the product is too, long before they ever log in.",
      "Sales already knew the story. My job was to listen, then put it on the page.",
      "Building with AI closed the gap between an idea and a live site. The research, the story and the taste were mine; what changed is that one person could carry all of it to launch.",
    ],
    live: { url: "https://velory.com", label: "velory.com" },
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
    journey: [
      { label: "One sentence", note: "You start from what you want to make, not from a blank page.", shape: "bubble" },
      { label: "Brand built in", note: "Colours, logo rules and templates live inside the tool.", shape: "swatches" },
      { label: "Many formats", note: "Banners, slides and films, each added because someone asked.", shape: "formats" },
      { label: "The whole team", note: "Sales, marketing and product make on-brand work themselves.", shape: "people" },
    ],
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
      /* DRAFT (written by Claude from what Lisa described): Team, Timeline, problem,
         insight, decisions, results and reflection need her real facts. */
      { label: "Team", value: "Me, with Velory’s product and development team" },
      { label: "Timeline", value: "Part of the new portal, 2026" },
      { label: "Tools", value: "Figma" },
    ],
    problem: [
      "Companies pay for software nobody opens any more. The data to find it was already in the portal, but admins had to go looking for it: export lists, compare logins, chase people one by one. Most never had the time, so the money kept leaking.",
      "The brief: let the portal do the looking, and make acting on what it finds as easy as one click.",
    ],
    role: [],
    insight: {
      quote: "Admins don’t want more data. They want to know what to do next.",
      note: "What came out of talking to the admins who use the portal",
    },
    journey: [
      { label: "Spot it", note: "The portal finds licences nobody has opened in 60 days.", shape: "magnifier" },
      { label: "Tell the admin", note: "One notification, with the saving in kronor.", shape: "bell" },
      { label: "Ask the people", note: "One click asks them in Slack or Teams.", shape: "bubbles" },
      { label: "Save", note: "Every “not using it” becomes a cancelled licence.", shape: "coins" },
    ],
    decisions: [
      {
        title: "The insight comes to you",
        body: "The portal watches licence use in the background and sends one clear notification with the saving in kronor, so the value is obvious before anyone clicks.",
      },
      {
        title: "Ask before you cancel",
        body: "Usage data is a strong hint, not proof. One button asks the people holding the licence in Slack or Teams, where they already are, and their answers come back into the portal.",
      },
      {
        title: "From insight to task to saving",
        body: "Every insight becomes a task with a clear end: the “not using it” answers turn into cancelled licences, and the saving is counted for you.",
      },
    ],
    solution: [],
    results: [
      { value: "1", label: "click to ask everyone" },
      { value: "0", label: "lists to export" },
      { value: "9 600 kr", label: "saved in this example" },
    ],
    reflection: ["Good insights are the ones you can act on straight away. The work was less about finding the data and more about designing the next step."],
  },
];

export const pad = (n: number) => String(n).padStart(2, "0");
