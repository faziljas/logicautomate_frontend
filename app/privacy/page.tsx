import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — AnyBooking",
  description: "Privacy policy for AnyBooking appointment booking platform.",
};

const sections = [
  {
    title: "1. Information we collect",
    content: `We collect information you provide when you sign up, create a business profile, add staff, set up services, and when your customers make bookings. This may include name, email address, phone number, business details, and appointment data. We also collect technical data such as IP address and browser type when you use our website.`,
  },
  {
    title: "2. How we use your information",
    content: `We use your information to provide and improve our booking service, send reminders and notifications (email, SMS, WhatsApp where enabled), process payments, and communicate with you about your account. We do not sell your personal information to third parties.`,
  },
  {
    title: "3. Data storage and security",
    content: `Your data is stored on secure servers. We use industry-standard measures to protect your information. Access to personal data is limited to what is necessary to operate the service and support you.`,
  },
  {
    title: "4. Sharing with third parties",
    content: `We may share data with service providers that help us run the platform (e.g. hosting, email, SMS, payment processors). These providers are bound by agreements to protect your data. We may disclose information if required by law or to protect our rights and safety.`,
  },
  {
    title: "5. Your rights",
    content: `You can access, update, or delete your account and business data from the dashboard or by contacting us. You may request a copy of your data or ask us to stop certain processing where legally applicable.`,
  },
  {
    title: "6. Cookies and tracking",
    content: `We use cookies and similar technologies to keep you signed in, remember preferences, and understand how the site is used. You can control cookies through your browser settings.`,
  },
  {
    title: "7. Children",
    content: `Our service is not directed at children under 13. We do not knowingly collect personal information from children. If you believe we have collected such data, please contact us so we can remove it.`,
  },
  {
    title: "8. Changes to this policy",
    content: `We may update this privacy policy from time to time. We will post the updated version on this page and, for significant changes, we may notify you by email or through the product.`,
  },
  {
    title: "9. Contact us",
    content: `For questions about this privacy policy or your data, contact us at: hello@anybooking.app.`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-violet-400 mb-8 transition-colors"
        >
          ← Back to home
        </Link>

        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Privacy Policy
          </h1>
          <p className="text-slate-400">
            Last updated: February 2025. AnyBooking (“we”, “us”) is committed to protecting your privacy.
          </p>
        </header>

        <div className="max-w-none">
          <p className="text-slate-400 mb-8">
            This privacy policy explains how we collect, use, store, and protect your information when you use AnyBooking and related services.
          </p>

          {sections.map((section) => (
            <section key={section.title} className="mb-8">
              <h2 className="text-lg font-bold text-white mb-2">{section.title}</h2>
              <p className="text-slate-400 leading-relaxed">{section.content}</p>
            </section>
          ))}
        </div>

        <footer className="mt-12 pt-8 border-t border-slate-800 flex flex-wrap gap-6 text-sm text-slate-500">
          <Link href="/pricing" className="hover:text-violet-400 transition-colors">Pricing</Link>
          <Link href="/terms" className="hover:text-violet-400 transition-colors">Terms of Service</Link>
        </footer>
      </div>
    </div>
  );
}
