"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config } from "@/lib/wagmi";
import { useState, useEffect } from "react";

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  // Handle WalletConnect errors gracefully
  useEffect(() => {
    const handleError = (error: Error) => {
      // Ignore WalletConnect connection errors - they're not critical
      if (error.message?.includes("Connection interrupted") || 
          error.message?.includes("WalletConnect") ||
          error.message?.includes("subscribe")) {
        console.warn("WalletConnect connection issue (non-critical):", error.message);
        return;
      }
      // Log other errors
      console.error("Web3 error:", error);
    };

    // Listen for unhandled errors
    window.addEventListener("error", (event) => {
      if (event.error?.message?.includes("Connection interrupted") ||
          event.error?.message?.includes("WalletConnect")) {
        event.preventDefault();
        handleError(event.error);
      }
    });

    // Listen for unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      if (event.reason?.message?.includes("Connection interrupted") ||
          event.reason?.message?.includes("WalletConnect")) {
        event.preventDefault();
        handleError(event.reason);
      }
    });

    return () => {
      window.removeEventListener("error", handleError as any);
      window.removeEventListener("unhandledrejection", handleError as any);
    };
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}


