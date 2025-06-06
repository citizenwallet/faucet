"use client";

import { QRCodeSVG } from "qrcode.react";
import { Faucet } from "@/db/faucets";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrencyNumber } from "@/lib/currency";

const MAX_WIDTH = 448;

export default function QR({
  loading,
  error,
  faucet,
  currencyLogo,
  symbol,
  decimals,
}: {
  loading?: boolean;
  error?: string;
  faucet?: Faucet;
  currencyLogo?: string;
  symbol?: string;
  decimals?: number;
}) {
  const url = new URL(window.location.href);

  const containerRef = useRef<HTMLDivElement>(null);

  const [size, setSize] = useState(0);

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
      <div className="flex flex-col items-center justify-center gap-2 p-4 m-4 rounded-lg border border-gray-200">
        {!ready ? (
          <Skeleton style={{ height: qrSize, width: qrSize }} />
        ) : (
          <QRCodeSVG
            value={`${url.origin}/${faucet?.slug}/redeem`}
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
      <p className="text-lg text-gray-500 mb-4">
        You will receive: {formatCurrencyNumber(faucet?.amount ?? 0, decimals)}{" "}
        {symbol}
      </p>
      <p className="text-sm text-gray-500">{frequencyText}</p>
    </div>
  );
}
