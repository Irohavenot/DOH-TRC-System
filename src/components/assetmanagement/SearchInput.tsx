import React from "react";
import { useSearch } from "../../context/SearchContext";

const SearchInput: React.FC<{ placeholder?: string }> = ({ placeholder = "Search..." }) => {
  const { query, setQuery } = useSearch();

  return (
    <div className="search-container">
      <img src="/search-interface-symbol.png" alt="Search" className="search-icon" />
      <input
        aria-label="Global search"
        className="search-input"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
};

export default SearchInput;
