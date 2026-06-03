import Header from '../components/layout/Header.jsx';
import Footer from '../components/layout/Footer.jsx';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By accessing or using the SuperMart website or app, you agree to be bound by these Terms & Conditions. If you do not agree, please do not use our service.',
  },
  {
    title: '2. Eligibility',
    body: 'You must be at least 18 years old to create an account and place orders on SuperMart. By using our service, you confirm that you meet this age requirement.',
  },
  {
    title: '3. Account Registration',
    body: `You are responsible for:
• Providing accurate and up-to-date information during registration.
• Maintaining the confidentiality of your account password.
• All activities that occur under your account.

Notify us immediately at support@supermart.in if you suspect unauthorised use of your account. SuperMart is not liable for losses due to unauthorised account access caused by your failure to keep credentials secure.`,
  },
  {
    title: '4. Orders & Pricing',
    body: `• All prices displayed are inclusive of applicable taxes unless stated otherwise.
• Prices may change without prior notice. The price shown at the time of placing the order will be honoured.
• Product images are for representational purposes only. Actual product appearance may vary.
• We reserve the right to cancel any order if an item is out of stock, incorrectly priced, or if fraudulent activity is suspected.
• In case of a price error, we will contact you before processing the order.`,
  },
  {
    title: '5. Payment',
    body: `• Payment is due at the time of placing the order (for online payments) or at delivery (for COD).
• We accept UPI, credit/debit cards, net banking, and Cash on Delivery.
• Failed payments must be retried before the order is placed. SuperMart is not responsible for delays caused by payment gateway issues.
• For COD orders, please keep the exact amount ready as delivery staff may not carry change.`,
  },
  {
    title: '6. Delivery',
    body: `• We aim to deliver within 2 hours of order placement.
• Delivery is subject to availability within our delivery zone.
• We are not responsible for delays caused by factors beyond our control (traffic, weather, strikes, etc.).
• Someone must be present at the delivery address to accept the order. If delivery fails after 2 attempts, the order may be cancelled and a refund processed.`,
  },
  {
    title: '7. Cancellations',
    body: `• Orders can be cancelled before they are packed (usually within 10–15 minutes of placement).
• Once packing begins, cancellations are not possible.
• SuperMart reserves the right to cancel orders due to stock unavailability, pricing errors, or suspicion of fraud.
• Refunds for cancelled orders are processed within 5–7 business days.`,
  },
  {
    title: '8. Returns & Refunds',
    body: 'Returns and refunds are governed by our Return Policy, which is incorporated into these Terms by reference. Please read it at supermart.in/return-policy.',
  },
  {
    title: '9. Prohibited Conduct',
    body: `You agree not to:
• Use the platform for any unlawful purpose.
• Attempt to gain unauthorised access to our systems.
• Post false reviews or manipulate ratings.
• Resell products purchased on SuperMart for commercial gain without prior written consent.
• Engage in any conduct that disrupts or interferes with the service.`,
  },
  {
    title: '10. Intellectual Property',
    body: 'All content on SuperMart — including the logo, product images, text, and software — is the property of SuperMart or its licensors. You may not reproduce, distribute, or create derivative works without our written permission.',
  },
  {
    title: '11. Limitation of Liability',
    body: `SuperMart shall not be liable for:
• Indirect, incidental, or consequential damages arising from the use of our service.
• Loss of data, profits, or business opportunities.
• Any issues arising from third-party payment gateways or delivery partners beyond our control.

Our total liability in any matter shall not exceed the value of your last order.`,
  },
  {
    title: '12. Governing Law',
    body: 'These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of Surat, Gujarat.',
  },
  {
    title: '13. Changes to Terms',
    body: 'We may update these Terms at any time. Continued use of the service after changes constitutes your acceptance of the new Terms. We will notify registered users of significant changes via email.',
  },
  {
    title: '14. Contact',
    body: 'For any questions about these Terms, contact us at:\nEmail: legal@supermart.in\nPhone: +91 98765 43210\nAddress: SuperMart, Kapodra Main Road, Surat – 395004, Gujarat, India.',
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showSearch={false} />

      <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-8">

        <div className="mb-2">
          <h1 className="text-2xl font-black text-gray-900">Terms & Conditions</h1>
        </div>
        <p className="text-xs text-gray-400 mb-6">Last updated: 27 May 2026</p>

        <p className="text-sm text-gray-600 leading-relaxed bg-white border border-gray-100 rounded-2xl p-4 shadow-sm mb-4">
          Please read these Terms & Conditions carefully before using the SuperMart platform. These terms form a binding agreement between you and SuperMart.
        </p>

        <div className="space-y-3">
          {SECTIONS.map((sec) => (
            <div key={sec.title} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 mb-2">{sec.title}</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{sec.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">Have questions about these terms?</p>
          <a href="/contact" className="text-sm font-semibold text-brand-600 hover:underline">
            Contact us →
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
}
