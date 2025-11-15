// Layout.jsx
import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Components/Header/Header";
import Footer from "./Components/Footer/Footer";

function Layout() {
  const { pathname } = useLocation();

  // Mỗi lần đổi route, cuộn lên đầu trang
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" }); // hoặc "smooth"
  }, [pathname]);

  return (
    <>
      <Header />
      <Outlet />
      <Footer />
    </>
  );
}
export default Layout;
