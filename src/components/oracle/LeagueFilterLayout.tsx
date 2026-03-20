import { Outlet } from "react-router-dom";
import { LeagueFilterProvider } from "@/contexts/LeagueFilterContext";

export function LeagueFilterLayout() {
  return (
    <LeagueFilterProvider>
      <Outlet />
    </LeagueFilterProvider>
  );
}
