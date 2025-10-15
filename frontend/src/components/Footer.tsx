import { Link } from "react-router-dom";
import "./Footer.css";

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__content">
  <span className="footer__brand">&copy; {new Date().getFullYear()} Jun Nammoku</span>
        <nav className="footer__links" aria-label="Legal and support">
          <Link to="/instructions">How it works</Link>
          <Link to="/privacy-policy">Privacy Policy</Link>
          <a href="mailto:jun.nammoku@gmail.com">Contact</a>
        </nav>
      </div>
    </footer>
  );
}

export default Footer;
