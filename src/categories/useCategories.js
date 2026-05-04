import { useEffect, useState } from 'react';
import { getCategoryEventName, loadCategories } from './categoryService';

export default function useCategories() {
  const [categories, setCategories] = useState(() => loadCategories());

  useEffect(() => {
    const sync = () => setCategories(loadCategories());
    const onStorage = (event) => {
      if (event.key === 'vefruit_categories_v1') {
        sync();
      }
    };

    window.addEventListener(getCategoryEventName(), sync);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(getCategoryEventName(), sync);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return categories;
}

