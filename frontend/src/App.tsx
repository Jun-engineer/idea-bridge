import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { RequireAuth } from "./components/RequireAuth";
import { HomePage } from "./pages/Home";
import { IdeaDetailPage } from "./pages/IdeaDetail";
import { ProfilePage } from "./pages/Profile";
import { SubmitAppPage } from "./pages/SubmitApp";
import { SubmitIdeaPage } from "./pages/SubmitIdea";
import { SignInPage } from "./pages/SignIn";
import { SignUpPage } from "./pages/SignUp";
import { AccountSettingsPage } from "./pages/AccountSettings";
import { VerifyContactPage } from "./pages/VerifyContact";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="ideas/new" element={<SubmitIdeaPage />} />
        <Route path="ideas/:ideaId" element={<IdeaDetailPage />} />
        <Route path="apps/new" element={<SubmitAppPage />} />
        <Route path="profiles/:role/:profileId" element={<ProfilePage />} />
        <Route path="signin" element={<SignInPage />} />
        <Route path="signup" element={<SignUpPage />} />
  <Route path="verify" element={<VerifyContactPage />} />
        <Route
          path="profile/settings"
          element={
            <RequireAuth redirectTo="/">
              <AccountSettingsPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function NotFound() {
  return (
    <div className="page page--centered">
      <h1>Page not found</h1>
      <p>The page you are looking for doesn&apos;t exist.</p>
    </div>
  );
}

export default App;
