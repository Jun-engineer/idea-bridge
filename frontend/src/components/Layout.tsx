import { Outlet } from "react-router-dom";
import { NavigationBar } from "./NavigationBar";
import "./Layout.css";

export function Layout() {
  return (
    <div className="layout">
      <NavigationBar />
      <main className="layout__content">
        <Outlet />
      </main>
    </div>
  );
}
