// AuthModal — handles 4 complete flows:
//   LOGIN_OTP   → mobile → OTP verify
//   LOGIN_EMAIL → email + password
//   REGISTER    → name/email/mobile/password → OTP verify → (optional) address
//   FORGOT      → email → OTP → new password

import { useState, useRef } from 'react';
import { authApi } from '../../api/auth.api.js';
import { useAuthStore } from '../../store/authStore.js';

const FLOW = {
  CHOOSE:         'choose',
  LOGIN_OTP:      'login_otp',
  LOGIN_OTP2:     'login_otp2',     // OTP entry
  LOGIN_EMAIL:    'login_email',
  REGISTER:       'register',
  REGISTER_OTP:   'register_otp',   // email OTP verify after registration
  REGISTER_ADDR:  'register_addr',  // optional address after verify
  FORGOT:         'forgot',
  FORGOT_OTP:     'forgot_otp',     // OTP + new password
  RESET_SUCCESS:  'reset_success',  // password reset done ✓
};

export default function AuthModal({ onClose, onSuccess }) {
  const [flow, setFlow]       = useState(FLOW.CHOOSE);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // Shared state across steps
  const [mobile, setMobile]   = useState('');
  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName]       = useState('');
  const [otp, setOtp]         = useState('');
  const [address, setAddress] = useState({ label: 'Home', line1: '', city: 'Surat', pincode: '', landmark: '' });

  const setAuth = useAuthStore((s) => s.setAuth);

  const clearError = () => setError('');

  const startResend = () => {
    setResendTimer(30);
    const iv = setInterval(() => setResendTimer(t => { if (t <= 1) { clearInterval(iv); return 0; } return t - 1; }), 1000);
  };

  const run = async (fn) => {
    setLoading(true); clearError();
    try { await fn(); }
    catch (e) { setError(e.message || 'Something went wrong'); }
    finally { setLoading(false); }
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const doSendOTP = () => run(async () => {
    if (!/^[6-9]\d{9}$/.test(mobile)) throw new Error('Enter a valid 10-digit mobile number');
    await authApi.sendOTP(mobile);
    setOtp('');
    setFlow(FLOW.LOGIN_OTP2);
    startResend();
  });

  const doVerifyOTP = () => run(async () => {
    if (otp.length !== 6) throw new Error('Enter the 6-digit OTP');
    const res = await authApi.verifyOTP(mobile, otp, name || undefined);
    setAuth(res.token, res.user);
    onSuccess?.();
  });

  const doLoginEmail = () => run(async () => {
    if (!email || !password) throw new Error('Enter email and password');
    const res = await authApi.login({ email, password });
    setAuth(res.token, res.user);
    onSuccess?.();
  });

  const doRegister = () => run(async () => {
    if (!name.trim()) throw new Error('Enter your name');
    if (!/^[6-9]\d{9}$/.test(mobile)) throw new Error('Enter a valid 10-digit mobile number');
    if (!email.includes('@')) throw new Error('Enter a valid email address');
    if (password.length < 8) throw new Error('Password must be at least 8 characters');
    if (password !== confirm) throw new Error('Passwords do not match');

    await authApi.register({ name, mobile, email, password, confirmPassword: confirm });
    setOtp('');
    setFlow(FLOW.REGISTER_OTP); // → email OTP step
    startResend();
  });

  const doRegisterVerifyOTP = () => run(async () => {
    if (otp.length !== 6) throw new Error('Enter the 6-digit OTP');
    const res = await authApi.verifyEmailOTP(email, otp); // ← email OTP
    setAuth(res.token, res.user);
    setFlow(FLOW.REGISTER_ADDR); // show optional address step
  });

  const doResendEmailVerify = () => run(async () => {
    await authApi.resendEmailVerify(email);
    startResend();
  });

  const doSaveAddress = () => run(async () => {
    if (address.line1.trim().length >= 5 && /^\d{6}$/.test(address.pincode)) {
      await authApi.addAddress({ ...address, isDefault: true });
    }
    onSuccess?.();
  });

  const doForgot = () => run(async () => {
    if (!email.includes('@')) throw new Error('Enter a valid email address');
    await authApi.forgotPassword(email);
    setOtp('');
    setFlow(FLOW.FORGOT_OTP);
    startResend();
  });

  const doResetPassword = () => run(async () => {
    if (otp.length !== 6) throw new Error('Enter the 6-digit OTP');
    if (password.length < 8) throw new Error('Password must be at least 8 characters');
    if (password !== confirm) throw new Error('Passwords do not match');
    await authApi.resetPassword({ email, code: otp, password, confirmPassword: confirm });
    setPass(''); setConfirm(''); setOtp('');
    setError('');
    setFlow(FLOW.RESET_SUCCESS);
  });

  // ── UI Helpers ────────────────────────────────────────────────────────────────

  const go = (f) => { setFlow(f); clearError(); setOtp(''); };

  const enter = (fn) => (e) => { if (e.key === 'Enter') fn(); };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl z-10
                      px-6 pt-8 pb-10 max-h-[92vh] overflow-y-auto">
        {/* Drag handle */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-200 rounded-full sm:hidden" />

        {/* Close */}
        <button onClick={onClose}
          className="absolute top-4 right-5 text-gray-400 hover:text-gray-600 text-2xl leading-none">
          &times;
        </button>

        {/* ── CHOOSE ─────────────────────────────────────────────────────────── */}
        {flow === FLOW.CHOOSE && (
          <>
            <Header icon="🛒" title="Welcome to SuperMart"
              sub="Login or create a new account to continue" />
            <div className="space-y-3">
              <PrimaryBtn onClick={() => go(FLOW.LOGIN_OTP)} label="Login with OTP" sub="Quick & secure" icon="📱" />
              <PrimaryBtn onClick={() => go(FLOW.LOGIN_EMAIL)} label="Login with Password" sub="Email & password" icon="🔑" />
              <div className="relative flex items-center py-1">
                <div className="flex-1 border-t border-gray-100" />
                <span className="px-3 text-xs text-gray-400">New user?</span>
                <div className="flex-1 border-t border-gray-100" />
              </div>
              <button onClick={() => go(FLOW.REGISTER)}
                className="w-full py-3 border-2 border-brand-500 text-brand-600 rounded-xl
                           font-semibold text-sm hover:bg-brand-50 transition-colors">
                Create New Account
              </button>
            </div>
          </>
        )}

        {/* ── LOGIN OTP — enter mobile ────────────────────────────────────────── */}
        {flow === FLOW.LOGIN_OTP && (
          <>
            <Header icon="📱" title="Login with OTP" sub="Enter your mobile number" back={() => go(FLOW.CHOOSE)} />
            <div className="space-y-4">
              <PhoneInput value={mobile} onChange={setMobile} onEnter={doSendOTP} />
              <SubmitBtn onClick={doSendOTP} loading={loading} label="Send OTP" />
              <button onClick={() => go(FLOW.LOGIN_EMAIL)}
                className="w-full text-sm text-center text-brand-600">
                Use email & password instead
              </button>
            </div>
          </>
        )}

        {/* ── LOGIN OTP — enter code ──────────────────────────────────────────── */}
        {flow === FLOW.LOGIN_OTP2 && (
          <>
            <Header icon="🔐" title="Enter OTP"
              sub={<>Sent to <strong>+91 {mobile}</strong></>}
              back={() => go(FLOW.LOGIN_OTP)} />
            <div className="space-y-4">
              <OtpInput value={otp} onChange={setOtp} onEnter={doVerifyOTP} />
              <SubmitBtn onClick={doVerifyOTP} loading={loading} label="Verify & Login" />
              <ResendRow timer={resendTimer} onResend={doSendOTP} onBack={() => go(FLOW.LOGIN_OTP)} />
            </div>
          </>
        )}

        {/* ── LOGIN EMAIL ─────────────────────────────────────────────────────── */}
        {flow === FLOW.LOGIN_EMAIL && (
          <>
            <Header icon="🔑" title="Login" sub="Enter your email and password"
              back={() => go(FLOW.CHOOSE)} />
            <div className="space-y-3">
              <Field type="email" placeholder="Email address" value={email}
                onChange={setEmail} onEnter={doLoginEmail} autoFocus />
              <Field type="password" placeholder="Password" value={password}
                onChange={setPass} onEnter={doLoginEmail} />
              <button onClick={() => { clearError(); go(FLOW.FORGOT); }}
                className="text-sm text-brand-600 font-medium hover:underline">
                Forgot password?
              </button>
              <SubmitBtn onClick={doLoginEmail} loading={loading} label="Login" disabled={!email || !password} />
              <button onClick={() => go(FLOW.LOGIN_OTP)}
                className="w-full text-sm text-center text-brand-600">
                Login with OTP instead
              </button>
            </div>
          </>
        )}

        {/* ── REGISTER ────────────────────────────────────────────────────────── */}
        {flow === FLOW.REGISTER && (
          <>
            <Header icon="✨" title="Create Account" sub="Fill in your details to get started"
              back={() => go(FLOW.CHOOSE)} />
            <div className="space-y-3">
              <Field placeholder="Full name *" value={name} onChange={setName} autoFocus />
              <PhoneInput value={mobile} onChange={setMobile} />
              <Field type="email" placeholder="Email address *" value={email} onChange={setEmail} />
              <Field type="password" placeholder="Create password (min 8 chars) *" value={password} onChange={setPass} />
              <Field type="password" placeholder="Confirm password *" value={confirm}
                onChange={setConfirm} onEnter={doRegister} />
              <p className="text-xs text-gray-400 flex items-start gap-1.5">
                <span>📧</span>
                <span>A 6-digit verification OTP will be sent to your email address to confirm your account.</span>
              </p>
              <SubmitBtn onClick={doRegister} loading={loading} label="Create Account & Get OTP"
                disabled={!name || !mobile || !email || !password || !confirm} />
            </div>
          </>
        )}

        {/* ── REGISTER — email OTP verify ─────────────────────────────────────── */}
        {flow === FLOW.REGISTER_OTP && (
          <>
            <Header icon="📧" title="Verify Your Email"
              sub={
                <span>
                  We've sent a 6-digit OTP to{' '}
                  <strong className="text-gray-800 break-all">{email}</strong>.
                  Check your inbox (and spam folder).
                </span>
              }
              back={() => go(FLOW.REGISTER)} />

            <div className="space-y-4">
              <OtpInput value={otp} onChange={setOtp} onEnter={doRegisterVerifyOTP} />

              <SubmitBtn onClick={doRegisterVerifyOTP} loading={loading}
                label="Verify & Complete Registration"
                disabled={otp.length !== 6} />

              <ResendRow timer={resendTimer}
                onResend={doResendEmailVerify}
                onBack={() => go(FLOW.REGISTER)} />

              {/* Email hint */}
              <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                Didn't receive it? Check your spam folder or tap{' '}
                <span className="font-semibold">Resend OTP</span> after the timer.
              </p>
            </div>
          </>
        )}

        {/* ── REGISTER ADDRESS (optional) ─────────────────────────────────────── */}
        {flow === FLOW.REGISTER_ADDR && (
          <>
            <Header icon="📍" title="Add Delivery Address"
              sub="Optional — you can also add this later" />
            <div className="space-y-2.5">
              {/* Label selector */}
              <div className="flex gap-2">
                {['Home', 'Office', 'Other'].map(l => (
                  <button key={l} onClick={() => setAddress(a => ({ ...a, label: l }))}
                    className={`px-3 py-1.5 rounded-xl text-sm border font-medium transition-colors
                      ${address.label === l
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'border-gray-200 text-gray-600 hover:border-brand-400'}`}>
                    {l}
                  </button>
                ))}
              </div>
              <AddrField placeholder="Flat/Building, Street *" k="line1" a={address} set={setAddress} />
              <AddrField placeholder="Area / Locality (optional)" k="line2" a={address} set={setAddress} />
              <div className="grid grid-cols-2 gap-2">
                <AddrField placeholder="City *" k="city" a={address} set={setAddress} />
                <AddrField placeholder="Pincode *" k="pincode" a={address} set={setAddress} inputMode="numeric" maxLength={6} />
              </div>
              <AddrField placeholder="Landmark (optional)" k="landmark" a={address} set={setAddress} />
              <SubmitBtn onClick={doSaveAddress} loading={loading} label="Save Address & Continue" />
              <button onClick={() => onSuccess?.()}
                className="w-full text-sm text-center text-gray-400 hover:text-gray-600">
                Skip for now
              </button>
            </div>
          </>
        )}

        {/* ── FORGOT PASSWORD — enter email ───────────────────────────────────── */}
        {flow === FLOW.FORGOT && (
          <>
            <Header icon="🔒" title="Forgot Password"
              sub="Enter your registered email to receive an OTP"
              back={() => go(FLOW.LOGIN_EMAIL)} />
            <div className="space-y-4">
              <Field type="email" placeholder="Registered email address"
                value={email} onChange={setEmail} onEnter={doForgot} autoFocus />
              <SubmitBtn onClick={doForgot} loading={loading} label="Send Reset OTP"
                disabled={!email.includes('@')} />
            </div>
          </>
        )}

        {/* ── FORGOT PASSWORD — OTP + new password ───────────────────────────── */}
        {flow === FLOW.FORGOT_OTP && (
          <>
            <Header icon="🔑" title="Reset Password"
              sub={<>OTP sent to <strong>{email}</strong></>}
              back={() => go(FLOW.FORGOT)} />
            <div className="space-y-3">
              <OtpInput value={otp} onChange={setOtp} />
              <Field type="password" placeholder="New password (min 8 chars)" value={password} onChange={setPass} />
              <Field type="password" placeholder="Confirm new password" value={confirm}
                onChange={setConfirm} onEnter={doResetPassword} />
              <SubmitBtn onClick={doResetPassword} loading={loading} label="Reset Password"
                disabled={otp.length !== 6 || !password || !confirm} />
              <ResendRow timer={resendTimer} onResend={doForgot} onBack={() => go(FLOW.FORGOT)} />
            </div>
          </>
        )}

        {/* ── RESET SUCCESS ───────────────────────────────────────────────────── */}
        {flow === FLOW.RESET_SUCCESS && (
          <div className="flex flex-col items-center text-center py-4">
            {/* Animated checkmark circle */}
            <div className="w-20 h-20 rounded-full bg-green-50 border-4 border-brand-500
                            flex items-center justify-center mb-5">
              <svg className="w-10 h-10 text-brand-600" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-2">Password Reset!</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-8">
              Your password has been updated successfully.<br />
              You can now log in with your new password.
            </p>

            <button
              onClick={() => { go(FLOW.LOGIN_EMAIL); }}
              className="w-full py-3 bg-brand-600 text-white rounded-xl font-semibold text-base
                         hover:bg-brand-700 active:scale-95 transition-all">
              Back to Login
            </button>
          </div>
        )}

        {/* Error */}
        {error && flow !== FLOW.RESET_SUCCESS && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm
                          rounded-xl px-4 py-3 text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Reusable sub-components ───────────────────────────────────────────────────

function Header({ icon, title, sub, back }) {
  return (
    <div className="mb-6">
      {back && (
        <button onClick={back} className="flex items-center gap-1 text-sm text-gray-400
                                           hover:text-gray-600 mb-3 -ml-1">
          <span>←</span> Back
        </button>
      )}
      <div className="text-3xl mb-2">{icon}</div>
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      <p className="text-sm text-gray-500 mt-1">{sub}</p>
    </div>
  );
}

function PrimaryBtn({ onClick, label, sub, icon }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 border-2 border-gray-100
                 rounded-xl hover:border-brand-300 hover:bg-brand-50 transition-colors text-left">
      <span className="text-2xl">{icon}</span>
      <div>
        <div className="font-semibold text-gray-800 text-sm">{label}</div>
        <div className="text-xs text-gray-400">{sub}</div>
      </div>
      <span className="ml-auto text-gray-300">→</span>
    </button>
  );
}

function Field({ type = 'text', placeholder, value, onChange, onEnter, autoFocus, inputMode, maxLength }) {
  const [showPass, setShowPass] = useState(false);
  const isPassword = type === 'password';
  const inputType  = isPassword ? (showPass ? 'text' : 'password') : type;

  return (
    <div className={isPassword ? 'relative' : undefined}>
      <input
        type={inputType}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onEnter ? (e) => e.key === 'Enter' && onEnter() : undefined}
        autoFocus={autoFocus}
        inputMode={inputMode}
        maxLength={maxLength}
        className={`w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none
                   focus:border-brand-500 transition-colors bg-white
                   ${isPassword ? 'pr-11' : ''}`}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPass(v => !v)}
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-0.5">
          {showPass ? (
            /* Eye-off — password visible, click to hide */
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7
                   a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878
                   l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59
                   m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7
                   a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            /* Eye — password hidden, click to show */
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7
                   -1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

function PhoneInput({ value, onChange, onEnter }) {
  return (
    <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden
                    focus-within:border-brand-500 transition-colors">
      <span className="px-3 py-3 bg-gray-50 text-gray-600 font-medium text-sm border-r border-gray-200">
        +91
      </span>
      <input
        type="tel" inputMode="numeric" placeholder="Mobile number" maxLength={10}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        onKeyDown={onEnter ? (e) => e.key === 'Enter' && onEnter() : undefined}
        className="flex-1 px-3 py-3 text-base outline-none bg-white"
        autoFocus
      />
    </div>
  );
}

function OtpInput({ value, onChange, onEnter }) {
  return (
    <input
      type="tel" inputMode="numeric" placeholder="• • • • • •"
      maxLength={6} value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
      onKeyDown={onEnter ? (e) => e.key === 'Enter' && onEnter() : undefined}
      className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl outline-none
                 focus:border-brand-500 text-2xl tracking-[0.5em] text-center font-mono"
      autoFocus
    />
  );
}

function SubmitBtn({ onClick, loading, label, disabled }) {
  return (
    <button onClick={onClick}
      disabled={loading || disabled}
      className="w-full py-3 bg-brand-600 text-white rounded-xl font-semibold text-base
                 disabled:opacity-50 hover:bg-brand-700 active:scale-95 transition-all">
      {loading ? 'Please wait...' : label}
    </button>
  );
}

function ResendRow({ timer, onResend, onBack }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <button onClick={onBack} className="text-gray-500 hover:text-gray-700">← Change</button>
      {timer > 0
        ? <span className="text-gray-400">Resend in {timer}s</span>
        : <button onClick={onResend} className="text-brand-600 font-medium">Resend OTP</button>
      }
    </div>
  );
}

function AddrField({ placeholder, k, a, set, inputMode, maxLength }) {
  return (
    <input
      placeholder={placeholder}
      value={a[k] || ''}
      inputMode={inputMode}
      maxLength={maxLength}
      onChange={(e) => {
        const v = inputMode === 'numeric' ? e.target.value.replace(/\D/g, '') : e.target.value;
        set(prev => ({ ...prev, [k]: v }));
      }}
      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none
                 focus:border-brand-500 transition-colors"
    />
  );
}
