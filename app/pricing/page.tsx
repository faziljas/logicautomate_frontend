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
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-violet-600 mb-8 transition-colors"
        >
          ← Back to home
        </Link>

        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-3">
            Simple, transparent <span className="text-violet-600">pricing</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Start free. Upgrade when you need WhatsApp, SMS, or more locations.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl border-2 p-6 sm:p-8 flex flex-col ${
                  plan.highlighted
                    ? "border-violet-400 bg-white shadow-xl shadow-violet-100/50 scale-[1.02]"
                    : "border-gray-200 bg-white hover:border-violet-200"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-violet-600 text-white text-xs font-semibold">
                    Popular
                  </span>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      plan.highlighted ? "bg-violet-100" : "bg-gray-100"
                    }`}
                  >
                    <Icon
                      className={plan.highlighted ? "w-5 h-5 text-violet-600" : "w-5 h-5 text-gray-600"}
                    />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900 text-lg">{plan.name}</h2>
                    <p className="text-sm text-gray-500">{plan.description}</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                  {plan.period && (
                    <span className="text-gray-500 font-medium">{plan.period}</span>
                  )}
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-semibold transition-colors ${
                    plan.highlighted
                      ? "bg-violet-600 hover:bg-violet-700 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-gray-500 mt-12">
          All plans include a 14-day free trial of Pro features. No credit card required to start.
        </p>

        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-wrap justify-center gap-6 text-sm">
          <Link href="/privacy" className="text-gray-500 hover:text-violet-600">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-gray-500 hover:text-violet-600">
            Terms of Service
          </Link>
          <Link href="/" className="text-gray-500 hover:text-violet-600">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
