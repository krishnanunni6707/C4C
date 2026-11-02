"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleDarkMode: () => {},
  setDarkMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    setMounted(true);
    try {
      const savedTheme = localStorage.getItem("qdoc-theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const isDark = savedTheme === "dark" || (!savedTheme && prefersDark);

      setIsDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch {
      // Fallback if localStorage or matchMedia fails
    }
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev;
      try {
        if (next) {
          document.documentElement.classList.add("dark");
          localStorage.setItem("qdoc-theme", "dark");
        } else {
          document.documentElement.classList.remove("dark");
          localStorage.setItem("qdoc-theme", "light");
        }
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  const setDarkMode = useCallback((enabled: boolean) => {
    setIsDarkMode(enabled);
    try {
      if (enabled) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("qdoc-theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("qdoc-theme", "light");
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
