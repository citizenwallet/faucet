"use client";

import { Faucet } from "@/db/faucets";
import { useCallback, useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrencyNumber } from "@/lib/currency";
import { CheckCircle, CopyIcon, Loader2, XCircleIcon } from "lucide-react";

const MAX_WIDTH = 448;

export default function Redeem({
  loading,
  error,
  empty = false,
  faucetAccount,
  faucet,
  symbol,
  decimals,
  redirect,
}: {
  loading?: boolean;
  error?: string;
  empty?: boolean;
  faucet?: Faucet;
  faucetAccount?: string;
  currencyLogo?: string;
  symbol?: string;
  decimals?: number;
  redirect?: string;
}) {
  const redirectingRef = useRef(false);
  const readyRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [size, setSize] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!faucetAccount) {
      return;
    }
    navigator.clipboard.writeText(faucetAccount);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  useEffect(() => {
    setTimeout(() => {
      const width = containerRef.current?.clientWidth ?? 150;
      setSize(width >= MAX_WIDTH ? MAX_WIDTH : width);
    }, 250);
  }, []);

  const qrSize = (MAX_WIDTH || size) * 0.8;

  const ready = !loading && !error;

  const handleRedirect = useCallback(() => {
    if (redirect && !redirectingRef.current) {
      redirectingRef.current = true;
      setTimeout(() => {
        window.location.href = redirect;
      }, 2000);
    }
  }, [redirect]);

  useEffect(() => {
    if (ready && !readyRef.current) {
      readyRef.current = true;

      handleRedirect();
    }
  }, [ready, redirect, handleRedirect]);

  useEffect(() => {
    if (error) {
      handleRedirect();
    }
  }, [error, handleRedirect]);

  if (empty) {
    return (
      <div className="flex flex-col h-screen w-screen items-center justify-start p-4">
        <h1 className="text-2xl font-bold">Faucet is empty</h1>
        <p className="text-sm text-gray-500">
          The faucet is empty. Please try again later.
        </p>
        <div
          className="flex items-center justify-center gap-2 p-4 m-4 rounded-lg border border-gray-200 cursor-pointer"
          onClick={copied ? undefined : handleCopy}
        >
          <p className="text-md">Copy top up address for {symbol}</p>
          {copied ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <CopyIcon className="w-4 h-4" />
          )}
        </div>
      </div>
    );
  }

  let frequencyText = "Redeem as often as you want";
  if (faucet?.frequency === 0) {
    frequencyText = "Redeem once";
  } else if (faucet?.frequency === 86400) {
    frequencyText = "Redeem once per day";
  } else if (faucet?.frequency === 604800) {
    frequencyText = "Redeem once per week";
  }

  return (
    <div
      className="flex flex-col h-screen w-screen items-center justify-start p-4"
      ref={containerRef}
    >
      {loading ? (
        <Skeleton className="h-[24px] w-[200px]" />
      ) : (
        <h1 className="text-2xl font-bold">{error || faucet?.title}</h1>
      )}
      {loading ? (
        <Skeleton className="h-[24px] w-[200px]" />
      ) : (
        <p className="text-sm text-gray-500">{faucet?.description || "..."}</p>
      )}
      <div
        className="flex flex-col items-center justify-center gap-2 p-4 m-4 rounded-lg border border-gray-200"
        style={{ height: qrSize, width: qrSize }}
      >
        {loading ? (
          <Loader2 className="w-10 h-10 animate-spin" />
        ) : error ? (
          <XCircleIcon className="w-10 h-10" />
        ) : (
          <CheckCircle className="w-10 h-10 text-green-500" />
        )}
      </div>
      <p className="text-lg text-gray-500 mb-4">
        {loading ? "Redeeming: " : error ? "Unable to redeem" : "Redeemed: "}
        {error ? "" : formatCurrencyNumber(faucet?.amount ?? 0, decimals)}{" "}
        {error ? "" : symbol}
      </p>
      {!error && <p className="text-sm text-gray-500">{frequencyText}</p>}
    </div>
  );
}
