import { redirect } from "next/navigation";
import { isAuth0Configured } from "@/lib/auth0-config";

interface CadastroPageProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function CadastroPage({ searchParams }: CadastroPageProps): Promise<never> {
  if (isAuth0Configured()) {
    const returnTo = searchParams?.returnTo ? String(searchParams.returnTo) : undefined;
    const target = returnTo
      ? `/auth/login?screen_hint=signup&returnTo=${encodeURIComponent(returnTo)}`
      : "/auth/login?screen_hint=signup";
    redirect(target);
  }

  redirect("/");
}
