"use client";

import { QRCodeSVG } from "qrcode.react";
import { Faucet } from "@/db/faucets";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrencyNumber } from "@/lib/currency";
import { CommunityConfig, Config, getAccountBalance } from "@citizenwallet/sdk";

const MAX_WIDTH = 448;

export default function QR({
  config,
  faucetAccount,
  loading,
  error,
  faucet,
  currencyLogo,
  symbol,
  decimals,
  balance: initialBalance,
}: {
  config?: Config;
  faucetAccount?: string;
  loading?: boolean;
  error?: string;
  faucet?: Faucet;
  currencyLogo?: string;
  symbol?: string;
  decimals?: number;
  balance?: string;
}) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const url = new URL(
    typeof window !== "undefined" ? window.location.href : ""
  );

  const containerRef = useRef<HTMLDivElement>(null);

  const [size, setSize] = useState(0);
  const [balance, setBalance] = useState(initialBalance);

  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      if (!config || !faucetAccount) {
        return;
      }

      const community = new CommunityConfig(config);
      const token = community.primaryToken;

      const balance = await getAccountBalance(community, faucetAccount);
      const formattedBalance = formatCurrencyNumber(
        Number(balance),
        token.decimals
      );

      setBalance(formattedBalance);
    }, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [config, faucetAccount]);

  useEffect(() => {
    setTimeout(() => {
      const width = containerRef.current?.clientWidth ?? 150;
      setSize(width >= MAX_WIDTH ? MAX_WIDTH : width);
    }, 250);
  }, []);

  const qrSize = (MAX_WIDTH || size) * 0.8;

  const ready = !loading && !error;

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
      {!ready ? (
        <Skeleton className="h-[24px] w-[200px]" />
      ) : (
        <h1 className="text-2xl font-bold">{faucet?.title}</h1>
      )}
      {!ready ? (
        <Skeleton className="h-[24px] w-[200px]" />
      ) : (
        <p className="text-sm text-gray-500">{faucet?.description}</p>
      )}
      {!ready ? (
        <Skeleton className="h-[24px] w-[200px] mt-8" />
      ) : (
        <h1 className="text-2xl font-bold mt-8">Scan with Citizen Wallet 📱</h1>
      )}
      <div className="flex flex-col items-center justify-center gap-2 p-4 m-4 mt-8 rounded-lg border border-gray-200">
        {!ready ? (
          <Skeleton style={{ height: qrSize, width: qrSize }} />
        ) : (
          <QRCodeSVG
            value={`${url.origin}/${faucet?.slug}`}
            size={qrSize}
            fgColor="#0c0c0c"
            bgColor="#ffffff"
            className="animate-fade-in"
            imageSettings={
              currencyLogo
                ? {
                    src: currencyLogo,
                    height: size * 0.1,
                    width: size * 0.1,
                    excavate: true,
                  }
                : undefined
            }
          />
        )}
      </div>
      {!ready ? (
        <Skeleton className="h-[24px] w-[200px] mb-8" />
      ) : (
        <h2 className="text-lg font-bold mb-8">
          Faucet balance: {balance} {symbol}
        </h2>
      )}
      <p className="text-lg text-gray-500 mb-4">
        You will receive {formatCurrencyNumber(faucet?.amount ?? 0, decimals)}{" "}
        {symbol}
      </p>
      <p className="text-sm text-gray-500">{frequencyText}</p>
    </div>
  );
}
