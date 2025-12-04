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
  // Simple colored circle based on chain
  const colors: Record<number, string> = {
    1: "bg-[#627EEA]", // Ethereum
    137: "bg-[#8247E5]", // Polygon
    42161: "bg-[#28A0F0]", // Arbitrum
    10: "bg-[#FF0420]", // Optimism
    8453: "bg-[#0052FF]", // Base
    56: "bg-[#F0B90B]", // BSC
  };

  return (
    <div className={`h-4 w-4 rounded-full ${colors[chainId] || "bg-gray-500"}`} />
  );
}

