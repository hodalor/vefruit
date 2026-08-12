import { useEffect, useState } from 'react';
import { getCategoryEventName, loadCategories } from './categoryService';

export default function useCategories() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const sync = () => loadCategories().then(setCategories).catch(() => setCategories([]));

    sync();
    window.addEventListener(getCategoryEventName(), sync);
    return () => {
      window.removeEventListener(getCategoryEventName(), sync);
    };
  }, []);

  return categories;
}
