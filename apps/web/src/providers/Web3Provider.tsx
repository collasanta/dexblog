"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config } from "@/lib/wagmi";
import { useState, useEffect } from "react";

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000, // 2 minutes default
            gcTime: 10 * 60 * 1000, // 10 minutes cache (garbage collection)
            retry: 2, // Retry failed requests twice
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
          },
        },
      })
  );

  // Ensure we're mounted on the client before rendering children
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle WalletConnect errors gracefully
  useEffect(() => {
    if (!mounted) return;

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
  }, [mounted]);

  // Don't render children until mounted on client
  if (!mounted) {
    return null;
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}


