import { redirect } from "next/navigation";
import { isAuth0Configured } from "@/lib/auth0-config";

export default function LoginPage(): Promise<never> {
  if (isAuth0Configured()) {
    // Adicionado o /api antes do /auth/login
    redirect("/api/auth/login");
  }
  redirect("/");
}
