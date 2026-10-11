import { redirect } from "next/navigation";
import { isAuth0Configured } from "@/lib/auth0-config";

interface LoginPageProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function LoginPage({ searchParams }: LoginPageProps): Promise<never> {
  if (isAuth0Configured()) {
    const returnTo = searchParams?.returnTo ? String(searchParams.returnTo) : undefined;
    const target = returnTo
      ? `/auth/login?returnTo=${encodeURIComponent(returnTo)}`
      : "/auth/login";
    redirect(target);
  }

  redirect("/");
}
