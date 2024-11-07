"use client";

import { useAccount } from "@particle-network/connectkit";
import { isEVMChain } from "@particle-network/connectkit/chains";
import AIChat from "./components/ai";
import styles from "./index.module.css";
import { useEffect, useState } from "react";

import { ConnectButton, useDisconnect } from "@particle-network/connectkit";

const checkIsDarkSchemePreferred = () => {
  if (typeof window !== "undefined") {
    return window.matchMedia?.("(prefers-color-scheme:dark)")?.matches ?? false;
  }
  return false;
};

export default function Index() {
  const { isConnected, chain } = useAccount();
//   const { disconnect } = useDisconnect();
  const [isDarkMode, setIsDarkMode] = useState(checkIsDarkSchemePreferred);

  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );
    const handleChange = () => setIsDarkMode(checkIsDarkSchemePreferred());

    darkModeMediaQuery.addEventListener("change", handleChange);
    return () => darkModeMediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    <>
      {/* <Header /> */}
      <main className={styles["main-content"]}>
        {isConnected && chain && isEVMChain(chain) ? (
          <>
            {/* <button onClick={()=>{ disconnect() }}>Disconnect</button> */}

            <AIChat  />
          </>
        ) : (
          <ConnectButton label="Login or connect wallet" />
        )}
      </main>
    </>
  );
}
