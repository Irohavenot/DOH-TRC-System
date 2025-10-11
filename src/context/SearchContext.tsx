import React, { createContext, useContext, useState, useMemo } from "react";
import useDebounce from "../hooks/useDebounce";

type SearchContextType = {
  query: string;
  setQuery: (q: string) => void;
  debouncedQuery: string;
};

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 250); // 250ms debounce for UX

  const value = useMemo(() => ({ query, setQuery, debouncedQuery }), [query, debouncedQuery]);

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
};

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within SearchProvider");
  return ctx;
}
