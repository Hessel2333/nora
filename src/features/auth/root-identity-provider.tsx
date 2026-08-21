"use client";

import { usePathname } from "next/navigation";
import { NoraIdentityProvider } from "./nora-identity-provider";

export function RootIdentityProvider({ children }: { children: React.ReactNode }) {
  return <NoraIdentityProvider pathname={usePathname()}>{children}</NoraIdentityProvider>;
}
