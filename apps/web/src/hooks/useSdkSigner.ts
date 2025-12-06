"use client";

import { useEffect, useState } from "react";
import type { BrowserProvider, Signer } from "ethers";
import { walletClientToEthers } from "dex-blog-sdk";
import { useWalletClient } from "wagmi";

interface SignerState {
  signer: Signer | null;
  walletProvider: BrowserProvider | null;
  chainId?: number;
  isLoading: boolean;
  error: Error | null;
}

export function useSdkSigner() {
  const { data: walletClient } = useWalletClient();
  const [state, setState] = useState<SignerState>({
    signer: null,
    walletProvider: null,
    chainId: undefined,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    if (!walletClient) {
      setState({
        signer: null,
        walletProvider: null,
        chainId: undefined,
        isLoading: false,
        error: null,
      });
      return;
    }

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    walletClientToEthers(walletClient as any)
      .then(({ provider, signer, chainId }) => {
        if (cancelled) {
          return;
        }
        setState({
          signer,
          walletProvider: provider,
          chainId,
          isLoading: false,
          error: null,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("[useSdkSigner] Failed to convert wallet client:", error);
        setState({
          signer: null,
          walletProvider: null,
          chainId: undefined,
          isLoading: false,
          error: error as Error,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [walletClient]);

  return state;
}

