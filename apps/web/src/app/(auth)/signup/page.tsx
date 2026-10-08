import { redirect } from "next/navigation";
import { isAuth0Configured } from "@/lib/auth0-config";

interface SignupPageProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function SignupPage({ searchParams }: SignupPageProps): Promise<never> {
  if (isAuth0Configured()) {
    const returnTo = searchParams?.returnTo ? String(searchParams.returnTo) : undefined;
    const target = returnTo
      ? `/auth/login?screen_hint=signup&returnTo=${encodeURIComponent(returnTo)}`
      : "/auth/login?screen_hint=signup";
    redirect(target);
  }

  redirect("/");
}
