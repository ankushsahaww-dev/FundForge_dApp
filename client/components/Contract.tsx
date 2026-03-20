"use client";

import { useState, useCallback, useEffect } from "react";
import {
  createCampaign,
  donate,
  withdraw,
  claimRefund,
  getCampaign,
  getDonation,
  getAllCampaignIds,
  CONTRACT_ADDRESS,
} from "@/hooks/contract";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Spotlight } from "@/components/ui/spotlight";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Icons ────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function FireIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

// ── Types ────────────────────────────────────────────────────

interface Campaign {
  creator: string;
  title: string;
  description: string;
  goal: string;
  deadline: number;
  raised: string;
  withdrawn: boolean;
}

// ── Styled Input ─────────────────────────────────────────────

function Input({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30">
        {label}
      </label>
      <div className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-px transition-all focus-within:border-[#7c6cf0]/30 focus-within:shadow-[0_0_20px_rgba(124,108,240,0.08)]">
        <input
          {...props}
          className="w-full rounded-[11px] bg-transparent px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none"
        />
      </div>
    </div>
  );
}

// ── Progress Bar ────────────────────────────────────────────

function ProgressBar({ raised, goal }: { raised: string; goal: string }) {
  const raisedNum = Number(raised) / 1e7; // Convert from stroops
  const goalNum = Number(goal) / 1e7;
  const percent = Math.min((raisedNum / goalNum) * 100, 100);
  const isSuccess = raisedNum >= goalNum;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#34d399] font-medium">{raisedNum.toLocaleString()} XLM</span>
        <span className="text-white/35">{goalNum.toLocaleString()} XLM goal</span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isSuccess ? "bg-gradient-to-r from-[#34d399] to-[#4fc3f7]" : "bg-gradient-to-r from-[#7c6cf0] to-[#fbbf24]"
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

type Tab = "browse" | "create" | "donate";

interface ContractUIProps {
  walletAddress: string | null;
  onConnect: () => void;
  isConnecting: boolean;
}

export default function ContractUI({ walletAddress, onConnect, isConnecting }: ContractUIProps) {
  const [activeTab, setActiveTab] = useState<Tab>("browse");
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  // Browse state
  const [campaigns, setCampaigns] = useState<{ id: number; campaign: Campaign }[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [userDonation, setUserDonation] = useState<string | null>(null);

  // Create state
  const [createTitle, setCreateTitle] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createGoal, setCreateGoal] = useState("");
  const [createDays, setCreateDays] = useState("7");
  const [isCreating, setIsCreating] = useState(false);

  // Donate state
  const [donateAmount, setDonateAmount] = useState("");
  const [isDonating, setIsDonating] = useState(false);

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const loadCampaigns = useCallback(async () => {
    setIsLoadingCampaigns(true);
    try {
      const ids = await getAllCampaignIds(walletAddress || undefined);
      if (ids && Array.isArray(ids)) {
        const loaded: { id: number; campaign: Campaign }[] = [];
        for (const id of ids) {
          const campaign = await getCampaign(Number(id), walletAddress || undefined);
          if (campaign) {
            loaded.push({ id: Number(id), campaign: campaign as Campaign });
          }
        }
        setCampaigns(loaded);
      }
    } catch (err: unknown) {
      console.error("Failed to load campaigns:", err);
    } finally {
      setIsLoadingCampaigns(false);
    }
  }, [walletAddress]);

  const loadCampaignDetails = useCallback(async (campaignId: number) => {
    try {
      const campaign = await getCampaign(campaignId, walletAddress || undefined);
      setSelectedCampaign(campaign as Campaign);
      if (walletAddress) {
        const donation = await getDonation(campaignId, walletAddress, walletAddress);
        setUserDonation(donation ? String(Number(donation) / 1e7) : null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load campaign");
    }
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress) {
      loadCampaigns();
    }
  }, [walletAddress, loadCampaigns]);

  const handleCreateCampaign = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!createTitle.trim() || !createDesc.trim() || !createGoal.trim() || !createDays.trim()) {
      return setError("Fill in all fields");
    }
    const goalLumens = parseFloat(createGoal);
    if (isNaN(goalLumens) || goalLumens <= 0) return setError("Invalid goal amount");
    const days = parseInt(createDays);
    if (isNaN(days) || days <= 0) return setError("Invalid duration");
    
    setError(null);
    setIsCreating(true);
    setTxStatus("Awaiting signature...");
    try {
      const deadline = Math.floor(Date.now() / 1000) + (days * 24 * 60 * 60);
      const goalStroops = BigInt(Math.floor(goalLumens * 1e7));
      await createCampaign(walletAddress, createTitle.trim(), createDesc.trim(), goalStroops, deadline);
      setTxStatus("Campaign created on-chain!");
      setCreateTitle("");
      setCreateDesc("");
      setCreateGoal("");
      setCreateDays("7");
      await loadCampaigns();
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsCreating(false);
    }
  }, [walletAddress, createTitle, createDesc, createGoal, createDays, loadCampaigns]);

  const handleDonate = useCallback(async () => {
    if (!walletAddress || !selectedCampaign) return setError("Select a campaign first");
    const amountLumens = parseFloat(donateAmount);
    if (isNaN(amountLumens) || amountLumens <= 0) return setError("Invalid donation amount");
    
    setError(null);
    setIsDonating(true);
    setTxStatus("Awaiting signature...");
    try {
      const amountStroops = BigInt(Math.floor(amountLumens * 1e7));
      const campaignId = campaigns.find(c => c.campaign === selectedCampaign)?.id;
      if (!campaignId) throw new Error("Campaign not found");
      await donate(walletAddress, campaignId, amountStroops);
      setTxStatus("Donation recorded on-chain!");
      setDonateAmount("");
      await loadCampaignDetails(campaignId);
      await loadCampaigns();
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsDonating(false);
    }
  }, [walletAddress, selectedCampaign, donateAmount, campaigns, loadCampaignDetails, loadCampaigns]);

  const handleWithdraw = useCallback(async () => {
    if (!walletAddress || !selectedCampaign) return;
    
    setError(null);
    setTxStatus("Awaiting signature...");
    try {
      const campaignId = campaigns.find(c => c.campaign === selectedCampaign)?.id;
      if (!campaignId) throw new Error("Campaign not found");
      await withdraw(walletAddress, campaignId);
      setTxStatus("Funds withdrawn!");
      await loadCampaignDetails(campaignId);
      await loadCampaigns();
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    }
  }, [walletAddress, selectedCampaign, campaigns, loadCampaignDetails, loadCampaigns]);

  const handleClaimRefund = useCallback(async () => {
    if (!walletAddress || !selectedCampaign) return;
    
    setError(null);
    setTxStatus("Awaiting signature...");
    try {
      const campaignId = campaigns.find(c => c.campaign === selectedCampaign)?.id;
      if (!campaignId) throw new Error("Campaign not found");
      await claimRefund(walletAddress, campaignId);
      setTxStatus("Refund claimed!");
      await loadCampaignDetails(campaignId);
      await loadCampaigns();
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    }
  }, [walletAddress, selectedCampaign, campaigns, loadCampaignDetails, loadCampaigns]);

  const isDeadlinePassed = selectedCampaign ? Date.now() / 1000 > selectedCampaign.deadline : false;
  const isGoalReached = selectedCampaign ? Number(selectedCampaign.raised) / 1e7 >= Number(selectedCampaign.goal) / 1e7 : false;
  const canWithdraw = walletAddress && selectedCampaign?.creator === walletAddress && isDeadlinePassed && isGoalReached && !selectedCampaign.withdrawn;
  const canClaimRefund = walletAddress && isDeadlinePassed && !isGoalReached && userDonation && parseFloat(userDonation) > 0;

  const formatTimeLeft = (deadline: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = deadline - now;
    if (diff <= 0) return "Ended";
    const days = Math.floor(diff / (24 * 60 * 60));
    const hours = Math.floor((diff % (24 * 60 * 60)) / (60 * 60));
    if (days > 0) return `${days}d ${hours}h left`;
    const mins = Math.floor((diff % (60 * 60)) / 60);
    return `${hours}h ${mins}m left`;
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "browse", label: "Browse", icon: <FireIcon />, color: "#fbbf24" },
    { key: "create", label: "Create", icon: <PlusIcon />, color: "#34d399" },
    { key: "donate", label: "Donate", icon: <HeartIcon />, color: "#7c6cf0" },
  ];

  return (
    <div className="w-full max-w-2xl animate-fade-in-up-delayed">
      {/* Toasts */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#f87171]/15 bg-[#f87171]/[0.05] px-4 py-3 backdrop-blur-sm animate-slide-down">
          <span className="mt-0.5 text-[#f87171]"><AlertIcon /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#f87171]/90">Error</p>
            <p className="text-xs text-[#f87171]/50 mt-0.5 break-all">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="shrink-0 text-[#f87171]/30 hover:text-[#f87171]/70 text-lg leading-none">&times;</button>
        </div>
      )}

      {txStatus && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#34d399]/15 bg-[#34d399]/[0.05] px-4 py-3 backdrop-blur-sm shadow-[0_0_30px_rgba(52,211,153,0.05)] animate-slide-down">
          <span className="text-[#34d399]">
            {txStatus.includes("on-chain") || txStatus.includes("recorded") || txStatus.includes("created") ? <CheckIcon /> : <SpinnerIcon />}
          </span>
          <span className="text-sm text-[#34d399]/90">{txStatus}</span>
        </div>
      )}

      {/* Main Card */}
      <Spotlight className="rounded-2xl">
        <AnimatedCard className="p-0" containerClassName="rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c6cf0]/20 to-[#fbbf24]/20 border border-white/[0.06]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#fbbf24]">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/90">Crowdfunding dApp</h3>
                <p className="text-[10px] text-white/25 font-mono mt-0.5">{truncate(CONTRACT_ADDRESS)}</p>
              </div>
            </div>
            <Badge variant="info" className="text-[10px]">Soroban</Badge>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.06] px-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setError(null); setSelectedCampaign(null); }}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all",
                  activeTab === t.key ? "text-white/90" : "text-white/35 hover:text-white/55"
                )}
              >
                <span style={activeTab === t.key ? { color: t.color } : undefined}>{t.icon}</span>
                {t.label}
                {activeTab === t.key && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full transition-all"
                    style={{ background: `linear-gradient(to right, ${t.color}, ${t.color}66)` }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Browse */}
            {activeTab === "browse" && !selectedCampaign && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-white/35">Active Campaigns</p>
                  <button onClick={loadCampaigns} className="text-xs text-[#7c6cf0] hover:text-[#7c6cf0]/80 flex items-center gap-1">
                    <RefreshIcon /> Refresh
                  </button>
                </div>

                {isLoadingCampaigns ? (
                  <div className="flex items-center justify-center py-8">
                    <SpinnerIcon />
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className="text-center py-8 text-white/35 text-sm">
                    No campaigns yet. Be the first to create one!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {campaigns.map(({ id, campaign }) => (
                      <button
                        key={id}
                        onClick={() => loadCampaignDetails(id)}
                        className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left hover:border-white/[0.12] transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-sm font-medium text-white/90">{campaign.title}</h4>
                          <Badge variant={isDeadlinePassed ? "warning" : "info"}>
                            <ClockIcon />
                            {formatTimeLeft(campaign.deadline)}
                          </Badge>
                        </div>
                        <p className="text-xs text-white/35 line-clamp-1 mb-3">{campaign.description}</p>
                        <ProgressBar raised={campaign.raised} goal={campaign.goal} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Campaign Detail */}
            {activeTab === "browse" && selectedCampaign && (
              <div className="space-y-5">
                <button onClick={() => setSelectedCampaign(null)} className="text-xs text-white/35 hover:text-white/70 flex items-center gap-1">
                  ← Back to campaigns
                </button>

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-4">
                  <div>
                    <h4 className="text-lg font-semibold text-white/90">{selectedCampaign.title}</h4>
                    <p className="text-sm text-white/50 mt-1">{selectedCampaign.description}</p>
                  </div>

                  <ProgressBar raised={selectedCampaign.raised} goal={selectedCampaign.goal} />

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-white/25">Creator</span>
                      <p className="text-white/70 font-mono">{truncate(selectedCampaign.creator)}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-white/25">Status</span>
                      <p className={cn(
                        "font-medium",
                        selectedCampaign.withdrawn ? "text-[#34d399]" :
                        isDeadlinePassed ? (isGoalReached ? "text-[#fbbf24]" : "text-[#f87171]") : "text-[#4fc3f7]"
                      )}>
                        {selectedCampaign.withdrawn ? "Withdrawn" :
                         isDeadlinePassed ? (isGoalReached ? "Successful" : "Failed") : "Active"}
                      </p>
                    </div>
                  </div>

                  {userDonation && parseFloat(userDonation) > 0 && (
                    <div className="pt-2 border-t border-white/[0.06]">
                      <span className="text-xs text-white/25">Your donation: </span>
                      <span className="text-xs text-[#34d399] font-medium">{userDonation} XLM</span>
                    </div>
                  )}
                </div>

                {walletAddress ? (
                  <div className="space-y-3">
                    {canWithdraw && (
                      <ShimmerButton onClick={handleWithdraw} shimmerColor="#fbbf24" className="w-full">
                        <WalletIcon /> Withdraw Funds
                      </ShimmerButton>
                    )}
                    {canClaimRefund && (
                      <ShimmerButton onClick={handleClaimRefund} shimmerColor="#f87171" className="w-full">
                        <RefreshIcon /> Claim Refund
                      </ShimmerButton>
                    )}
                    {!isDeadlinePassed && !walletAddress && (
                      <ShimmerButton onClick={() => setActiveTab("donate")} shimmerColor="#7c6cf0" className="w-full">
                        <HeartIcon /> Donate to this Campaign
                      </ShimmerButton>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#7c6cf0]/20 bg-[#7c6cf0]/[0.03] py-4 text-sm text-[#7c6cf0]/60 hover:border-[#7c6cf0]/30 hover:text-[#7c6cf0]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to donate or withdraw
                  </button>
                )}
              </div>
            )}

            {/* Create */}
            {activeTab === "create" && (
              <div className="space-y-5">
                <p className="text-xs text-white/35">Create a new crowdfunding campaign</p>
                <Input label="Campaign Title" value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} placeholder="e.g. Build a School" />
                <Input label="Description" value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} placeholder="Describe your campaign..." />
                <Input label="Goal (XLM)" value={createGoal} onChange={(e) => setCreateGoal(e.target.value)} placeholder="e.g. 1000" type="number" />
                <Input label="Duration (days)" value={createDays} onChange={(e) => setCreateDays(e.target.value)} placeholder="7" type="number" />

                {walletAddress ? (
                  <ShimmerButton onClick={handleCreateCampaign} disabled={isCreating} shimmerColor="#34d399" className="w-full">
                    {isCreating ? <><SpinnerIcon /> Creating...</> : <><PlusIcon /> Create Campaign</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#34d399]/20 bg-[#34d399]/[0.03] py-4 text-sm text-[#34d399]/60 hover:border-[#34d399]/30 hover:text-[#34d399]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to create campaign
                  </button>
                )}
              </div>
            )}

            {/* Donate */}
            {activeTab === "donate" && (
              <div className="space-y-5">
                <p className="text-xs text-white/35">Select a campaign above to donate</p>
                {!selectedCampaign ? (
                  <div className="text-center py-8 text-white/35 text-sm">
                    Browse campaigns and select one to donate
                  </div>
                ) : isDeadlinePassed ? (
                  <div className="text-center py-8 text-[#f87171]/70 text-sm">
                    This campaign has ended
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <p className="text-xs text-white/25 mb-1">Donating to</p>
                      <p className="text-sm font-medium text-white/90">{selectedCampaign.title}</p>
                    </div>
                    <Input label="Amount (XLM)" value={donateAmount} onChange={(e) => setDonateAmount(e.target.value)} placeholder="e.g. 50" type="number" />
                  </>
                )}

                {walletAddress && selectedCampaign && !isDeadlinePassed ? (
                  <ShimmerButton onClick={handleDonate} disabled={isDonating} shimmerColor="#7c6cf0" className="w-full">
                    {isDonating ? <><SpinnerIcon /> Donating...</> : <><HeartIcon /> Donate</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#7c6cf0]/20 bg-[#7c6cf0]/[0.03] py-4 text-sm text-[#7c6cf0]/60 hover:border-[#7c6cf0]/30 hover:text-[#7c6cf0]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to donate
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.04] px-6 py-3 flex items-center justify-between">
            <p className="text-[10px] text-white/15">Crowdfunding &middot; Soroban</p>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-[#4fc3f7]" />
                <span className="font-mono text-[9px] text-white/15">Active</span>
              </span>
              <span className="text-white/10 text-[8px]">&rarr;</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-[#fbbf24]" />
                <span className="font-mono text-[9px] text-white/15">Ended</span>
              </span>
              <span className="text-white/10 text-[8px]">&rarr;</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-[#34d399]" />
                <span className="font-mono text-[9px] text-white/15">Withdrawn</span>
              </span>
            </div>
          </div>
        </AnimatedCard>
      </Spotlight>
    </div>
  );
}
