import "./PrivacyPolicy.css";

export function PrivacyPolicyPage() {
  return (
    <div className="page page--narrow privacy-policy">
      <header className="privacy-policy__header">
        <h1>IdeaBridge Privacy Policy</h1>
        <p className="privacy-policy__last-updated">Last updated: October 15, 2025</p>
      </header>

      <section className="privacy-policy__section">
        <p>
          IdeaBridge ("the App") helps founders and collaborators share startup concepts, collect feedback, and
          coordinate introductions. This privacy policy explains what personal information we collect, how we use it,
          and the options you have. If you do not agree with this policy, please do not access or use the App.
        </p>
      </section>

      <section className="privacy-policy__section">
        <h2>1. Information We Collect</h2>
        <ul>
          <li>
            <strong>Account details:</strong> Name, email address, and optionally phone number when you register or
            update your profile.
          </li>
          <li>
            <strong>Authentication data:</strong> Password hashes, one-time passcodes, and session tokens required to
            securely sign you in.
          </li>
          <li>
            <strong>Profile content:</strong> Bio, skills, interests, and any social or website links you choose to
            share within your profile.
          </li>
          <li>
            <strong>Idea submissions:</strong> Titles, descriptions, attachments, and tags that you publish for other
            users to review.
          </li>
          <li>
            <strong>Feedback and collaboration signals:</strong> Comments, votes, connection requests, and any status
            you set for an idea.
          </li>
          <li>
            <strong>Device and usage data:</strong> IP address, browser or device type, operating system, app version,
            clickstream, and timestamps recorded automatically.
          </li>
          <li>
            <strong>Support communications:</strong> Questions, feedback, or bug reports you send us via email or
            in-app forms.
          </li>
        </ul>
        <p>We do not intentionally collect sensitive personal information (such as government IDs or payment details) within the App.</p>
      </section>

      <section className="privacy-policy__section">
        <h2>2. How We Use Information</h2>
        <ul>
          <li>Provide and improve the App, including authentication, personalization, and collaboration features.</li>
          <li>Communicate with you about support requests, onboarding, and transactional notifications.</li>
          <li>Protect the App, detect fraud, and enforce our policies.</li>
          <li>Analyze usage trends to prioritize roadmap investments and resolve bugs.</li>
          <li>Comply with legal obligations and enforce our terms.</li>
        </ul>
      </section>

      <section className="privacy-policy__section">
        <h2>3. When We Share Information</h2>
        <p>We share information only when necessary:</p>
        <ul>
          <li>
            <strong>Service providers:</strong> With cloud, analytics, and notification partners operating under
            contractual safeguards.
          </li>
          <li>
            <strong>Legal obligations:</strong> To comply with applicable laws or lawful government requests.
          </li>
          <li>
            <strong>Business transfers:</strong> In the event of a merger, acquisition, or sale of assets, subject to
            this policy.
          </li>
        </ul>
        <p>We do not sell your personal information.</p>
      </section>

      <section className="privacy-policy__section">
        <h2>4. Data Retention</h2>
        <p>
          We retain personal information for as long as your account is active and for a reasonable period afterward to
          fulfill legal, accounting, or reporting requirements. You may request deletion at any time.
        </p>
      </section>

      <section className="privacy-policy__section">
        <h2>5. International Data Transfers</h2>
        <p>
          IdeaBridge runs on Amazon Web Services (AWS) infrastructure, which may process data in regions outside your
          country of residence. We apply industry-standard safeguards to protect your information.
        </p>
      </section>

      <section className="privacy-policy__section">
        <h2>6. Security</h2>
        <p>
          We employ technical and organizational measures such as encryption in transit, access controls,
          least-privilege permissions, and security monitoring. No method of transmission or storage is completely
          secure, and we cannot guarantee absolute security.
        </p>
      </section>

      <section className="privacy-policy__section">
        <h2>7. Children&apos;s Privacy</h2>
        <p>
          The App is not intended for children under 13. If you believe a child has provided us with personal
          information, contact us so we can delete it.
        </p>
      </section>

      <section className="privacy-policy__section">
        <h2>8. Your Rights and Choices</h2>
        <p>
          Depending on your jurisdiction, you may have rights to access, correct, delete, or object to processing of
          your personal information. Contact us to exercise these rights, and we may request verification before acting
          on your request.
        </p>
      </section>

      <section className="privacy-policy__section">
        <h2>9. Managing Your Account</h2>
        <p>
          You can update most profile details directly within the App. To delete your account or request removal of
          specific content, email us at <a href="mailto:privacy@idea-bridge.app">privacy@idea-bridge.app</a>. We will
          remove identifying information from active systems within 30 days, subject to legal obligations.
        </p>
      </section>

      <section className="privacy-policy__section">
        <h2>10. Contact Us</h2>
        <p>
          Email the IdeaBridge Privacy Team at <a href="mailto:privacy@idea-bridge.app">privacy@idea-bridge.app</a>.
        </p>
      </section>

      <section className="privacy-policy__section">
        <h2>11. Changes to This Policy</h2>
        <p>
          We may update this policy to reflect operational, legal, or regulatory changes. When we do, we will revise the
          "Last updated" date and, when appropriate, notify you through the App or by email. Continued use of the App
          after changes take effect constitutes acceptance.
        </p>
      </section>

      <footer className="privacy-policy__footer">&copy; 2025 IdeaBridge. All rights reserved.</footer>
    </div>
  );
}

export default PrivacyPolicyPage;
