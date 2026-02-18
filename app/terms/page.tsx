import Link from "next/link";

export const metadata = {
  title: "Terms of Service — LogicAutomate",
  description: "Terms of service for LogicAutomate appointment booking platform.",
};

const sections = [
  {
    title: "1. Acceptance of terms",
    content: `By accessing or using LogicAutomate (“Service”), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. We may update these terms from time to time; continued use after changes means you accept the updated terms.`,
  },
  {
    title: "2. Description of service",
    content: `LogicAutomate provides an online appointment booking platform for businesses (e.g. salons, clinics, service providers). We offer features such as booking pages, staff management, reminders, notifications, and analytics. We reserve the right to modify, suspend, or discontinue any part of the Service with reasonable notice where possible.`,
  },
  {
    title: "3. Account and eligibility",
    content: `You must be at least 18 years old and able to form a binding contract to use the Service. You are responsible for keeping your account credentials secure and for all activity under your account. You must provide accurate and complete information when signing up and managing your business.`,
  },
  {
    title: "4. Acceptable use",
    content: `You agree to use the Service only for lawful purposes and in line with these terms. You may not: use the Service for any illegal or fraudulent purpose; misuse or attempt to gain unauthorized access to our systems or other users’ data; send spam or unwanted messages; or use the Service in a way that harms, overloads, or disrupts our infrastructure or other users. We may suspend or terminate accounts that violate these terms.`,
  },
  {
    title: "5. Your content and data",
    content: `You retain ownership of the content and data you upload (business info, staff, services, customer data). By using the Service, you grant us a limited license to use, store, and process this data to provide and improve the Service. You are responsible for ensuring you have the right to use and share any content you provide and for complying with applicable data protection laws.`,
  },
  {
    title: "6. Fees and payment",
    content: `Some parts of the Service may be subject to fees as described on our Pricing page. You agree to pay all applicable fees. Fees may change with notice. Failure to pay may result in suspension or termination of paid features. Refunds are handled according to our refund policy (see Pricing or contact us).`,
  },
  {
    title: "7. Disclaimer of warranties",
    content: `The Service is provided “as is” and “as available.” We do not warrant that the Service will be uninterrupted, error-free, or free of harmful components. We disclaim all warranties, express or implied, to the fullest extent permitted by law.`,
  },
  {
    title: "8. Limitation of liability",
    content: `To the maximum extent permitted by law, LogicAutomate and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or for loss of profits, data, or business opportunities, arising from your use of the Service. Our total liability shall not exceed the amount you paid us in the twelve months preceding the claim.`,
  },
  {
    title: "9. Indemnification",
    content: `You agree to indemnify and hold LogicAutomate and its affiliates harmless from any claims, damages, or expenses (including legal fees) arising from your use of the Service, your content, your violation of these terms, or your violation of any third-party rights.`,
  },
  {
    title: "10. Termination",
    content: `You may stop using the Service at any time. We may suspend or terminate your access if you breach these terms or for other operational or legal reasons. Upon termination, your right to use the Service ends. Provisions that by their nature should survive (e.g. liability, indemnity) will survive termination.`,
  },
  {
    title: "11. Governing law",
    content: `These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in India, unless otherwise required by law.`,
  },
  {
    title: "12. Contact",
    content: `For questions about these Terms of Service, contact us at: hello@logicautomate.app.`,
  },
];

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="text-slate-400">
            Last updated: February 2025. Please read these terms carefully before using LogicAutomate.
          </p>
        </header>

        <div className="max-w-none">
          <p className="text-slate-400 mb-8">
            These Terms of Service (“Terms”) govern your use of the LogicAutomate website, platform, and related services.
          </p>

          {sections.map((section) => (
            <section key={section.title} className="mb-8">
              <h2 className="text-lg font-bold text-white mb-2">{section.title}</h2>
              <p className="text-slate-400 leading-relaxed">{section.content}</p>
            </section>
          ))}
        </div>

        <footer className="mt-12 pt-8 border-t border-slate-800 flex flex-wrap gap-6 text-sm text-slate-500">
          <Link href="/" className="hover:text-violet-400 transition-colors">Home</Link>
          <Link href="/pricing" className="hover:text-violet-400 transition-colors">Pricing</Link>
          <Link href="/privacy" className="hover:text-violet-400 transition-colors">Privacy Policy</Link>
        </footer>
      </div>
    </div>
  );
}
