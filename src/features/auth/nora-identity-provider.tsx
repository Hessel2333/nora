"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { LogIn, RefreshCw, ShieldAlert } from "lucide-react";
import type Keycloak from "keycloak-js";
import { Button } from "@/components/ui";
import { configureAccessTokenProvider } from "@/lib/access-token";
import { identityCan, localDemoIdentity, localDevelopmentIdentity, type NoraIdentity, type NoraPermission } from "@/lib/identity";
import { noraApi } from "@/lib/nora-api";
import { getNoraRuntimeMode } from "@/lib/runtime-mode";

type IdentityStatus = "loading" | "authenticated" | "error";

interface IdentityContextValue {
  identity: NoraIdentity | null;
  status: IdentityStatus;
  can: (permission: NoraPermission) => boolean;
  logout: () => Promise<void>;
}

const IdentityContext = createContext<IdentityContextValue>({
  identity: localDevelopmentIdentity,
  status: "authenticated",
  can: () => true,
  logout: async () => undefined,
});

let keycloakInitialization: Promise<Keycloak> | undefined;

async function initializeKeycloak() {
  if (keycloakInitialization) return keycloakInitialization;
  const url = process.env.NEXT_PUBLIC_OIDC_URL?.trim();
  const realm = process.env.NEXT_PUBLIC_OIDC_REALM?.trim();
  const clientId = process.env.NEXT_PUBLIC_OIDC_CLIENT_ID?.trim();
  if (!url || !realm || !clientId) {
    throw new Error("生产身份配置不完整，请联系系统管理员");
  }
  keycloakInitialization = import("keycloak-js").then(async ({ default: KeycloakClient }) => {
    const client = new KeycloakClient({ url, realm, clientId });
    const authenticated = await client.init({
      onLoad: "login-required",
      flow: "standard",
      pkceMethod: "S256",
      checkLoginIframe: false,
    });
    if (!authenticated || !client.token) throw new Error("登录未完成，请重新登录");
    return client;
  }).catch((error) => {
    keycloakInitialization = undefined;
    throw error;
  });
  return keycloakInitialization;
}

function publicWithoutOperationsIdentity(pathname: string) {
  return pathname === "/showroom" || pathname === "/help" || pathname.startsWith("/help/");
}

export function NoraIdentityProvider({
  pathname,
  children,
}: {
  pathname: string;
  children: React.ReactNode;
}) {
  const mode = getNoraRuntimeMode();
  const bypass = mode !== "production" || publicWithoutOperationsIdentity(pathname);
  const localIdentity = mode === "demo" ? localDemoIdentity : localDevelopmentIdentity;
  const [identity, setIdentity] = useState<NoraIdentity | null>(
    mode === "production" ? null : localIdentity,
  );
  const [status, setStatus] = useState<IdentityStatus>(bypass ? "authenticated" : "loading");
  const [error, setError] = useState("");
  const [client, setClient] = useState<Keycloak | null>(null);

  useEffect(() => {
    if (bypass) {
      configureAccessTokenProvider(undefined);
      return;
    }
    let active = true;
    setStatus("loading");
    setError("");
    void initializeKeycloak()
      .then(async (keycloak) => {
        if (!active) return;
        configureAccessTokenProvider(async () => {
          const refreshed = await keycloak.updateToken(30);
          if (!keycloak.token) throw new Error(refreshed ? "身份令牌刷新失败" : "登录已失效");
          return keycloak.token;
        });
        const verifiedIdentity = await noraApi.currentIdentity();
        if (!active) return;
        keycloak.onAuthLogout = () => {
          configureAccessTokenProvider(undefined);
          setIdentity(null);
          setStatus("error");
          setError("登录已退出，请重新登录");
        };
        setClient(keycloak);
        setIdentity(verifiedIdentity);
        setStatus("authenticated");
      })
      .catch((cause) => {
        if (!active) return;
        configureAccessTokenProvider(undefined);
        setStatus("error");
        setError(cause instanceof Error ? cause.message : "身份服务暂不可用");
      });
    return () => {
      active = false;
    };
  }, [bypass]);

  const can = useCallback(
    (permission: NoraPermission) => identityCan(identity, permission),
    [identity],
  );
  const logout = useCallback(async () => {
    configureAccessTokenProvider(undefined);
    await client?.logout({ redirectUri: window.location.origin });
  }, [client]);

  if (!bypass && status === "error") {
    return (
      <IdentityGate
        icon={<ShieldAlert size={21} />}
        title="暂时无法完成登录"
        detail={error || "请稍后重试；系统不会以演示身份进入生产数据。"}
        action={<Button onClick={() => window.location.reload()}><LogIn size={16} />重新登录</Button>}
      />
    );
  }
  if (!bypass && (status === "loading" || !identity)) {
    return <IdentityGate icon={<RefreshCw className="animate-spin" size={21} />} title="正在验证身份" detail="验证完成后将返回当前工作页面。" />;
  }

  return (
    <IdentityContext.Provider value={{ identity, status, can, logout }}>
      {children}
    </IdentityContext.Provider>
  );
}

function IdentityGate({
  icon,
  title,
  detail,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--canvas)] p-5" aria-live="polite">
      <section className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--stroke)] bg-[var(--surface)] p-7 text-center shadow-[var(--shadow-card)]">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[var(--interactive-soft)] text-[var(--interactive)]">{icon}</span>
        <h1 className="mt-5 text-xl font-semibold tracking-[-0.02em]">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{detail}</p>
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
      </section>
    </main>
  );
}

export function useNoraIdentity() {
  return useContext(IdentityContext);
}
