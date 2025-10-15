import { Outlet } from "react-router-dom";
import { NavigationBar } from "./NavigationBar";
import { Footer } from "./Footer";
import "./Layout.css";

export function Layout() {
  return (
    <div className="layout">
      <NavigationBar />
      <main className="layout__content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
