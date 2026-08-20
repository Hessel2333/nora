import { redirect } from "next/navigation";

export default function Page() {
  redirect("/catalog/boms?view=structure");
}
