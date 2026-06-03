import Header from '../components/layout/Header.jsx';
import Footer from '../components/layout/Footer.jsx';

const SECTIONS = [
  {
    icon: '✅',
    title: 'What can be returned?',
    content: [
      'Damaged or broken products on delivery',
      'Expired or near-expiry products (expiry date within 3 days of delivery)',
      'Wrong item delivered (different from what was ordered)',
      'Sealed packaged goods that are unopened and in original condition',
    ],
    type: 'list',
  },
  {
    icon: '❌',
    title: 'What cannot be returned?',
    content: [
      'Fresh fruits and vegetables (unless damaged or rotten on delivery)',
      'Opened or partially consumed products',
      'Products with removed labels or tampered packaging',
      'Items returned after 24 hours of delivery',
      'Perishables like milk, bread, curd (unless spoilt on delivery)',
    ],
    type: 'list',
  },
  {
    icon: '📋',
    title: 'How to raise a return request',
    content: [
      'Step 1: Go to My Orders in your account within 24 hours of delivery.',
      'Step 2: Select the order and tap "Report an Issue".',
      'Step 3: Select the item(s) and describe the problem (optional photo helps).',
      'Step 4: Our team reviews and approves the return within 2 hours.',
      'Step 5: Replacement or refund is processed within 2–3 business days.',
    ],
    type: 'steps',
  },
  {
    icon: '💰',
    title: 'Refunds',
    content: [
      'Approved refunds are credited to your original payment method.',
      'UPI & card refunds: 5–7 business days (depends on your bank).',
      'COD refunds: transferred via UPI/bank transfer within 3 business days.',
      'You will receive an SMS and email confirmation once the refund is initiated.',
    ],
    type: 'list',
  },
  {
    icon: '🔄',
    title: 'Replacements',
    content: [
      'If you prefer a replacement instead of a refund, we will deliver the correct item in the next available delivery slot — usually within the same day or next day.',
    ],
    type: 'para',
  },
];

export default function ReturnPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showSearch={false} />

      <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-8">

        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900">Return Policy</h1>
          <p className="text-sm text-gray-500 mt-1">Easy returns within 24 hours — no questions asked for eligible items.</p>
        </div>

        {/* Quick summary pill */}
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mb-6">
          <span className="text-2xl flex-shrink-0">⚡</span>
          <div>
            <p className="text-sm font-bold text-green-800">24-hour return window</p>
            <p className="text-xs text-green-700">Report damaged or wrong items within 24 hours of delivery for a hassle-free resolution.</p>
          </div>
        </div>

        <div className="space-y-4">
          {SECTIONS.map((sec) => (
            <div key={sec.title} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{sec.icon}</span>
                <h2 className="text-sm font-bold text-gray-900">{sec.title}</h2>
              </div>

              {sec.type === 'list' && (
                <ul className="space-y-2">
                  {sec.content.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-brand-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm text-gray-600 leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              {sec.type === 'steps' && (
                <ol className="space-y-2">
                  {sec.content.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-5 h-5 bg-brand-600 text-white text-[10px] font-black rounded-full
                                       flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-600 leading-relaxed">{item.replace(/^Step \d+: /, '')}</span>
                    </li>
                  ))}
                </ol>
              )}

              {sec.type === 'para' && (
                <p className="text-sm text-gray-600 leading-relaxed">{sec.content[0]}</p>
              )}
            </div>
          ))}
        </div>

        {/* Need help CTA */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400 mb-2">Need help with a return?</p>
          <a href="/contact"
            className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-brand-600 text-brand-600
                       text-sm font-bold rounded-xl hover:bg-brand-50 active:scale-95 transition-all">
            Contact Support →
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
}
