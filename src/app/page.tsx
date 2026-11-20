import { Board, type Tile as BoardTile } from "@/components/Board";
import { Grid } from "@/components/Grid";
import { Hobbies } from "@/components/Hobbies";
import { WindyField } from "@/components/WindyField";
import { VeloryComCase } from "@/components/cases/VeloryComCase";
import { StudioCase } from "@/components/cases/StudioCase";
import { InsightsCase } from "@/components/cases/InsightsCase";
import { Tile } from "@/components/tiles/Tile";
import { NameTile } from "@/components/tiles/NameTile";
import { PortraitTile } from "@/components/tiles/PortraitTile";
import { ContactTile } from "@/components/tiles/ContactTile";
import { NowTile } from "@/components/tiles/NowTile";
import { HowIWork } from "@/components/tiles/HowIWork";
import { AboutTile, SunflowerDrawing, ToolboxTile } from "@/components/tiles/Quiet";
import { about, board, contact, intro, introMore, process, site } from "@/content/site";

/* The home page: one board of rectangles. What matters most comes first and biggest:
   who Lisa is (the name), the proof (three wide case studies, each its own shade of blue
   and a short teaser of its story), the person (portrait, sunflowers, hobbies) and the next
   step (contact, the only yellow). */

const tools = about.facts.find((f) => f.label === "Toolbox")?.value.split(", ") ?? [];

/* every rectangle, most important first (on unusual screen sizes the last ones are left out) */
const tiles: BoardTile[] = [
  { id: "name", w: 2, node: <NameTile first={site.firstName} last={site.lastName} title={board.title} line={intro} /> },
  { id: "velory", w: 2, own: true, node: <VeloryComCase copy={board.cases["velory-com"]} /> },
  { id: "studio", w: 2, own: true, node: <StudioCase copy={board.cases["velory-studio"]} /> },
  { id: "insights", w: 2, own: true, node: <InsightsCase copy={board.cases["actionable-insights"]} /> },
  { id: "contact", node: <ContactTile title={contact.title} email={site.email} linkedin={site.linkedin} cv={site.cv} /> },
  { id: "portrait", node: <PortraitTile src={site.portrait.src} alt={site.portrait.alt} /> },
  { id: "hobbies", node: <Hobbies /> },
  { id: "sunflowers", node: <WindyField /> },
  /* the calm extra row on taller screens */
  { id: "about", w: 2, node: <AboutTile hello={board.about.hello} lines={[introMore[0]]} facts={board.about.facts} /> },
  {
    id: "now",
    node: (
      <Tile tone="leaf" label="Now">
        <NowTile role={board.now.role} open={board.now.open} place={site.city} />
      </Tile>
    ),
  },
  {
    id: "how",
    node: (
      <Tile label="How I work">
        <HowIWork steps={process.map((p) => p.label)} />
      </Tile>
    ),
  },
  {
    id: "toolbox",
    node: (
      <Tile label="Toolbox">
        <ToolboxTile tools={tools} />
      </Tile>
    ),
  },
  {
    id: "drawing",
    node: (
      <Tile>
        <SunflowerDrawing />
      </Tile>
    ),
  },
];

/* hand-placed layouts for the common desktop nets: id → [column, row]. The eye reads it as
   a Z: name → portrait → first case → down through the other two → contact. */
type Spot = [number, number];
const twoRows: Record<string, Spot> = {
  name: [0, 0], portrait: [2, 0], velory: [3, 0], sunflowers: [5, 0],
  hobbies: [0, 1], studio: [1, 1], insights: [3, 1], contact: [5, 1],
};
const layouts: Record<string, Record<string, Spot>> = {
  "6x2": twoRows,
  "6x3": { ...twoRows, about: [0, 2], now: [2, 2], how: [3, 2], toolbox: [4, 2], drawing: [5, 2] },
};

export default function Home() {
  return (
    <main className="relative min-h-dvh overflow-hidden">
      <Grid />
      <Board tiles={tiles} layouts={layouts} />
    </main>
  );
}
