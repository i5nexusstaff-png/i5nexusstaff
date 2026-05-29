import { createContext, useContext, useEffect, useState } from 'react';

export const FONT_SIZES = [
  { key: 'sm', label: 'Small',    px: 13 },
  { key: 'md', label: 'Default',  px: 15 },
  { key: 'lg', label: 'Large',    px: 17 },
  { key: 'xl', label: 'X-Large', px: 19 },
];

const FontSizeContext = createContext();

export function FontSizeProvider({ children }) {
  const [size, setSize] = useState(() => localStorage.getItem('fontSize') || 'md');

  useEffect(() => {
    // Remove all font-size classes then add the chosen one
    FONT_SIZES.forEach(s => document.documentElement.classList.remove(`fs-${s.key}`));
    document.documentElement.classList.add(`fs-${size}`);
    localStorage.setItem('fontSize', size);
  }, [size]);

  return (
    <FontSizeContext.Provider value={{ size, setSize }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export const useFontSize = () => useContext(FontSizeContext);
