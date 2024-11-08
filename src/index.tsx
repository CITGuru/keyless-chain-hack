"use client";

import { useAccount } from "@particle-network/connectkit";
import { isEVMChain } from "@particle-network/connectkit/chains";
import AIChat from "./components/ai";
import styles from "./index.module.css";
import { useEffect, useState } from "react";
import { ConnectButton } from "@particle-network/connectkit";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";

const checkIsDarkSchemePreferred = () => {
  if (typeof window !== "undefined") {
    return window.matchMedia?.("(prefers-color-scheme:dark)")?.matches ?? false;
  }
  return false;
};

export default function Index() {
  const { isConnected, chain } = useAccount();
  const [isDarkMode, setIsDarkMode] = useState(checkIsDarkSchemePreferred);

  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setIsDarkMode(checkIsDarkSchemePreferred());

    darkModeMediaQuery.addEventListener("change", handleChange);
    return () => darkModeMediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    <main className={styles["main-content"]}>
      {isConnected && chain && isEVMChain(chain) ? (
        <AIChat />
      ) : (
        <div className="flex items-center justify-center min-h-screen">
          <Card className="w-[400px] text-center">
            <CardHeader>
              <CardTitle className="text-4xl font-bold mb-2">Keyless</CardTitle>
              <CardDescription className="text-lg">
                Natural language wallet management
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-8">
              {/* Optional: Add any additional content here */}
            </CardContent>
            <CardFooter className="flex justify-center">
              <ConnectButton label="Login or connect wallet" />
            </CardFooter>
          </Card>
        </div>
      )}
    </main>
  );
}
