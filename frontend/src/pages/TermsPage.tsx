import { Link } from 'react-router-dom';
import { ContactEmail, LegalPage, LegalSection } from '../components/LegalPage';
import { legal } from '../config/legal';

const TermsPage = () => (
  <LegalPage title="Terms and Conditions">
    <p>
      These terms govern your use of {legal.serviceName} at {legal.website}, operated by{' '}
      {legal.operator} ("we", "us"). By creating an account or using the service, you agree to
      these terms. If you do not agree, please do not use the service.
    </p>

    <LegalSection title="1. The service">
      <p>
        {legal.serviceName} provides AI-generated mock interviews: practice questions tailored to
        the role and skills you choose, and automated feedback on your answers. It is a practice
        tool. It does not guarantee any interview result, job offer or hiring outcome.
      </p>
    </LegalSection>

    <LegalSection title="2. Eligibility and accounts">
      <ul className="list-disc pl-6 space-y-2">
        <li>You must be at least {legal.minimumAge} years old to use the service.</li>
        <li>Give accurate account information and keep your sign-in details secure.</li>
        <li>You are responsible for activity on your account. Tell us promptly if you suspect misuse.</li>
      </ul>
    </LegalSection>

    <LegalSection title="3. Acceptable use">
      <p>You agree not to:</p>
      <ul className="list-disc pl-6 space-y-2">
        <li>break any law or infringe anyone's rights;</li>
        <li>submit content that is unlawful, harassing, hateful or that you have no right to share;</li>
        <li>attempt to access other users' data, or to disrupt, overload or reverse-engineer the service;</li>
        <li>use bots or scripts to access the service, or resell it, without our written permission.</li>
      </ul>
    </LegalSection>

    <LegalSection title="4. AI-generated content">
      <p>
        Questions and feedback are produced automatically by AI models and may be inaccurate,
        incomplete or unsuitable for your situation. Use them as practice guidance, not as
        professional, career or legal advice.
      </p>
    </LegalSection>

    <LegalSection title="5. Payments">
      <ul className="list-disc pl-6 space-y-2">
        <li>
          Some interview sessions require a one-time payment. The price is shown before you pay,
          and payments are processed by Stripe.
        </li>
        <li>A paid session is linked to your account and cannot be transferred.</li>
        <li>
          If a paid session does not work because of a problem on our side, contact us and we will
          re-run the session or refund it. Other refund requests are considered case by case,
          and as required by law.
        </li>
      </ul>
    </LegalSection>

    <LegalSection title="6. Your content">
      <p>
        You keep ownership of the answers you submit. You give us permission to store and process
        them to provide the service, as described in our{' '}
        <Link to="/privacy" className="text-blue-600 hover:text-blue-700">Privacy Policy</Link>.
      </p>
    </LegalSection>

    <LegalSection title="7. Our content">
      <p>
        The service, including its software, design and question library, belongs to{' '}
        {legal.operator} and its licensors. You may use it only for your own personal interview
        practice.
      </p>
    </LegalSection>

    <LegalSection title="8. Suspension and termination">
      <p>
        You can stop using the service and ask us to delete your account at any time. We may
        suspend or close accounts that break these terms or put the service or other users at
        risk.
      </p>
    </LegalSection>

    <LegalSection title="9. Disclaimers">
      <p>
        The service is provided "as is" and "as available". To the extent permitted by law, we
        make no warranties that it will be uninterrupted, error-free or fit for a particular
        purpose.
      </p>
    </LegalSection>

    <LegalSection title="10. Limitation of liability">
      <p>
        To the extent permitted by law, we are not liable for indirect or consequential losses,
        or for lost opportunities or income. Our total liability for any claim is limited to the
        amount you paid us in the 12 months before the claim. Nothing in these terms limits
        rights you have under consumer protection laws that cannot be excluded.
      </p>
    </LegalSection>

    <LegalSection title="11. Changes to these terms">
      <p>
        We may update these terms. We will change the effective date above and, for significant
        changes, tell you in the app or by email. Continuing to use the service after changes
        take effect means you accept them.
      </p>
    </LegalSection>

    <LegalSection title="12. Contact">
      <p>
        Questions about these terms: <ContactEmail />
      </p>
    </LegalSection>
  </LegalPage>
);

export default TermsPage;
