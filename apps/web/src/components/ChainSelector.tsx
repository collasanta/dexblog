"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supportedChains, SupportedChainId } from "@/lib/chains";
import { useChainId, useSwitchChain, useAccount } from "wagmi";
import { formatUnits } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";

interface ChainSelectorProps {
  onChainChange?: (chainId: number) => void;
  selectedChainId?: number;
}

export function ChainSelector({
  onChainChange,
  selectedChainId,
}: ChainSelectorProps) {
  const currentChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { address } = useAccount();
  const [showEthereumDialog, setShowEthereumDialog] = useState(false);
  const [pendingChainId, setPendingChainId] = useState<number | null>(null);
  const [selectOpen, setSelectOpen] = useState(false);

  // Default to Base (8453) if no selectedChainId and currentChainId is not set or not supported
  const baseChainId = 8453;
  const defaultChainId = selectedChainId ?? (currentChainId && supportedChains.some(chain => chain.id === currentChainId) ? currentChainId : baseChainId);
  const chainId = defaultChainId;

  // Prevent scroll locking when Select opens to avoid horizontal flicker
  useEffect(() => {
    const handleMutation = () => {
      if (selectOpen && document.body.hasAttribute('data-scroll-locked')) {
        document.body.removeAttribute('data-scroll-locked');
        document.body.style.paddingRight = '';
        document.body.style.overflow = '';
        document.body.style.pointerEvents = '';
      }
    };

    if (selectOpen) {
      // Check immediately
      handleMutation();
      
      // Watch for changes
      const observer = new MutationObserver(handleMutation);
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['data-scroll-locked', 'style'],
      });

      // Also check periodically
      const interval = setInterval(handleMutation, 50);

      return () => {
        observer.disconnect();
        clearInterval(interval);
        // Clean up on unmount
        document.body.removeAttribute('data-scroll-locked');
        document.body.style.paddingRight = '';
        document.body.style.overflow = '';
        document.body.style.pointerEvents = '';
      };
    }
  }, [selectOpen]);

  // Use shared USDC balance hook
  const { usdcBalance, decimals, isLoading: isLoadingBalance } = useUSDCBalance();

  // Skip USDC balance display on Arbitrum Sepolia
  const isArbitrumSepolia = chainId === 421614;

  const handleChange = (value: string) => {
    const newChainId = parseInt(value) as SupportedChainId;
    
    // Check if Ethereum Mainnet (chainId: 1) is selected
    if (newChainId === 1) {
      setPendingChainId(newChainId);
      setShowEthereumDialog(true);
      return;
    }
    
    if (switchChain) {
      switchChain({ chainId: newChainId });
    }
    onChainChange?.(newChainId);
  };

  const handleEmailClick = () => {
    window.location.href = "mailto:victor.collasanta@gmail.com?subject=Ethereum Support Request&body=Hi, I would like to request Ethereum Mainnet support for DexBlog.";
  };

  // Get current chain name
  const currentChain = supportedChains.find((chain) => chain.id === chainId);
  const chainName = currentChain?.name || "Select chain";

  // Format balance
  const balanceText =
    address && !isLoadingBalance
      ? usdcBalance !== null && usdcBalance !== undefined
        ? (() => {
            try {
              const formatted = formatUnits(usdcBalance, decimals);
              return formatted;
            } catch (e) {
              console.error("[ChainSelector] Error formatting balance:", e);
              return "0";
            }
          })()
        : null
      : isLoadingBalance
      ? "..."
      : null;

  return (
    <>
      <Select 
        value={chainId.toString()} 
        onValueChange={handleChange}
        onOpenChange={setSelectOpen}
      >
        <SelectTrigger className="w-full">
          <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
            <SelectValue placeholder="Select chain" className="flex-1" />
            {address && !isArbitrumSepolia && (
              <span className="text-xs text-muted-foreground shrink-0">
                {isLoadingBalance ? (
                  "• Loading..."
                ) : balanceText ? (
                  `• ${balanceText} USDC`
                ) : (
                  "• No USDC"
                )}
              </span>
            )}
          </div>
        </SelectTrigger>
        <SelectContent>
          {supportedChains.map((chain) => (
            <SelectItem key={chain.id} value={chain.id.toString()}>
              <div className="flex items-center gap-2">
                <ChainIcon chainId={chain.id} />
                <span>{chain.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={showEthereumDialog} onOpenChange={(open) => {
        setShowEthereumDialog(open);
        if (!open && pendingChainId) {
          // Reset the select to current chain when dialog closes
          setPendingChainId(null);
        }
      }}>
        <DialogContent onClose={() => {
          setShowEthereumDialog(false);
          setPendingChainId(null);
        }}>
          <DialogHeader>
            <DialogTitle>Ethereum Not Yet Supported</DialogTitle>
            <DialogDescription>
              Ethereum Mainnet is not yet supported on DexBlog. If you would like to see Ethereum support added, please send an email to{" "}
              <a
                href="mailto:victor.collasanta@gmail.com"
                className="text-primary underline hover:no-underline"
                onClick={(e) => {
                  e.preventDefault();
                  handleEmailClick();
                }}
              >
                victor.collasanta@gmail.com
              </a>
              {" "}and we'll add it for you!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEthereumDialog(false);
                setPendingChainId(null);
              }}
            >
              Close
            </Button>
            <Button onClick={() => {
              handleEmailClick();
              setShowEthereumDialog(false);
              setPendingChainId(null);
            }}>
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ChainIcon({ chainId }: { chainId: number }) {
  // Chain logos from ChainList (open source)
  // Using llama.fi CDN which hosts chain logos
  const chainLogos: Record<number, string> = {
    1: "https://icons.llamao.fi/icons/chains/rsz_ethereum.jpg", // Ethereum
    42161: "https://icons.llamao.fi/icons/chains/rsz_arbitrum.jpg", // Arbitrum
    421614: "https://icons.llamao.fi/icons/chains/rsz_arbitrum.jpg", // Arbitrum Sepolia
    10: "https://icons.llamao.fi/icons/chains/rsz_optimism.jpg", // Optimism
    8453: "https://icons.llamao.fi/icons/chains/rsz_base.jpg", // Base
    56: "https://icons.llamao.fi/icons/chains/rsz_bsc.jpg", // BSC
  };

  const fallbackColors: Record<number, string> = {
    1: "bg-[#627EEA]", // Ethereum
    42161: "bg-[#28A0F0]", // Arbitrum
    421614: "bg-[#28A0F0]", // Arbitrum Sepolia
    10: "bg-[#FF0420]", // Optimism
    8453: "bg-[#0052FF]", // Base
    56: "bg-[#F0B90B]", // BSC
  };

  const logoUrl = chainLogos[chainId];
  const fallbackColor = fallbackColors[chainId] || "bg-gray-500";

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className="h-4 w-4 rounded-full object-cover"
        onError={(e) => {
          // Fallback to colored circle if image fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = "none";
          const parent = target.parentElement;
          if (parent) {
            const fallback = document.createElement("div");
            fallback.className = `h-4 w-4 rounded-full ${fallbackColor}`;
            parent.appendChild(fallback);
          }
        }}
      />
    );
  }

  return <div className={`h-4 w-4 rounded-full ${fallbackColor}`} />;
}

