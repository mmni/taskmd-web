import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

function readInitialTheme(): Theme {
  // The inline script in index.html already added the `dark` class before
  // first paint when needed; mirror that decision here so React state matches
  // the DOM and we avoid a flicker on hydration.
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // localStorage unavailable (private mode, etc.); ignore.
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggle };
}
