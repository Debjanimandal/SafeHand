"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import { useApp } from "@/lib/context";
import {
  getSafeHandProvider,
  queryOnChainRegistry,
  PROOFLY_REGISTRY_ADDRESS,
  EIP1193Provider,
} from "@/lib/proofly";

function StatusBadge({
  label,
  hash,
  onChain = false,
  delay = 0,
}: {
  label: string;
  hash: string;
  onChain?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      className="border border-white/10 bg-white/[0.02] p-5 space-y-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-white/40 uppercase tracking-widest">{label}</span>
        <motion.div
          className={`flex items-center gap-1.5 border px-2 py-1 ${
            onChain ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-white/20 text-white"
          }`}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: delay + 0.2 }}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${onChain ? "bg-emerald-400" : "bg-white"} animate-pulse`} />
          <span className="font-mono text-[10px] font-bold">
            {onChain ? "ON-CHAIN VERIFIED" : "PROOF SIGNED"}
          </span>
        </motion.div>
      </div>
      <div className="space-y-1">
        <p className="font-mono text-[10px] text-white/30 uppercase tracking-wider">Verification Hash</p>
        <p className="font-mono text-[10px] text-white/70 break-all leading-5">
          {hash ? `${hash.slice(0, 34)}…` : "Pending"}
        </p>
      </div>
    </motion.div>
  );
}

function StatCard({ value, label, delay = 0 }: { value: string; label: string; delay?: number }) {
  return (
    <motion.div
      className="border border-white/[0.08] p-5 space-y-1"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <p className="font-mono text-2xl font-bold text-white">{value}</p>
      <p className="font-mono text-xs text-white/30 uppercase tracking-wider">{label}</p>
    </motion.div>
  );
}

type AgentTestState = "idle" | "running" | "success" | "blocked" | "error";

interface AgentResult {
  action: string;
  status: AgentTestState;
  message: string;
  txHash?: string;
  reason?: string;
  blockedBeforeSigning?: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const { walletAddr, walletHash, ageHash, idHash, disconnect } = useApp();
  const [loading, setLoading] = useState(true);
  const [onChainStatus, setOnChainStatus] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"overview" | "agent_console">("agent_console");

  // Agent action state
  const [agentState, setAgentState] = useState<AgentTestState>("idle");
  const [agentResult, setAgentResult] = useState<AgentResult | null>(null);

  useEffect(() => {
    if (!walletAddr) {
      router.replace("/");
      return;
    }

    void (async () => {
      const verified = await queryOnChainRegistry(walletAddr);
      setOnChainStatus(verified);
      setLoading(false);
    })();
  }, [walletAddr, router]);

  async function executeAgentAction(type: "allowed" | "overlimit" | "unapproved_target") {
    setAgentState("running");
    setAgentResult(null);

    const provider: EIP1193Provider | null = await getSafeHandProvider(1500);
    if (!provider) {
      setAgentState("error");
      setAgentResult({
        action: type,
        status: "error",
        message: "SafeHand Provider not detected. Please ensure the extension is active.",
      });
      return;
    }

    try {
      if (type === "allowed") {
        // 0.0001 ETH (~$0.30) to allowed ProoflyRegistry contract
        const txParams = {
          from: walletAddr,
          to: PROOFLY_REGISTRY_ADDRESS,
          value: "0x38d7ea4c68000", // 0.0001 ETH
        };

        const txHash = (await provider.request({
          method: "eth_sendTransaction",
          params: [txParams],
        })) as string;

        setAgentState("success");
        setAgentResult({
          action: "Permitted Agent Action (Within Policy Limits)",
          status: "success",
          message: "Transaction permitted by policy and successfully broadcasted to Base Sepolia!",
          txHash,
          blockedBeforeSigning: false,
        });
      } else if (type === "overlimit") {
        // 0.1 ETH (~$300 > $50 default policy limit) to allowed contract
        const txParams = {
          from: walletAddr,
          to: PROOFLY_REGISTRY_ADDRESS,
          value: "0x16345785d8a0000", // 0.1 ETH (~$300)
        };

        const txHash = (await provider.request({
          method: "eth_sendTransaction",
          params: [txParams],
        })) as string;

        // If it unexpectedly passed
        setAgentState("success");
        setAgentResult({
          action: "Over-limit Action",
          status: "success",
          message: "Transaction submitted.",
          txHash,
        });
      } else if (type === "unapproved_target") {
        // 0.0001 ETH to unapproved target address
        const txParams = {
          from: walletAddr,
          to: "0x0000000000000000000000000000000000000001",
          value: "0x38d7ea4c68000",
        };

        const txHash = (await provider.request({
          method: "eth_sendTransaction",
          params: [txParams],
        })) as string;

        setAgentState("success");
        setAgentResult({
          action: "Unapproved Destination Action",
          status: "success",
          message: "Transaction submitted.",
          txHash,
        });
      }
    } catch (err: unknown) {
      const error = err as { code?: number; message?: string };
      const msg = error?.message || "Transaction rejected";

      // Detect pre-signing policy denials
      const isPolicyDenial =
        msg.includes("exceeds policy") ||
        msg.includes("not in the allowed destinations") ||
        msg.includes("Policy expired") ||
        msg.includes("Policy has been revoked");

      if (isPolicyDenial) {
        setAgentState("blocked");
        setAgentResult({
          action:
            type === "overlimit"
              ? "Over-Limit Value ($300 > $50 cap)"
              : "Unapproved Destination (Not Whitelisted)",
          status: "blocked",
          message: msg,
          reason: msg,
          blockedBeforeSigning: true,
        });
      } else if (error?.code === 4001) {
        setAgentState("blocked");
        setAgentResult({
          action: "User Rejected",
          status: "blocked",
          message: "User declined transaction authorization in SafeHand.",
          blockedBeforeSigning: true,
        });
      } else {
        setAgentState("error");
        setAgentResult({
          action: type,
          status: "error",
          message: msg,
        });
      }
    }
  }

  const shortAddr = walletAddr ? `${walletAddr.slice(0, 8)}…${walletAddr.slice(-6)}` : "";

  return (
    <>
      <Navbar walletAddr={walletAddr} />
      <main className="min-h-screen px-4 pt-24 pb-12 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-8 space-y-1"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-xs text-white/50 uppercase tracking-widest">
              Live SafeHand-Bound Session · Base Sepolia
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">CivicVault Portal</h1>
              <p className="text-sm text-white/40 font-mono mt-1">{shortAddr}</p>
            </div>
            <div className="flex items-center gap-2 border border-white/10 p-1 bg-white/[0.02]">
              <button
                onClick={() => setActiveTab("agent_console")}
                className={`font-mono text-xs px-3 py-1.5 transition-colors ${
                  activeTab === "agent_console"
                    ? "bg-white text-black font-bold"
                    : "text-white/60 hover:text-white"
                }`}
              >
                AI Agent Leash Console
              </button>
              <button
                onClick={() => setActiveTab("overview")}
                className={`font-mono text-xs px-3 py-1.5 transition-colors ${
                  activeTab === "overview"
                    ? "bg-white text-black font-bold"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Session Overview
              </button>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton h-24" />
              ))}
            </div>
            <div className="skeleton h-56" />
          </div>
        ) : (
          <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {activeTab === "agent_console" ? (
              /* AI Agent Permitted Actions Testing Console */
              <div className="space-y-6">
                <div className="border border-white/20 bg-white/[0.02] p-6 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                        <h2 className="text-lg font-bold text-white font-mono">
                          SafeHand AI Leash Execution Console
                        </h2>
                      </div>
                      <p className="text-xs text-white/40 mt-1">
                        CivicVault acts as a relying dApp / AI Agent caller. Test pre-signing policy enforcement live on Base Sepolia.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href="http://localhost:3000/activity"
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost text-xs py-2 px-3 flex items-center gap-1.5"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        SafeHand Audit Log ↗
                      </a>
                    </div>
                  </div>

                  {/* Policy Guidelines reminder */}
                  <div className="border border-white/10 bg-black/40 p-4 font-mono text-xs text-white/70 space-y-2">
                    <p className="text-white/90 font-bold flex items-center gap-2">
                      <span>🛡️ Configured AI Leash Boundary (Extension &gt; Policy tab):</span>
                    </p>
                    <div className="grid sm:grid-cols-3 gap-2 text-[11px] text-white/60 pt-1">
                      <div>• Allowed Target: <span className="text-white/90">0x7c2e...F997</span></div>
                      <div>• Max Limit: <span className="text-white/90">$50 USD / tx</span></div>
                      <div>• Network: <span className="text-white/90">Base Sepolia (84532)</span></div>
                    </div>
                  </div>

                  {/* Test Action Buttons */}
                  <div className="grid md:grid-cols-3 gap-4 pt-2">
                    {/* Action 1: Allowed */}
                    <div className="border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-emerald-400">Action A</span>
                          <span className="font-mono text-[10px] text-emerald-400/70 border border-emerald-500/30 px-1.5 py-0.5">
                            ALLOW
                          </span>
                        </div>
                        <p className="font-mono text-xs text-white font-bold">0.0001 ETH (~$0.30)</p>
                        <p className="text-[11px] text-white/50">
                          Target: Whitelisted Registry. Value is well within $50 limit.
                        </p>
                      </div>
                      <button
                        disabled={agentState === "running"}
                        onClick={() => void executeAgentAction("allowed")}
                        className="btn-primary w-full text-xs py-2 bg-emerald-500 text-black hover:bg-emerald-400 font-bold"
                      >
                        {agentState === "running" ? "Evaluating…" : "Execute Permitted Tx"}
                      </button>
                    </div>

                    {/* Action 2: Over limit */}
                    <div className="border border-amber-500/30 bg-amber-500/5 p-4 space-y-3 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-amber-400">Action B</span>
                          <span className="font-mono text-[10px] text-amber-400/70 border border-amber-500/30 px-1.5 py-0.5">
                            BLOCK
                          </span>
                        </div>
                        <p className="font-mono text-xs text-white font-bold">0.1 ETH (~$300)</p>
                        <p className="text-[11px] text-white/50">
                          Target: Whitelisted. Exceeds configured $50 ceiling.
                        </p>
                      </div>
                      <button
                        disabled={agentState === "running"}
                        onClick={() => void executeAgentAction("overlimit")}
                        className="btn-ghost w-full text-xs py-2 border-amber-500/50 text-amber-300 hover:bg-amber-500/10 font-bold"
                      >
                        {agentState === "running" ? "Evaluating…" : "Test Over-Limit (Violation)"}
                      </button>
                    </div>

                    {/* Action 3: Unapproved destination */}
                    <div className="border border-red-500/30 bg-red-500/5 p-4 space-y-3 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-red-400">Action C</span>
                          <span className="font-mono text-[10px] text-red-400/70 border border-red-500/30 px-1.5 py-0.5">
                            BLOCK
                          </span>
                        </div>
                        <p className="font-mono text-xs text-white font-bold">Unapproved Target</p>
                        <p className="text-[11px] text-white/50">
                          Destination 0x000...001 is outside policy allowlist.
                        </p>
                      </div>
                      <button
                        disabled={agentState === "running"}
                        onClick={() => void executeAgentAction("unapproved_target")}
                        className="btn-ghost w-full text-xs py-2 border-red-500/50 text-red-300 hover:bg-red-500/10 font-bold"
                      >
                        {agentState === "running" ? "Evaluating…" : "Test Unapproved Target"}
                      </button>
                    </div>
                  </div>

                  {/* Execution Feedback Banner */}
                  <AnimatePresence>
                    {agentResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className={`mt-4 border p-4 space-y-2 font-mono ${
                          agentResult.status === "success"
                            ? "border-emerald-500/40 bg-emerald-500/10"
                            : agentResult.status === "blocked"
                            ? "border-amber-500/40 bg-amber-500/10"
                            : "border-red-500/40 bg-red-500/10"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-white">
                            {agentResult.action}
                          </span>
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 border ${
                              agentResult.status === "success"
                                ? "border-emerald-500 text-emerald-300"
                                : agentResult.status === "blocked"
                                ? "border-amber-500 text-amber-300"
                                : "border-red-500 text-red-300"
                            }`}
                          >
                            {agentResult.blockedBeforeSigning
                              ? "PRE-SIGNING DENIAL ✓"
                              : agentResult.status === "success"
                              ? "BROADCASTED ✓"
                              : "ERROR"}
                          </span>
                        </div>

                        <p className="text-xs text-white/80">{agentResult.message}</p>

                        {agentResult.txHash && (
                          <div className="pt-2 text-[11px] space-y-1">
                            <span className="text-white/40">BaseScan Sepolia Tx: </span>
                            <a
                              href={`https://sepolia.basescan.org/tx/${agentResult.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400 hover:underline break-all"
                            >
                              {agentResult.txHash} ↗
                            </a>
                          </div>
                        )}

                        {agentResult.blockedBeforeSigning && (
                          <div className="pt-1 text-[11px] text-white/50">
                            🔒 SafeHand Guarantee: Zero private keys were prompted and zero funds were broadcasted.
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : null}

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard value="Base Sepolia" label="Network (84532)" delay={0} />
              <StatCard
                value={onChainStatus ? "Verified" : "Active"}
                label="On-Chain Registry"
                delay={0.05}
              />
              <StatCard value="EIP-1193" label="Provider Spec" delay={0.1} />
              <StatCard value="Enforced" label="AI Leash Guard" delay={0.15} />
            </div>

            {/* Proof hashes */}
            <div className="grid md:grid-cols-3 gap-3">
              <StatusBadge label="Wallet Connection" hash={walletHash || walletAddr} delay={0.2} />
              <StatusBadge
                label="SafeHand Registry"
                hash={PROOFLY_REGISTRY_ADDRESS}
                onChain={onChainStatus}
                delay={0.3}
              />
              <StatusBadge
                label="Authority Signature"
                hash={idHash || ageHash || "Signed by SafeHand"}
                delay={0.4}
              />
            </div>

            {/* Wallet card & Sign Out */}
            <div className="border border-white/10 bg-white/[0.02] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="font-mono text-xs text-white/40 uppercase tracking-widest">
                  SafeHand Integrated Wallet
                </span>
                <p className="font-mono text-xs text-white break-all">{walletAddr}</p>
              </div>
              <button
                onClick={() => {
                  disconnect();
                  router.push("/");
                }}
                className="btn-ghost text-xs py-2 px-4 self-start md:self-auto"
              >
                Disconnect Session
              </button>
            </div>
          </motion.div>
        )}
      </main>
    </>
  );
}
