import Link from "next/link";
import { Check, ArrowRight, Zap, Building2, Sparkles } from "lucide-react";

export const metadata = {
  title: "Pricing — LogicAutomate",
  description: "Simple pricing for appointment booking. Free to start, scale as you grow.",
};

const plans = [
  {
    name: "Free",
    description: "Get started with no cost",
    price: "₹0",
    period: "/month",
    icon: Zap,
    features: [
      "1 business location",
      "Unlimited appointments",
      "Staff portal access",
      "Booking page & link",
      "Email reminders",
    ],
    cta: "Get started free",
    href: "/login",
    highlighted: false,
  },
  {
    name: "Pro",
    description: "For growing businesses",
    price: "₹999",
    period: "/month",
    icon: Building2,
    features: [
      "Everything in Free",
      "WhatsApp notifications",
      "SMS reminders (pay-as-you-go)",
      "Custom branding",
      "Priority support",
    ],
    cta: "Start free trial",
    href: "/login",
    highlighted: true,
  },
  {
    name: "Enterprise",
    description: "Custom solutions",
    price: "Custom",
    period: "",
    icon: Sparkles,
    features: [
      "Everything in Pro",
      "Multiple locations",
      "API access",
      "Dedicated account manager",
      "SLA & custom terms",
    ],
    cta: "Contact us",
    href: "mailto:hello@logicautomate.app",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-4 py-8 sm:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-violet-400 mb-8 transition-colors"
        >
          ← Back to home
        </Link>

        <div className="text-center mb-10 sm:mb-14">
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-2">
            Simple, transparent{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
              pricing
            </span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Start free. Upgrade when you need WhatsApp, SMS, or more locations.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-6 sm:p-8 flex flex-col ${
                  plan.highlighted
                    ? "border-violet-500/40 bg-slate-900/80 shadow-lg shadow-violet-500/10"
                    : "border-slate-700/50 bg-slate-900/50 hover:border-slate-600"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-violet-500 text-white text-xs font-semibold">
                    Popular
                  </span>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      plan.highlighted ? "bg-violet-500/20" : "bg-slate-700/50"
                    }`}
                  >
                    <Icon className={plan.highlighted ? "w-5 h-5 text-violet-400" : "w-5 h-5 text-slate-400"} />
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-lg">{plan.name}</h2>
                    <p className="text-sm text-slate-400">{plan.description}</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  {plan.period && <span className="text-slate-400 font-medium">{plan.period}</span>}
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-400">
                      <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-semibold transition-colors ${
                    plan.highlighted
                      ? "bg-violet-500 hover:bg-violet-400 text-white"
                      : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-600"
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-slate-500 mt-10">
          All plans include a 14-day free trial of Pro features. No credit card required to start.
        </p>

        <footer className="mt-10 pt-8 border-t border-slate-800 flex flex-wrap justify-center gap-6 text-sm text-slate-500">
          <Link href="/privacy" className="hover:text-violet-400 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-violet-400 transition-colors">Terms of Service</Link>
        </footer>
      </div>
    </div>
  );
}
