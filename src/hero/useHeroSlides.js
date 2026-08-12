import { useEffect, useState } from 'react';
import { getHeroEventName, loadHeroSlides } from './heroService';

export default function useHeroSlides() {
  const [slides, setSlides] = useState([]);

  useEffect(() => {
    const sync = () => loadHeroSlides().then(setSlides).catch(() => setSlides([]));

    sync();
    window.addEventListener(getHeroEventName(), sync);
    return () => {
      window.removeEventListener(getHeroEventName(), sync);
    };
  }, []);

  return slides;
}
