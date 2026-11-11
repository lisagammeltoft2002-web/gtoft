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
  role: "Designer who builds",
  positioning:
    "UI and UX designer for websites and apps, who also builds what she designs.",
  city: "Stockholm",
  coords: { lat: "59.33° N", lng: "18.07° E" },
  // TODO: replace with your real addresses
  email: "hello@example.com",
  linkedin: "https://www.linkedin.com/in/your-handle",
  github: "https://github.com/lisagammeltoft2002-web",
  cv: "/cv.pdf",
  year: 2026,
  status: "Open to agency and studio roles",
};

/* The one sentence a hiring lead reads first, and the line under it. */
export const intro = "I design websites and apps, and I build them too.";
export const introMore =
  "UI and UX designer in Stockholm. Today I’m the product engineer at Velory, where I rebuilt velory.com end to end and made the studio the whole company now creates its material in.";

/* What I bring: three short rows, concrete enough to check. */
export const bring = [
  {
    label: "Design",
    line: "UI and UX for websites and apps. Research, journeys, design systems and interfaces in Figma. Creative when the brief allows it, by the book when the product needs it.",
  },
  {
    label: "Build",
    line: "I ship what I design. Webflow, coded components, motion and the 3D on this page. Claude and Claude Code are part of my everyday toolkit.",
  },
  {
    label: "Ship",
    line: "Live sites, real users, measured results. velory.com went from the first research conversation to launch in four months.",
  },
];

/* How I work: four short beats, written across the sky while one bird flies. */
export const process = [
  { label: "Listen" },
  { label: "Problem first" },
  { label: "Systems" },
  { label: "Ship it" },
];

export const journey = {
  opening:
    "I never fly a project in a straight line, but I always know where it lands.",
  lines: [
    "I start with the people who already tell the story best: sales, support and the customer.",
    "I lead with the problem, so people see themselves before they see the product.",
    "Then I design it as a system, so it still feels like one product long after launch.",
    "And I build it myself, from the first sketch to the live site.",
  ],
};

/* The human part, shown at sunset next to the contact details. */
export const about = {
  hello: "Hi, I’m Lisa.",
  body: "I’m social, and very focused when I work. Design doesn’t stop when I log off: I make pottery, crochet, sew my own clothes and tuft rugs. I’ve lived in Australia and competed at the cheerleading world championships.",
  makes: [
    { src: "/images/make-pottery.jpg", alt: "Pottery I made" },
    { src: "/images/make-crochet.jpg", alt: "Crochet I made" },
    { src: "/images/make-sewing.jpg", alt: "Clothes I sewed" },
  ],
};

export const contact = {
  title: "Let\u2019s make something.",
  note: `${site.status} · Stockholm & remote`,
};

/* ------------------------------------------------------------------
   CASE STUDIES — placeholder projects. Each journey needs 5 stops.
------------------------------------------------------------------- */

export type CaseStudy = {
  slug: string;
  title: string;
  kind: string;
  year: string;
  tilt: number;
  image: { src: string; alt: string };
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
   what I did, the numbers and what I learned. Images: swap the src for
   real screenshots (keep them crisp, landscape, about 1600 × 1000). */
export const caseStudies: CaseStudy[] = [
  {
    slug: "velory-com",
    title: "velory.com",
    kind: "Website · research, design and build",
    year: "2026",
    tilt: -5,
    image: {
      src: "/images/work-fjall.jpg",
      alt: "The new velory.com home page",
    },
    outcome:
      "I rebuilt Velory’s website around how sales actually sells: problem first, proof early, a demo that asks for one field. Designed and shipped alone, in four months.",
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
    slug: "velory-studio",
    title: "Velory Studio",
    kind: "Internal tool · product design and build",
    year: "2026",
    tilt: 4,
    image: {
      src: "/images/gallery-haze.jpg",
      alt: "Velory Studio, chat on the left and the finished piece on the right",
    },
    outcome:
      "It started as a faster way to make LinkedIn banners. Now anyone at Velory makes on-brand decks, films and website images in minutes, with the brand, legal and security rules built in.",
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
    title: "Actionable Insights",
    kind: "Product · UX and UI",
    year: "2026",
    tilt: -3,
    image: {
      src: "/images/work-vav.jpg",
      alt: "Actionable Insights in the Velory portal",
    },
    outcome:
      "Helping Velory’s customers see where they can save money on IT, without having to think about it.",
    meta: [
      { label: "Role", value: "Lorem ipsum" },
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
