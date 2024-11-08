import { Button } from "@/components/ui/button";
import { MessageSquare, TrendingUp, Search, Settings } from "lucide-react";
import { useAccount } from "@particle-network/connectkit";

export default function Sidebar() {
  const { address } = useAccount();
  
  return (
    <div className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-background border-r p-4 flex flex-col">
      {/* Navigation Links */}
      <div className="flex-1 space-y-2">
        <Button 
          variant="default" 
          className="w-full justify-start" 
          size="lg"
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          Chat
        </Button>
        
        <Button 
          variant="ghost" 
          className="w-full justify-start" 
          size="lg"
        >
          <TrendingUp className="mr-2 h-4 w-4" />
          Trading Strategy
        </Button>
        
        <Button 
          variant="ghost" 
          className="w-full justify-start" 
          size="lg"
        >
          <Search className="mr-2 h-4 w-4" />
          Search
        </Button>
      </div>
      
      {/* Wallet Info & Settings */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm truncate">
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
          </div>
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}