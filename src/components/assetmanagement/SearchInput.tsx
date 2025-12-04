import React from "react";
import { useSearch } from "../../context/SearchContext";
import "../../assets/searchinput.css"; // NEW CSS FILE

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (val: string) => void;
}

const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = "Search...",
  value,
  onChange,
}) => {
  const { query: rawSearch, setQuery: setRawSearch } = useSearch();

  const inputValue = value ?? rawSearch;
  const handleInputChange = onChange ?? setRawSearch;

  return (
    <div className="searchbox-container">
      <img src="/search-interface-symbol.png" alt="Search" className="searchbox-icon" />
      <input
        aria-label="Global search"
        className="searchbox-input"
        type="text"
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
};

export default SearchInput;
