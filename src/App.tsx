import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import { useActivities } from "@/hooks/useActivities";
import { useClients } from "@/hooks/useClients";
import { useTimers } from "@/hooks/useTimers";

const queryClient = new QueryClient();


const App = () => {
  // Mover hooks para cá para evitar loops de atualização
  const activitiesHook = useActivities();
  const clientsHook = useClients();
  const timersHook = useTimers();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Index 
              activitiesHook={activitiesHook}
              clientsHook={clientsHook}
              timersHook={timersHook}
            />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
