"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AppState {
  walletAddr: string;
  walletHash: string;
  ageHash: string;
  idHash: string;
  setWallet: (addr: string, hash: string) => void;
  setAgeProof: (hash: string) => void;
  setIdProof: (hash: string) => void;
  disconnect: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [walletAddr, setWalletAddr] = useState("");
  const [walletHash, setWalletHash] = useState("");
  const [ageHash, setAgeHash] = useState("");
  const [idHash, setIdHash] = useState("");

  useEffect(() => {
    try {
      const savedAddr = sessionStorage.getItem("civic_wallet_addr") || "";
      const savedWalletHash = sessionStorage.getItem("civic_wallet_hash") || "";
      const savedAgeHash = sessionStorage.getItem("civic_age_hash") || "";
      const savedIdHash = sessionStorage.getItem("civic_id_hash") || "";
      if (savedAddr) setWalletAddr(savedAddr);
      if (savedWalletHash) setWalletHash(savedWalletHash);
      if (savedAgeHash) setAgeHash(savedAgeHash);
      if (savedIdHash) setIdHash(savedIdHash);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const setWallet = (addr: string, hash: string) => {
    setWalletAddr(addr);
    setWalletHash(hash);
    try {
      sessionStorage.setItem("civic_wallet_addr", addr);
      sessionStorage.setItem("civic_wallet_hash", hash);
    } catch {}
  };

  const setAgeProof = (hash: string) => {
    setAgeHash(hash);
    try {
      sessionStorage.setItem("civic_age_hash", hash);
    } catch {}
  };

  const setIdProof = (hash: string) => {
    setIdHash(hash);
    try {
      sessionStorage.setItem("civic_id_hash", hash);
    } catch {}
  };

  const disconnect = () => {
    setWalletAddr("");
    setWalletHash("");
    setAgeHash("");
    setIdHash("");
    try {
      sessionStorage.removeItem("civic_wallet_addr");
      sessionStorage.removeItem("civic_wallet_hash");
      sessionStorage.removeItem("civic_age_hash");
      sessionStorage.removeItem("civic_id_hash");
    } catch {}
  };

  return (
    <Ctx.Provider
      value={{
        walletAddr,
        walletHash,
        ageHash,
        idHash,
        setWallet,
        setAgeProof,
        setIdProof,
        disconnect,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp must be inside AppProvider");
  return c;
}
