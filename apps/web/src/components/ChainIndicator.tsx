"use client";

import { useState } from "react";
import { useChainId, useSwitchChain } from "wagmi";
import { supportedChains, getChainName, SupportedChainId } from "@/lib/chains";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
        className="h-5 w-5 rounded-full object-cover"
        onError={(e) => {
          // Fallback to colored circle if image fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = "none";
          const parent = target.parentElement;
          if (parent) {
            const fallback = document.createElement("div");
            fallback.className = `h-5 w-5 rounded-full ${fallbackColor}`;
            parent.appendChild(fallback);
          }
        }}
      />
    );
  }

  return <div className={`h-5 w-5 rounded-full ${fallbackColor}`} />;
}

interface ChainIndicatorProps {
  // When true, always show the chain name (even on small screens).
  showName?: boolean;
}

export function ChainIndicator({ showName = false }: ChainIndicatorProps) {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [showEthereumDialog, setShowEthereumDialog] = useState(false);
  const isSupported = supportedChains.some((chain) => chain.id === chainId);
  const chainName = isSupported ? getChainName(chainId) : "Unsupported";

  const handleChainChange = (value: string) => {
    const newChainId = parseInt(value) as SupportedChainId;
    
    // Check if Ethereum Mainnet (chainId: 1) is selected
    if (newChainId === 1) {
      setShowEthereumDialog(true);
      return;
    }
    
    if (switchChain) {
      switchChain({ chainId: newChainId });
    }
  };

  const handleEmailClick = () => {
    window.location.href = "mailto:victor.collasanta@gmail.com?subject=Ethereum Support Request&body=Hi, I would like to request Ethereum Mainnet support for DexBlog.";
  };

  if (!isSupported) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted/70 transition-colors cursor-pointer">
            <ChainIcon chainId={chainId} />
            {/* Desktop: show name and chevron */}
            <span
              className={`${showName ? "inline" : "hidden sm:inline"} text-sm font-medium text-foreground whitespace-nowrap`}
            >
              {chainName}
            </span>
            <ChevronDown className={`${showName ? "block" : "hidden sm:block"} h-4 w-4 text-muted-foreground`} />
          </button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuRadioGroup
            value={chainId.toString()}
            onValueChange={handleChainChange}
          >
            {supportedChains.map((chain) => (
              <DropdownMenuRadioItem
                key={chain.id}
                value={chain.id.toString()}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ChainIcon chainId={chain.id} />
                  <span>{chain.name}</span>
                </div>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showEthereumDialog} onOpenChange={setShowEthereumDialog}>
        <DialogContent onClose={() => setShowEthereumDialog(false)}>
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
              onClick={() => setShowEthereumDialog(false)}
            >
              Close
            </Button>
            <Button onClick={() => {
              handleEmailClick();
              setShowEthereumDialog(false);
            }}>
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

