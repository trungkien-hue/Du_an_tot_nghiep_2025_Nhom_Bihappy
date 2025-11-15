import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // tắt khôi phục scroll của trình duyệt cho lần render này
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    // đưa lên đầu
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    return () => {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "auto";
      }
    };
  }, [pathname, search]);

  return null;
}
