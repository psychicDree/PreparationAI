import { ContactEmail, LegalPage, LegalSection } from '../components/LegalPage';
import { legal } from '../config/legal';

const providers = [
  ['Supabase', 'Sign-in and database hosting (Australia)'],
  ['Render', 'Runs our application server (Singapore)'],
  ['Cloudflare', 'Delivers the website and protects it from abuse (global network)'],
  ['OpenAI', 'Generates interview questions and evaluates your answers (United States)'],
  ['Stripe', 'Processes payments, when payments are enabled (global)'],
  ['Google, GitHub, LinkedIn, Apple', 'Only if you choose to sign in with them'],
];

const PrivacyPolicyPage = () => (
  <LegalPage title="Privacy Policy">
    <p>
      This policy explains what personal information {legal.serviceName} ("we", "us") collects
      when you use {legal.website}, how we use it, and the choices you have.{' '}
      {legal.serviceName} is operated by {legal.operator}. If you have questions, email{' '}
      <ContactEmail />.
    </p>

    <LegalSection title="1. Information we collect">
      <ul className="list-disc pl-6 space-y-2">
        <li>
          <strong>Account details:</strong> your name and email address, and a securely hashed
          password if you sign up with email.
        </li>
        <li>
          <strong>Social sign-in:</strong> if you sign in with Google, GitHub, LinkedIn or Apple,
          we receive your name, email address and an account identifier from that provider. We do
          not receive your password and we do not access your contacts, files or other data.
        </li>
        <li>
          <strong>Interview setup:</strong> the role, skills, experience level and preferences you
          choose.
        </li>
        <li>
          <strong>Interview content:</strong> the questions generated for you, the answers you
          submit, and the feedback and scores we produce.
        </li>
        <li>
          <strong>Payments:</strong> when you buy a session, Stripe collects your card details
          directly. We never see or store your full card number; we keep a payment reference and
          whether the session is paid.
        </li>
        <li>
          <strong>Technical data:</strong> our hosting providers record standard request logs
          (such as IP address, browser type, pages requested and timestamps) to operate, debug and
          secure the service.
        </li>
      </ul>
    </LegalSection>

    <LegalSection title="2. How we use your information">
      <ul className="list-disc pl-6 space-y-2">
        <li>To create and secure your account and sign you in.</li>
        <li>To generate interview questions and give you feedback on your answers.</li>
        <li>To show your past sessions and progress.</li>
        <li>To process payments and prevent fraud.</li>
        <li>To keep the service working, fix problems and protect it from abuse.</li>
        <li>To respond to your messages and send essential service notices.</li>
      </ul>
      <p>We do not sell your personal information and we do not use it for advertising.</p>
    </LegalSection>

    <LegalSection title="3. AI processing">
      <p>
        To create questions and feedback, we send your interview setup and answers to OpenAI's API.
        We do not send your name, email address or password. Under OpenAI's API terms, data sent
        through the API is not used to train OpenAI's models by default. Feedback is generated
        automatically and may contain mistakes.
      </p>
      <p>
        We may use interview questions and answers, with names and email addresses removed, to
        improve the quality of our own questions and feedback. To opt out, email{' '}
        <ContactEmail />.
      </p>
    </LegalSection>

    <LegalSection title="4. Google user data">
      <p>
        If you sign in with Google, we use only your name, email address and Google account
        identifier, and only to create and sign in to your {legal.serviceName} account. We do not
        transfer this data to others except the service providers listed below that are needed to
        run the service, we do not use it for advertising, and we do not use it to train AI
        models. Our use of information received from Google APIs adheres to the{' '}
        <a
          href="https://developers.google.com/terms/api-services-user-data-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700"
        >
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements.
      </p>
    </LegalSection>

    <LegalSection title="5. Service providers">
      <p>We share information only with providers that help us run the service:</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 font-semibold">Provider</th>
              <th className="p-3 font-semibold">Purpose (location)</th>
            </tr>
          </thead>
          <tbody>
            {providers.map(([name, purpose]) => (
              <tr key={name} className="border-t border-gray-200">
                <td className="p-3 font-medium">{name}</td>
                <td className="p-3">{purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        We may also disclose information if required by law, or to protect the rights and safety
        of our users or the service.
      </p>
    </LegalSection>

    <LegalSection id="storage" title="6. Cookies and browser storage">
      <p>
        We store your sign-in token and your current interview progress in your browser's local
        storage so you stay signed in and don't lose your place. We do not use advertising or
        analytics cookies. Stripe may set its own cookies on the payment page to prevent fraud.
        Clearing your browser data signs you out.
      </p>
    </LegalSection>

    <LegalSection title="7. Where your data is stored">
      <p>
        Our database is hosted in Australia and our application server runs in Singapore. Some
        providers, such as OpenAI and Stripe, process data in the United States and other
        countries. We rely on these providers' contractual and security commitments when data is
        transferred.
      </p>
    </LegalSection>

    <LegalSection title="8. How long we keep it">
      <p>
        We keep your account and interview history until you delete your account or ask us to
        delete it. We then delete it within 30 days, except where we must keep limited records
        (for example, payment records) to meet legal obligations. Hosting logs are kept for a
        short period set by our providers.
      </p>
    </LegalSection>

    <LegalSection title="9. Security">
      <p>
        We use encrypted connections (HTTPS), hash passwords, restrict database access and rely on
        established providers. No system is perfectly secure, so please use a strong, unique
        password.
      </p>
    </LegalSection>

    <LegalSection id="your-rights" title="10. Your choices and rights">
      <p>
        You can ask us to access, correct, export or delete your personal information, or object
        to how we use it, by emailing <ContactEmail />. We will respond within 30 days. Depending
        on where you live, you may also have the right to complain to your local data protection
        authority.
      </p>
    </LegalSection>

    <LegalSection title="11. Children">
      <p>
        {legal.serviceName} is not intended for anyone under {legal.minimumAge}. If you believe a
        child has given us personal information, contact us and we will delete it.
      </p>
    </LegalSection>

    <LegalSection title="12. Changes to this policy">
      <p>
        We may update this policy. We will change the effective date above and, for significant
        changes, tell you in the app or by email.
      </p>
    </LegalSection>

    <LegalSection title="13. Contact">
      <p>
        {legal.operator}, operator of {legal.serviceName}: <ContactEmail />
      </p>
    </LegalSection>
  </LegalPage>
);

export default PrivacyPolicyPage;
