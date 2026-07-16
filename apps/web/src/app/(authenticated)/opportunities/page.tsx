import { redirect } from "next/navigation";

export default function LegacyOpportunitiesPage(): never {
  redirect("/pipeline");
}
