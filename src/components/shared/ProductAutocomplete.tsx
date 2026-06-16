"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Search, ChevronDown, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  code: string;
  name: string;
  [key: string]: any;
}

interface ProductAutocompleteProps {
  products: Product[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function getSearchMatches(products: Product[], query: string): Array<{ product: Product; score: number }> {
  if (!query) {
    return products.map((p) => ({ product: p, score: 1 }));
  }

  const cleanedQuery = query.trim().toLowerCase();
  if (!cleanedQuery) {
    return products.map((p) => ({ product: p, score: 1 }));
  }

  const queryTokens = cleanedQuery.split(/\s+/).filter(Boolean);

  return products
    .map((p) => {
      const code = (p.code || "").toLowerCase();
      const name = (p.name || "").toLowerCase();

      let score = 0;

      // 1. Exact matches
      if (code === cleanedQuery || name === cleanedQuery) {
        score = 100;
      }
      // 2. Code starts with query
      else if (code.startsWith(cleanedQuery)) {
        score = 90;
      }
      // 3. Name starts with query
      else if (name.startsWith(cleanedQuery)) {
        score = 80;
      }
      // 4. Code contains query
      else if (code.includes(cleanedQuery)) {
        score = 70;
      }
      // 5. Name contains query
      else if (name.includes(cleanedQuery)) {
        score = 60;
      }
      // 6. Token matching: check how many search terms match
      else {
        let matchedTokens = 0;
        for (const token of queryTokens) {
          if (name.includes(token) || code.includes(token)) {
            matchedTokens++;
          }
        }
        if (matchedTokens > 0) {
          score = 10 + (matchedTokens / queryTokens.length) * 40;
        }
      }

      return { product: p, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function ProductAutocomplete({
  products = [],
  value = "",
  onChange,
  placeholder = "Search product...",
  disabled = false,
  className,
}: ProductAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === value);
  }, [products, value]);

  const displayValue = useMemo(() => {
    return selectedProduct ? `[${selectedProduct.code}] ${selectedProduct.name}` : "";
  }, [selectedProduct]);

  // Sync state with value from parent
  useEffect(() => {
    if (!isFocused) {
      setSearchQuery(displayValue);
    }
  }, [value, displayValue, isFocused]);

  // Compute matched items
  const matches = useMemo(() => {
    // If focused and input is untouched, show all products
    const query = isFocused && searchQuery !== displayValue ? searchQuery : "";
    return getSearchMatches(products, query);
  }, [products, searchQuery, displayValue, isFocused]);

  // Keep highlighted index in bounds
  useEffect(() => {
    if (matches.length === 0) {
      setHighlightedIndex(0);
    } else if (highlightedIndex >= matches.length) {
      setHighlightedIndex(matches.length - 1);
    }
  }, [matches, highlightedIndex]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const activeEl = dropdownRef.current.querySelector('[data-highlighted="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Handle outside click to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
        setSearchQuery(displayValue);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [displayValue]);

  const handleSelect = (productId: string) => {
    onChange(productId);
    setIsOpen(false);
    const prod = products.find((p) => p.id === productId);
    const text = prod ? `[${prod.code}] ${prod.name}` : "";
    setSearchQuery(text);
    setIsFocused(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (prev + 1) % matches.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (prev - 1 + matches.length) % matches.length);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && matches.length > 0) {
        handleSelect(matches[highlightedIndex].product.id);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setIsFocused(false);
      setSearchQuery(displayValue);
      inputRef.current?.blur();
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    setIsOpen(true);
    setHighlightedIndex(0);
    // Select all text on focus to make overwriting easy
    e.target.select();
  };

  // Limit suggestions list render for performance (top 50)
  const renderedMatches = useMemo(() => matches.slice(0, 50), [matches]);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <Search
          size={14}
          className={cn(
            "absolute left-3 text-zinc-400 dark:text-zinc-500 pointer-events-none z-10",
            (!isFocused && selectedProduct) ? "top-3" : "top-1/2 -translate-y-1/2"
          )}
        />
        {!isFocused && selectedProduct && (
          <div
            onClick={() => {
              if (disabled) return;
              setIsFocused(true);
              setIsOpen(true);
              setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
              }, 0);
            }}
            tabIndex={disabled ? undefined : 0}
            onKeyDown={(e) => {
              if (disabled) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsFocused(true);
                setIsOpen(true);
                setTimeout(() => {
                  inputRef.current?.focus();
                  inputRef.current?.select();
                }, 0);
              }
            }}
            className={cn(
              "w-full min-h-[2.25rem] h-auto rounded-md border border-zinc-350 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-9 pr-16 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 shadow-sm cursor-pointer whitespace-normal break-words flex items-center leading-relaxed transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500",
              disabled && "bg-zinc-50 dark:bg-zinc-900 text-zinc-400 cursor-not-allowed border-zinc-200 dark:border-zinc-850"
            )}
          >
            <div className="flex items-start gap-1.5 py-0.5">
              <span className="shrink-0 mt-0.5 text-[10px] bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded font-mono font-bold leading-none">
                {selectedProduct.code}
              </span>
              <span className="text-zinc-800 dark:text-zinc-200 font-medium">
                {selectedProduct.name}
              </span>
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={isFocused ? searchQuery : displayValue}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={handleFocus}
          onBlur={() => {
            setIsFocused(false);
            setIsOpen(false);
            setSearchQuery(displayValue);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "w-full h-9 rounded-md border border-zinc-350 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-9 pr-16 text-xs text-zinc-900 dark:text-zinc-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all",
            disabled && "bg-zinc-50 dark:bg-zinc-900 text-zinc-400 cursor-not-allowed border-zinc-200 dark:border-zinc-850",
            (!isFocused && selectedProduct) && "sr-only"
          )}
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
          {value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setSearchQuery("");
                inputRef.current?.focus();
              }}
              className="text-zinc-400 hover:text-zinc-650 dark:text-zinc-500 dark:hover:text-zinc-300 p-0.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              <X size={12} />
            </button>
          )}
          <ChevronDown
            size={14}
            className="text-zinc-400 dark:text-zinc-500 pointer-events-none"
          />
        </div>
      </div>

      {isOpen && matches.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 z-50 w-full min-w-[320px] md:min-w-[480px] max-w-[90vw] mt-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl max-h-60 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800"
        >
          {renderedMatches.map((item, index) => {
            const isSelected = item.product.id === value;
            const isHighlighted = index === highlightedIndex;

            return (
              <div
                key={item.product.id}
                data-highlighted={isHighlighted ? "true" : "false"}
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseDown={(e) => {
                  // Prevent input blur to ensure click completes correctly
                  e.preventDefault();
                  handleSelect(item.product.id);
                }}
                className={cn(
                  "flex items-center justify-between px-3 py-2 cursor-pointer text-xs transition-colors",
                  isHighlighted ? "bg-zinc-100 dark:bg-zinc-900" : "bg-transparent",
                  isSelected && "text-blue-600 dark:text-blue-400 font-medium"
                )}
              >
                <div className="flex items-start gap-2 py-0.5 mr-2">
                  <span className="shrink-0 mt-0.5 text-[10px] bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded font-mono font-bold leading-none">
                    {item.product.code}
                  </span>
                  <span className="whitespace-normal break-words text-zinc-800 dark:text-zinc-200 font-medium leading-relaxed text-left">
                    {item.product.name}
                  </span>
                </div>
                {isSelected && (
                  <Check size={12} className="shrink-0 text-blue-600 dark:text-blue-400 ml-auto" />
                )}
              </div>
            );
          })}
          {matches.length > 50 && (
            <div className="px-3 py-1.5 text-[9px] text-zinc-400 dark:text-zinc-500 italic text-center border-t border-zinc-100 dark:border-zinc-900">
              Showing top 50 matches. Type more characters to filter...
            </div>
          )}
        </div>
      )}

      {isOpen && matches.length === 0 && (
        <div className="absolute top-full left-0 z-50 w-full mt-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-4 px-3 text-center text-xs text-zinc-400 dark:text-zinc-500">
          No matching products found.
        </div>
      )}
    </div>
  );
}
