import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll the app shell container if it exists, otherwise window
    const appScroll = document.querySelector('[data-app-scroll]');
    if (appScroll) {
      appScroll.scrollTo({ top: 0, left: 0 });
    }
    window.scrollTo({ top: 0, left: 0 });
  }, [pathname]);

  return null;
};

export default ScrollToTop;
