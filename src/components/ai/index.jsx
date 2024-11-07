"use client";
import { useState, useEffect } from "react";
import CustomChatbot from "./custom-chatbot";
import SignaturePopup from "./signature-popup";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
// import TransactionDetailsPopup from './transaction-details-popup';
import { useAccount, useWallets } from "@particle-network/connectkit";
import { isEVMChain, step } from "@particle-network/connectkit/chains";
import Header from "../Header";

import "./ai.css";

import {
  buildMultichainReadonlyClient,
  buildRpcInfo,
  initKlaster,
  klasterNodeHost,
  loadBicoV2Account,
} from "klaster-sdk";

import { createWalletClient, custom, http } from "viem";
import { bootStrapKlaster, buildTransaction, convertActionsToKlasterRawSteps } from "@/lib/klaster";

export default function AIChat({ isDarkMode=false }) {

  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState("");
  const [isSignaturePopupOpen, setIsSignaturePopupOpen] = useState(false);
  const [isTransactionDetailsOpen, setIsTransactionDetailsOpen] =
    useState(false);
  const [transactionDetails, setTransactionDetails] = useState({});
  const [lastApiRequest, setLastApiRequest] = useState(null);
  const [lastApiResponse, setLastApiResponse] = useState(null);
  const [currentTxData, setCurrentTxData] = useState(null);
  const [bundleTx, setBundleTx] = useState(null);
  const [isBatching, setIsBatching] = useState(false);
  const [storedActions, setStoredActions] = useState([]);

  const [primaryWallet] = useWallets();
  const { chain, address, chainId, isConnected } = useAccount();

  const previewButtons = [
    {
      text: "Swap 10.0 USDC to ETH",
      action: () => handleSubmit("Swap 10.0 USDC to ETH"),
    },
    {
      text: "Send 0.1 ETH to the following address: 0xc6f2Fe91df8548DcAfBEA0076d138b947ED58a4a",
      action: () =>
        handleSubmit(
          "Send 0.1 ETH to the following address: 0xc6f2Fe91df8548DcAfBEA0076d138b947ED58a4a"
        ),
    },
    {
      text: "Bridge 0.1 ETH to Polygon at: 0xC4b4F09Af695F5a329a4DBb5BB57C64258b042EB",
      action: () =>
        handleSubmit(
          "Bridge 0.1 ETH to my Polygon address: 0xC4b4F09Af695F5a329a4DBb5BB57C64258b042EB"
        ),
    },
  ];

  const handleSignatureRequest = async (txData) => {
    setCurrentTxData(txData);
    setIsSignaturePopupOpen(true);
    return txData
  };

  const handleSign = async () => {
    if (!currentTxData) {
      console.error("No transaction data available");
      return;
    }

    const chain = chainId?.toString();

    try {
      const wallet = await primaryWallet.getWalletClient();
      const { to, data, from, value } = currentTxData;

      // Include the chain information from lastApiRequest
      // const chain = (await primaryWallet.connector.getNetwork()).toString();
      console.log("chain", chain, chainId, data, from, value);
      const txHash = await wallet.sendTransaction({
        to: to,
        data,
        from,
        value,
        // chain: "1" as any,
        account: address ,
        gas
      });

      console.log("Transaction sent:", txHash);
      // You might want to update the UI to show the transaction was sent successfully
      setIsSignaturePopupOpen(false);
    } catch (error) {
      console.error("Error signing transaction:", error);
      // Handle the error (e.g., show an error message to the user)
    }
  };

  const handleSubmit = async (message) => {



    // const EOAprovider = await primaryWallet.connector.getProvider();
    // console.log(EOAprovider)
    const chain = chainId?.toString();
    const requestBody = {
      query: message,
      account: address,
      chain: chain,
    };
    setLastApiRequest(requestBody);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "An error occurred while processing your request."
        );
      }

      setLastApiResponse(data);
      // Store the actions and bundleTx
      setStoredActions(data.actions);
      setBundleTx(data.bundleTx); // Assuming the API returns a bundleTx object
      // Return both the message and actions
      return { message: data.message, actions: data.actions };
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  };

  const handleViewTransaction = (txData) => {
    setTransactionDetails(txData);
    setIsTransactionDetailsOpen(true);
  };


  useEffect(() => {
    console.log(isConnected, chain, chainId, address)

    if (isConnected && chain && isEVMChain(chain)) {
      setIsLoading(false);
      // testConnection().then((e)=>{console.log(e, "Worked")})

      console.log("Request - ", chain, chainId)
    }
  }, [isConnected, chain, chain]);

  function clearResult() {
    setResult("");
  }

  
   

  const callBatchingEndpoint = async () => {
    if (!bundleTx) {
      console.error("No bundle transaction data available");
      return;
    }

    setIsBatching(true);

    try {
      const chain = chainId?.toString();
      const wallet = await primaryWallet.getWalletClient();
      const { to, data, from, value } = bundleTx;

      console.log("Sending bundle transaction:", { to, data, from, value, chain });

      const txHash = await wallet.sendTransaction({
        to: to,
        data,
        from,
        value,
        chain: chain,
        account: address
      });

      console.log("Bundle transaction sent:", txHash);
      // You might want to update the UI to show the transaction was sent successfully
      // For example:
      // setTransactionStatus('Bundle transaction sent successfully');
      // setTransactionHash(txHash);

      // Clear the stored actions and bundleTx after successful transaction
      setStoredActions([]);
      setBundleTx(null);
    } catch (error) {
      console.error("Error signing bundle transaction:", error);
      // Handle the error (e.g., show an error message to the user)
      // setTransactionStatus('Error sending bundle transaction: ' + error.message);
    } finally {
      setIsBatching(false);
    }
  };

  const calliTxEndpoint = async () => {
    if (!storedActions) {
      console.error("No actions transaction data available");
      return;
    }

    // setIsBatching(true);

    try {
      const chain = chainId?.toString();

      let provider = await primaryWallet.connector.getProvider()

      const { klaster, klasterSigner, address} = await bootStrapKlaster(provider)

      const steps = convertActionsToKlasterRawSteps(storedActions, chain)
      console.log("steps",steps);


      const itx  = await buildTransaction(provider, steps)
      console.log("iTx",itx);


      const quote = await klaster.getQuote(itx);

      console.log("Sending quote transaction:", JSON.stringify(quote));



      const signed = await klasterSigner.signMessage({
        message: {
          raw: quote.itxHash,
        },
        account:address,
      });

      console.log("Sending bundle transaction:",signed);


      const result = await klaster.execute(quote, signed)



      // const txHash = await wallet.signMessage({
      //   to: to,
      //   data,
      //   from,
      //   value,
      //   chain: chain,
      //   account: address
      // });

      console.log("Bundle transaction sent:", result);
      // You might want to update the UI to show the transaction was sent successfully
      // For example:
      // setTransactionstatus('Bundle transaction sent successfully');
      // setTransactionHash(txHash);

      // Clear the stored actions and bundleTx after successful transaction
      setStoredActions([]);
      setBundleTx(null);
    } catch (error) {
      console.error("Error signing bundle transaction:", error);
      // Handle the error (e.g., show an error message to the user)
      // setTransactionStatus('Error sending bundle transaction: ' + error.message);
    } finally {
      setIsBatching(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {!isLoading && (
        <>
          <Header />
          <div
            className="dynamic-methods pt-16 px-4"
            // data-theme={isDarkMode ? "dark" : "light"}
          >
            <div className="methods-container max-w-4xl mx-auto">
              {chain && isEVMChain(chain) && (
                <div className="h-full">
                  <CustomChatbot
                    previewButtons={previewButtons}
                    onSubmit={handleSubmit}
                    onSignatureRequest={handleSignatureRequest}
                    onViewTransaction={handleViewTransaction}
                    onBundleSigning={callBatchingEndpoint}
                    oniTxSigning={calliTxEndpoint}
                  />
                  <SignaturePopup
                    isOpen={isSignaturePopupOpen}
                    onClose={() => setIsSignaturePopupOpen(false)}
                    onSign={handleSign}
                  />
                  <TransactionDetailsPopup
                    isOpen={isTransactionDetailsOpen}
                    onClose={() => setIsTransactionDetailsOpen(false)}
                    details={transactionDetails}
                  />
                </div>
              )}
            </div>
            {result && (
              <div className="results-container">
                <pre className="results-text">{result}</pre>
              </div>
            )}
            {result && (
              <div className="clear-container">
                <button className="btn btn-primary" onClick={clearResult}>
                  Clear
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function TransactionDetailsPopup({ isOpen, onClose, details }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
          <DialogDescription>
            Details of the current transaction
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="mt-4 h-[300px] w-full rounded-md border p-4">
          {Object.entries(details).map(([key, value]) => (
            <div key={key} className="mb-2">
              <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong>{" "}
              {JSON.stringify(value)}
            </div>
          ))}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
