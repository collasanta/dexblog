"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supportedChains, SupportedChainId } from "@/lib/chains";
import { useChainId, useSwitchChain } from "wagmi";

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

  const chainId = selectedChainId ?? currentChainId;

  const handleChange = (value: string) => {
    const newChainId = parseInt(value) as SupportedChainId;
    if (switchChain) {
      switchChain({ chainId: newChainId });
    }
    onChainChange?.(newChainId);
  };

  return (
    <Select value={chainId?.toString()} onValueChange={handleChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select chain" />
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
  );
}

function ChainIcon({ chainId }: { chainId: number }) {
  // Chain logos from ChainList (open source)
  // Using llama.fi CDN which hosts chain logos
  const chainLogos: Record<number, string> = {
    1: "https://icons.llamao.fi/icons/chains/rsz_ethereum.jpg", // Ethereum
    137: "https://icons.llamao.fi/icons/chains/rsz_polygon.jpg", // Polygon
    42161: "https://icons.llamao.fi/icons/chains/rsz_arbitrum.jpg", // Arbitrum
    10: "https://icons.llamao.fi/icons/chains/rsz_optimism.jpg", // Optimism
    8453: "https://icons.llamao.fi/icons/chains/rsz_base.jpg", // Base
    56: "https://icons.llamao.fi/icons/chains/rsz_bsc.jpg", // BSC
  };

  const fallbackColors: Record<number, string> = {
    1: "bg-[#627EEA]", // Ethereum
    137: "bg-[#8247E5]", // Polygon
    42161: "bg-[#28A0F0]", // Arbitrum
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

