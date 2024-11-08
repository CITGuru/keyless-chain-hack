import { useDisconnect } from "@particle-network/connectkit";

export default function Header() {
  const { disconnect } = useDisconnect();
  
  return (
    <header className="fixed top-0 right-0 w-full p-4 flex justify-between items-center bg-background/80 backdrop-blur-sm z-50">
      <div className="text-xl font-bold">keyless</div>
      <button 
        onClick={() => disconnect()}
        className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
      >
        Disconnect
      </button>
    </header>
  );
}