import "./Instructions.css";

export function InstructionsPage() {
  return (
    <div className="instructions">
      <header className="instructions__header">
        <h1>How IdeaBridge Works</h1>
        <p>Follow these steps to go from a fresh account to collaborating on ideas and apps.</p>
      </header>

      <section className="instructions__section">
        <h2>1. Create your account</h2>
        <ul>
          <li>Select whether you primarily want to share ideas or build apps&mdash;you can always switch later.</li>
          <li>Verify your phone number so teammates know there is a real person behind the profile.</li>
          <li>Complete your profile with a display name, quick bio, and optional portfolio link.</li>
        </ul>
      </section>

      <section className="instructions__section">
        <h2>2. Explore existing ideas</h2>
        <ul>
          <li>Browse the Ideas feed on the home page to see what the community needs.</li>
          <li>Open an idea to review its description, target users, and any constraints.</li>
          <li>Bookmark promising ideas so you can return to them quickly.</li>
        </ul>
      </section>

      <section className="instructions__section">
        <h2>3. Share your own idea</h2>
        <ul>
          <li>Click <strong>Submit Idea</strong> and describe the problem you want solved.</li>
          <li>Add clear acceptance criteria, business context, and any design references.</li>
          <li>Set realistic expectations&mdash;the more detail you provide, the more likely a developer will pick it up.</li>
        </ul>
      </section>

      <section className="instructions__section">
        <h2>4. Build or propose an app</h2>
        <ul>
          <li>Developers can click <strong>Submit App</strong> on any idea to share a prototype or finished solution.</li>
          <li>List the tech stack, deployment status, and what kind of help you need next (testing, design, funding).</li>
          <li>Attach screenshots or demos so idea owners can evaluate your work quickly.</li>
        </ul>
      </section>

      <section className="instructions__section">
        <h2>5. Collaborate and iterate</h2>
        <ul>
          <li>Use profile pages to follow creators and developers you trust.</li>
          <li>Iterate on submissions by updating your app entry whenever you push new builds.</li>
          <li>Keep communication polite and transparent&mdash;successful projects come from steady collaboration.</li>
        </ul>
      </section>

      <section className="instructions__section">
        <h2>Need help?</h2>
        <p>
          If you get stuck or notice something that feels broken, email us at
          {" "}
          <a href="mailto:jun.nammoku@gmail.com">jun.nammoku@gmail.com</a> and we&apos;ll step in.
        </p>
      </section>
    </div>
  );
}

export default InstructionsPage;
