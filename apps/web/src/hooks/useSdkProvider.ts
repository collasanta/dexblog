"use client";

import { useEffect, useState } from "react";
import type { Provider } from "ethers";
import { createFallbackProvider } from "dex-blog-sdk";

interface ProviderState {
  provider: Provider | null;
  isLoading: boolean;
  error: Error | null;
}

export function useSdkProvider(chainId?: number) {
  const [state, setState] = useState<ProviderState>({
    provider: null,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    if (!chainId) {
      setState({ provider: null, isLoading: false, error: null });
      return;
    }

    setState((prev) => ({
      provider: prev.provider,
      isLoading: true,
      error: null,
    }));

    createFallbackProvider(chainId)
      .then(({ provider }) => {
        if (cancelled) return;
        setState({ provider, isLoading: false, error: null });
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("[useSdkProvider] Failed to create provider:", error);
        setState({ provider: null, isLoading: false, error: error as Error });
      });

    return () => {
      cancelled = true;
    };
  }, [chainId]);

  return state;
}


