'use client';

import { useState, useEffect, useRef } from 'react';
import { TrendingUp, Search, Loader2, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProviderName, PROVIDER_INFO } from '@/types/analysis';
import { useAuth } from '@/lib/contexts/AuthContext';
import { LoginButton } from '@/components/auth/LoginButton';
import { UserMenu } from '@/components/auth/UserMenu';

export interface CompanyInfo {
  name: string;
  symbol?: string;
  isPublic: boolean;
  publicStatus?: 'public' | 'private' | 'went_private' | 'pre_ipo' | 'unknown';
}

interface CompanySuggestion {
  name: string;
  symbol?: string;
  description?: string;
  isPublic: boolean;
  publicStatus?: 'public' | 'private' | 'went_private' | 'pre_ipo' | 'unknown';
  isCustomSearch?: boolean;
}

interface HeaderProps {
  onSearch: (companyName: string, companyInfo?: CompanyInfo) => void;
  loading: boolean;
  selectedProvider: ProviderName;
  selectedModel: string;
  onSettingsClick: () => void;
}

export function Header({
  onSearch,
  loading,
  selectedProvider,
  selectedModel,
  onSettingsClick
}: HeaderProps) {
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<CompanySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch company suggestions
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchInput.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/company/search?q=${encodeURIComponent(searchInput.trim())}`);
        if (response.ok) {
          const data = await response.json();
          const results = data.results || [];
          setSuggestions(results);
          // Always show dropdown if we have results (including custom search option)
          setShowSuggestions(results.length > 0);
          setSelectedIndex(-1);
        }
      } catch (err) {
        console.error('Company search error:', err);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchInput]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim() || loading) return;

    setShowSuggestions(false);

    // If user has selected a suggestion via keyboard, use it
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      const selected = suggestions[selectedIndex];
      setSearchInput(selected.name);
      onSearch(selected.name, {
        name: selected.name,
        symbol: selected.symbol,
        isPublic: selected.isPublic,
        publicStatus: selected.publicStatus
      });
      return;
    }

    // Check for known company matches (not custom search options)
    const knownMatches = suggestions.filter(s => !s.isCustomSearch);

    if (knownMatches.length > 0) {
      // Use the top known suggestion if input is close enough
      const topSuggestion = knownMatches[0];
      const inputLower = searchInput.trim().toLowerCase();
      const suggestionLower = topSuggestion.name.toLowerCase();

      // Auto-correct if input is similar but not exact
      if (inputLower !== suggestionLower) {
        setSearchInput(topSuggestion.name);
        onSearch(topSuggestion.name, {
          name: topSuggestion.name,
          symbol: topSuggestion.symbol,
          isPublic: topSuggestion.isPublic,
          publicStatus: topSuggestion.publicStatus
        });
        return;
      }

      // Exact match - pass the company info
      onSearch(topSuggestion.name, {
        name: topSuggestion.name,
        symbol: topSuggestion.symbol,
        isPublic: topSuggestion.isPublic,
        publicStatus: topSuggestion.publicStatus
      });
      return;
    }

    // No known matches - search with the user's input as-is
    // Capitalize for display
    const capitalizedInput = searchInput.trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    onSearch(capitalizedInput, {
      name: capitalizedInput,
      isPublic: true, // Assume public, will be determined during analysis
      publicStatus: 'unknown'
    });
  };

  const handleSelectSuggestion = (suggestion: CompanySuggestion) => {
    setSearchInput(suggestion.name);
    setShowSuggestions(false);
    setSuggestions([]);
    onSearch(suggestion.name, {
      name: suggestion.name,
      symbol: suggestion.symbol,
      isPublic: suggestion.isPublic,
      publicStatus: suggestion.publicStatus
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const currentProviderInfo = PROVIDER_INFO[selectedProvider];
  const currentModelInfo = currentProviderInfo.models.find(m => m.id === selectedModel);

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-lg border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">MarketPulse</h1>
              <p className="text-xs text-zinc-500">Corporate Intelligence</p>
            </div>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSubmit} className="flex-1 max-w-2xl">
            <div className="relative flex gap-2">
              <div className="relative flex-1" ref={searchRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 z-10" />
                <Input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="Search any company..."
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
                />

                {/* Company Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
                    {/* Show "Suggestions" header only if there are known matches */}
                    {suggestions.some(s => !s.isCustomSearch) && (
                      <div className="text-xs text-zinc-500 px-3 py-2 border-b border-zinc-800">
                        Suggestions
                      </div>
                    )}
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={`${suggestion.name}-${suggestion.isCustomSearch ? 'custom' : 'known'}`}
                        type="button"
                        onClick={() => handleSelectSuggestion(suggestion)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
                          suggestion.isCustomSearch ? 'border-t border-zinc-800' : ''
                        } ${
                          index === selectedIndex
                            ? 'bg-emerald-500/20 text-white'
                            : 'hover:bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {suggestion.isCustomSearch && (
                            <Search className="w-4 h-4 text-cyan-400" />
                          )}
                          <span className={`font-medium ${suggestion.isCustomSearch ? 'text-cyan-400' : ''}`}>
                            {suggestion.name}
                          </span>
                          {suggestion.symbol && !suggestion.isCustomSearch && (
                            <span className="text-emerald-400 text-sm">{suggestion.symbol}</span>
                          )}
                        </div>
                        <span className={`text-xs ${suggestion.isCustomSearch ? 'text-cyan-400/70' : 'text-zinc-500'}`}>
                          {suggestion.description}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Provider/Model Display - Click to open settings (admin only) */}
              {isAdmin && (
                <Button
                  variant="outline"
                  onClick={onSettingsClick}
                  className="bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{currentProviderInfo.name}</span>
                    <span className="text-zinc-500">•</span>
                    <span className="text-zinc-400">{currentModelInfo?.name || selectedModel}</span>
                  </div>
                  {currentProviderInfo.supportsWebGrounding && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" title="Web search" />
                  )}
                  <Settings className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                </Button>
              )}

              {/* Provider/Model Display (non-admin - read only) */}
              {!isAdmin && isAuthenticated && (
                <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm">
                  <span className="font-medium text-zinc-300">{currentProviderInfo.name}</span>
                  <span className="text-zinc-500">•</span>
                  <span className="text-zinc-400">{currentModelInfo?.name || selectedModel}</span>
                  {currentProviderInfo.supportsWebGrounding && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" title="Web search" />
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !searchInput.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white btn-scale"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Analyze'}
              </Button>
            </div>
          </form>

          {/* Auth Section */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {!authLoading && (
              isAuthenticated ? (
                <UserMenu onSettingsClick={isAdmin ? onSettingsClick : undefined} />
              ) : (
                <LoginButton />
              )
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
