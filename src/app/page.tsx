import { Cell } from "@/components/Cell";
import { FitText } from "@/components/FitText";
import { Grid } from "@/components/Grid";
import { Hobbies } from "@/components/Hobbies";
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
        <Hobbies />
      </Cell>
    </main>
  );
}
