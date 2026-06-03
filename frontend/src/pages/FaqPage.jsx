import { useState } from 'react';
import Header from '../components/layout/Header.jsx';
import Footer from '../components/layout/Footer.jsx';

const FAQS = [
  {
    category: '🛵 Delivery',
    items: [
      {
        q: 'How long does delivery take?',
        a: 'We deliver within 2 hours of placing your order. During peak hours (evenings / weekends) it may take up to 3 hours. You will receive live tracking updates on your order page.',
      },
      {
        q: 'What is your delivery area?',
        a: 'We currently deliver within a 5 km radius of our Kapodra store in Surat. Enter your pincode or set your location on the map during checkout to check availability.',
      },
      {
        q: 'Is there a minimum order value for delivery?',
        a: 'There is no minimum order value. However, a small delivery fee may apply for orders below ₹199. Orders above ₹199 qualify for free delivery.',
      },
      {
        q: 'Can I schedule a delivery for a specific time?',
        a: 'Yes! During checkout you can select from available delivery slots (morning, afternoon, evening). Same-day slots are subject to availability.',
      },
    ],
  },
  {
    category: '💳 Payments',
    items: [
      {
        q: 'What payment methods are accepted?',
        a: 'We accept UPI (PhonePe, GPay, Paytm), Visa/Mastercard/RuPay debit & credit cards, Net Banking, and Cash on Delivery (COD).',
      },
      {
        q: 'Is Cash on Delivery available?',
        a: 'Yes, COD is available for all orders. Please keep exact change handy as our delivery partners may not always carry change.',
      },
      {
        q: 'When will my card/UPI be charged?',
        a: 'Online payments are charged immediately when you place the order. COD payments are collected at your doorstep upon delivery.',
      },
    ],
  },
  {
    category: '📦 Orders',
    items: [
      {
        q: 'How do I track my order?',
        a: 'Once your order is confirmed, go to My Orders in your account. Click on any order to see live status and delivery agent location on a map.',
      },
      {
        q: 'Can I cancel my order?',
        a: 'You can cancel your order before it is packed (usually within 10–15 minutes of placing it). Go to My Orders → select order → Cancel. After packing begins, cancellation is not possible.',
      },
      {
        q: 'What if an item is missing from my order?',
        a: 'If any item is missing or incorrect, contact us within 24 hours via WhatsApp or the app. We will deliver the missing item or issue a full refund for that item.',
      },
      {
        q: 'Can I change my delivery address after placing the order?',
        a: 'Address changes are possible only before the order is dispatched. Contact our support team immediately via WhatsApp for assistance.',
      },
    ],
  },
  {
    category: '🔄 Returns & Refunds',
    items: [
      {
        q: 'What is your return policy?',
        a: 'We accept returns for damaged, expired, or incorrect items within 24 hours of delivery. Opened perishables (fruits, vegetables, dairy) cannot be returned unless damaged or spoilt on delivery.',
      },
      {
        q: 'How long does a refund take?',
        a: 'Refunds are processed within 2–3 business days. UPI/card refunds appear in your account within 5–7 business days depending on your bank.',
      },
    ],
  },
  {
    category: '🧑‍💼 Account',
    items: [
      {
        q: 'How do I create an account?',
        a: 'Tap "Login / Sign Up" in the header. You can register with your mobile number and email. OTP verification is required to activate your account.',
      },
      {
        q: 'I forgot my password. How do I reset it?',
        a: 'On the login screen, tap "Forgot Password?". Enter your registered email and you will receive a 6-digit OTP to set a new password.',
      },
      {
        q: 'Can I save multiple delivery addresses?',
        a: 'Yes! Go to Profile → My Addresses to add, edit, or delete addresses. You can also set a default address for faster checkout.',
      },
    ],
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${open ? 'border-brand-200 bg-brand-50/40' : 'border-gray-100 bg-white'}`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left">
        <span className="text-sm font-semibold text-gray-800 leading-snug">{q}</span>
        <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all
          ${open ? 'bg-brand-600 text-white rotate-180' : 'bg-gray-100 text-gray-400'}`}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-sm text-gray-600 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showSearch={false} />

      <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-8">

        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900">FAQs</h1>
          <p className="text-sm text-gray-500 mt-1">Frequently asked questions about SuperMart.</p>
        </div>

        <div className="space-y-6">
          {FAQS.map((group) => (
            <div key={group.category}>
              <h2 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2 px-1">
                {group.category}
              </h2>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <FaqItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Still have questions */}
        <div className="mt-8 bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm">
          <p className="text-2xl mb-2">💬</p>
          <p className="text-sm font-bold text-gray-900">Still have questions?</p>
          <p className="text-xs text-gray-500 mt-1 mb-4">Our support team is ready to help you.</p>
          <a href="/contact"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-sm font-bold rounded-xl
                       hover:bg-brand-700 active:scale-95 transition-all">
            Contact Support →
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
}
