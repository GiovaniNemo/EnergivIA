import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { isAuth0Configured } from "@/lib/auth0-config";
import { auth0 } from "@/lib/auth0";
import { AuthenticatedShell } from "@/components/layout/authenticated-shell";

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}): Promise<JSX.Element> {
  if (isAuth0Configured()) {
    const session = await auth0.getSession();
    if (!session?.user) {
      redirect("/auth/login");
    }
  }
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
