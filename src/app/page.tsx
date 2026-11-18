import { Bloom } from "@/components/Bloom";
import { Cell } from "@/components/Cell";
import { FitText } from "@/components/FitText";
import { Grid } from "@/components/Grid";
import { WindyField } from "@/components/WindyField";

export default function Home() {
  return (
    <main className="relative h-dvh overflow-hidden">
      <Grid />
      <FitText cells={3}>Lorem ipsum</FitText>
      <Cell col={1} row={1}>
        <WindyField />
      </Cell>
      <Cell col={3} row={1}>
        <div className="h-full w-full bg-(--leaf)">
          <Bloom />
        </div>
      </Cell>
    </main>
  );
}
