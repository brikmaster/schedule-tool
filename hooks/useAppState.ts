import { useContext } from "react";
import { AppContext } from "@/contexts/AppContext";

export function useAppState() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useAppState must be used within AppProvider");
  }

  return context;
}
