import { redirect } from "next/navigation";
import { isAuth0Configured } from "@/lib/auth0-config";

export default function LoginPage(): Promise<never> {
  if (isAuth0Configured()) {
    // Redireciona para o endpoint de login da sua API Backend ou Auth0
    const authHost = process.env.APP_AUTH_HOST || process.env.NEXT_PUBLIC_APP_URL || "";

    // Se você usa a API externa para login:
    redirect(`${authHost}/auth/login`);
  }

  redirect("/");
}
