import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { isAuth0Configured } from "@/lib/auth0-config";
import { auth0 } from "@/lib/auth0";
import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import Script from "next/script";
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
  return (
    <>
      <AuthenticatedShell>{children}</AuthenticatedShell>
      {/* Script de Integração com o Chatbase - EnergivIA (Apenas Dashboard) */}
      <Script
        id="chatbase-widget"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
            (function(){if(!window.chatbase||window.chatbase("getState")!=="initialized"){window.chatbase=function(){(window.chatbase.q=window.chatbase.q||[]).push(arguments)};window.chatbase=new Proxy(window.chatbase,{get(target,prop){if(prop==="q"){return target.q}return function(){return target(prop,...arguments)}}})}const parent=document.getElementsByTagName("head")[0];const script=document.createElement("script");script.src="https://www.chatbase.co/embed.min.js";script.id="CXsTCPop6oDd4DIn7EWX9";script.domain="www.chatbase.co";parent.appendChild(script)})()
          `,
        }}
      />
    </>
  );
}
