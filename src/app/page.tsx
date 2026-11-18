import { Cell } from "@/components/Cell";
import { Grid } from "@/components/Grid";
import { Headline } from "@/components/Headline";
import { Hobbies } from "@/components/Hobbies";
import { WindyField } from "@/components/WindyField";
import { site } from "@/content/site";

export default function Home() {
  return (
    <main className="relative h-dvh overflow-hidden">
      <Grid />
      <Headline name={site.name} role="Product engineer" cells={3} photo={site.portrait.src} alt={site.portrait.alt} />
      <Cell col={1} row={1}>
        <WindyField />
      </Cell>
      <Cell col={3} row={1}>
        <Hobbies />
      </Cell>
    </main>
  );
}
