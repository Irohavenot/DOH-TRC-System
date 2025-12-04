import React, { createContext, useContext, useState } from "react";
import useDebounce from "../hooks/useDebounce";

interface SearchContextType {
  query: string;                   // raw user text
  setQuery: (value: string) => void;
  debouncedQuery: string;          // delayed cleaned text (used for searching)
}

const SearchContext = createContext<SearchContextType>({
  query: "",
  setQuery: () => {},
  debouncedQuery: "",
});

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [query, setQuery] = useState("");

  // 🔥 Debounced version (waits 250ms after typing)
  const debouncedQuery = useDebounce(query, 250);

  return (
    <SearchContext.Provider value={{ query, setQuery, debouncedQuery }}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => useContext(SearchContext);
