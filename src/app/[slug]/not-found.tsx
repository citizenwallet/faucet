"use client";

export default function NotFound({ slug }: { slug: string }) {
  return (
    <div className="flex flex-col h-screen w-screen items-center justify-start p-4">
      <h1 className="text-2xl font-bold mb-8">This faucet does not exist</h1>
      <p className="text-sm text-gray-500 mb-8">
        Make your own faucet for {slug} soon...
      </p>
    </div>
  );
}
