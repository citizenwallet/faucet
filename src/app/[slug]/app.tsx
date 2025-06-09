"use client";

import { Store } from "@/components/store";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function App({ alias, slug }: { alias: string; slug: string }) {
  const router = useRouter();
  const [isInstalled, setIsInstalled] = useState(false);
  const [opening, setOpening] = useState(false);

  const refreshPage = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  useEffect(() => {
    try {
      setTimeout(() => {
        setOpening(false);
      }, 250);

      setOpening(true);
      const url = encodeURIComponent(
        `https://faucet.citizenwallet.xyz/${slug}`
      );
      router.replace(
        `citizenwallet://#/${alias}/?alias=${alias}&dl=plugin&plugin=${url}`
      );

      setIsInstalled(true);
    } catch (error) {
      console.error(error);
      setIsInstalled(false);
    }
  }, [router, alias, slug]);

  return (
    <div className="flex flex-col h-screen w-screen items-center justify-start p-4">
      <h1 className="text-2xl font-bold mb-8">Open in Citizen Wallet 📱</h1>
      {!isInstalled && (
        <div className="flex row gap-10 justify-center">
          <Store
            label="App Store"
            link="https://apps.apple.com/us/app/citizen-wallet/id6460822891"
            image="/app_store.svg"
            alt="App Store icon"
            size={120}
          />

          <div className="space"></div>

          <Store
            label="Play Store"
            link="https://play.google.com/store/apps/details?id=xyz.citizenwallet.wallet"
            image="/play_store.svg"
            alt="Play Store icon"
            size={120}
          />
        </div>
      )}
      {!opening && !isInstalled && (
        <div className="my-2 text-center mt-8">
          <p>Already have the app?</p>
        </div>
      )}

      {!isInstalled && (
        <Button className="mb-10" onClick={refreshPage} disabled={opening}>
          {opening ? (
            <Loader2 className="w-4 h-4 animate-spin ml-2" />
          ) : (
            "Open in App"
          )}
        </Button>
      )}
    </div>
  );
}
