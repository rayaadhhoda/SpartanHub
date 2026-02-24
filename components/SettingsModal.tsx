import React, { useState, useEffect, useRef } from 'react';
import { X, Shield, Monitor, Moon, Sun, ChevronRight, Lock, Key, ExternalLink, AlertTriangle, LogIn, BellRing, Mail, CheckCircle, Smartphone } from 'lucide-react';
import { UserRole } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onOpenAdmin: () => void;
  userRole?: UserRole;
  onAdminLogin: (email: string, password: string) => Promise<boolean | 'mfa_required'>;
  mfaRequired: boolean;
  onMfaVerify: (code: string) => Promise<boolean>;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  toggleTheme,
  onOpenAdmin,
  userRole,
  onAdminLogin,
  mfaRequired,
  onMfaVerify,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'admin'>('general');

  // Login form state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // TOTP state
  const [totpCode, setTotpCode] = useState('');
  const [totpError, setTotpError] = useState('');
  const [isTotpSubmitting, setIsTotpSubmitting] = useState(false);
  const totpInputRef = useRef<HTMLInputElement>(null);

  // Google Group Subscription State
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [email, setEmail] = useState('');

  const GOOGLE_GROUP_URL =
    'https://groups.google.com/a/sjsu.edu/g/ai-teaching--learning-sjsu-group';

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setAdminEmail('');
      setAdminPassword('');
      setAuthError('');
      setTotpCode('');
      setTotpError('');
      setIsSubmitting(false);
      setIsTotpSubmitting(false);
    }
  }, [isOpen]);

  // Auto-focus TOTP input when MFA step appears
  useEffect(() => {
    if (mfaRequired && isOpen) {
      setTimeout(() => totpInputRef.current?.focus(), 100);
    }
  }, [mfaRequired, isOpen]);

  if (!isOpen) return null;

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);

    try {
      const result = await onAdminLogin(adminEmail.trim(), adminPassword);
      if (result === true) {
        // No MFA — access granted, nothing more needed
        setAdminEmail('');
        setAdminPassword('');
      } else if (result === 'mfa_required') {
        // MFA required — parent will flip mfaRequired prop, triggering TOTP screen
        setAdminEmail('');
        setAdminPassword('');
      } else {
        setAuthError('Invalid credentials or not authorized as admin.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTotpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setTotpError('');
    setIsTotpSubmitting(true);

    try {
      const ok = await onMfaVerify(totpCode.replace(/\s/g, ''));
      if (!ok) {
        setTotpError('Invalid code. Please try again.');
        setTotpCode('');
        totpInputRef.current?.focus();
      }
    } finally {
      setIsTotpSubmitting(false);
    }
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    window.open(GOOGLE_GROUP_URL, '_blank', 'noopener,noreferrer');
  };

  const TabButton = ({ id, label, icon: Icon }: { id: 'general' | 'admin'; label: string; icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 group ${activeTab === id
          ? 'bg-sjsu-blue text-white shadow-lg shadow-blue-900/20'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
    >
      <div className="flex items-center gap-3">
        <Icon
          size={18}
          className={`${activeTab === id ? 'text-sjsu-gold' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}
        />
        <span className="font-semibold">{label}</span>
      </div>
      {activeTab === id && <ChevronRight size={16} className="opacity-60" />}
    </button>
  );

  // ── Admin tab content ─────────────────────────────────────────────────────

  const renderAdminContent = () => {
    // Already admin
    if (userRole === 'admin') {
      return (
        <>
          <div className="mb-8 relative">
            <div className="w-24 h-24 bg-sjsu-blue/10 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <Lock size={48} className="text-sjsu-blue dark:text-blue-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-sjsu-gold p-2 rounded-full border-4 border-white dark:border-gray-900">
              <Key size={16} className="text-sjsu-blue" />
            </div>
          </div>

          <h3 className="text-2xl font-serif font-bold text-gray-900 dark:text-white mb-3">
            Admin Console Access
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            You are authenticated as an Administrator. Access the dashboard to upload resources, manage tags, and view system analytics.
          </p>

          <div className="w-full space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-left">
              <div className="flex items-center gap-3 mb-2">
                <Shield size={16} className="text-sjsu-gold" />
                <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Security Level</span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">Administrator Permissions. Full access granted.</p>
            </div>

            <button
              onClick={onOpenAdmin}
              className="w-full group relative flex items-center justify-center gap-3 px-8 py-4 bg-sjsu-blue hover:bg-blue-800 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-blue-900/30 overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                Enter Admin Console <ExternalLink size={18} />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </button>
          </div>
        </>
      );
    }

    // MFA verification step
    if (mfaRequired) {
      return (
        <>
          <div className="mb-6">
            <div className="w-20 h-20 bg-sjsu-blue/10 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto">
              <Smartphone size={36} className="text-sjsu-blue dark:text-blue-400" />
            </div>
          </div>

          <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-white mb-2">
            Two-Factor Authentication
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm leading-relaxed">
            Open your authenticator app and enter the 6-digit code shown for SpartanHub.
          </p>

          <form onSubmit={handleTotpVerify} className="w-full max-w-xs space-y-4">
            {/* 6-digit code input */}
            <div>
              <input
                ref={totpInputRef}
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={totpCode}
                onChange={(e) => {
                  // Allow only digits
                  const val = e.target.value.replace(/\D/g, '');
                  setTotpCode(val);
                  setTotpError('');
                }}
                placeholder="000000"
                className={`w-full text-center text-3xl font-mono tracking-[0.5em] py-4 bg-gray-50 dark:bg-gray-800 border rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all dark:text-white ${totpError
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-200 dark:border-gray-700 focus:ring-sjsu-blue'
                  }`}
                required
              />
            </div>

            {totpError && (
              <div className="text-xs text-red-500 flex items-center justify-center gap-1 animate-in slide-in-from-top-1">
                <AlertTriangle size={12} /> {totpError}
              </div>
            )}

            <button
              type="submit"
              disabled={totpCode.length !== 6 || isTotpSubmitting}
              className="w-full flex items-center justify-center gap-2 px-8 py-3 bg-sjsu-blue text-white font-bold rounded-xl hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isTotpSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Verifying…
                </span>
              ) : (
                <><Shield size={16} /> Verify Code</>
              )}
            </button>
          </form>
        </>
      );
    }

    // Default: credentials step
    return (
      <>
        <div className="mb-6 relative">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center border-2 border-gray-200 dark:border-gray-700">
            <Shield size={32} className="text-gray-400" />
          </div>
        </div>

        <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-white mb-2">
          Restricted Access
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
          Please verify your credentials to access the Administrative Console.
        </p>

        <form onSubmit={handleAdminAuth} className="w-full max-w-sm space-y-4">
          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => { setAdminEmail(e.target.value); setAuthError(''); }}
              placeholder="Admin email"
              className={`w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all dark:text-white ${authError ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-700 focus:ring-sjsu-blue'
                }`}
              required
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => { setAdminPassword(e.target.value); setAuthError(''); }}
              placeholder="Password"
              className={`w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all dark:text-white ${authError ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-700 focus:ring-sjsu-blue'
                }`}
              required
            />
          </div>

          {authError && (
            <div className="text-xs text-red-500 flex items-center justify-center gap-1 animate-in slide-in-from-top-1">
              <AlertTriangle size={12} /> {authError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl hover:bg-black dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 dark:border-gray-400/40 border-t-white dark:border-t-gray-900 rounded-full animate-spin" />
                Authenticating…
              </span>
            ) : (
              <><LogIn size={16} /> Authenticate</>
            )}
          </button>
        </form>
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="bg-white dark:bg-gray-900 w-full max-w-5xl h-[80vh] rounded-2xl shadow-2xl flex overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-10 border border-gray-100 dark:border-gray-800">

        {/* Sidebar */}
        <div className="w-72 bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col p-6">
          <div className="mb-8 pl-2">
            <h2 className="text-xl font-serif font-bold text-sjsu-blue dark:text-blue-400 flex items-center gap-2">
              Settings
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-500 font-semibold uppercase tracking-wider mt-1">Configuration</p>
          </div>

          <div className="space-y-2 flex-1">
            <TabButton id="general" label="General & Appearance" icon={Monitor} />
            <TabButton id="admin" label="Admin Portal" icon={Shield} />
          </div>

          <div className="mt-auto pt-6 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-400 text-center font-semibold">
            Prototype
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 relative">

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors z-20"
          >
            <X size={24} />
          </button>

          <div className="flex-1 overflow-y-auto p-8 lg:p-10 custom-scrollbar">

            {/* ── GENERAL TAB ────────────────────────────────────────────── */}
            {activeTab === 'general' && (
              <div className="max-w-3xl space-y-10 animate-in slide-in-from-right-4 duration-300">

                {/* Appearance */}
                <section>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Appearance</h3>
                  <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${isDarkMode ? 'bg-gray-700 text-sjsu-gold' : 'bg-blue-100 text-sjsu-blue'}`}>
                        {isDarkMode ? <Moon size={24} /> : <Sun size={24} />}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white">Theme Mode</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {isDarkMode ? 'Dark mode is active' : 'Light mode is active'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sjsu-blue dark:focus:ring-offset-gray-900 ${isDarkMode ? 'bg-sjsu-blue' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm transform transition-transform duration-300 ${isDarkMode ? 'translate-x-7' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </section>

                <hr className="border-gray-100 dark:border-gray-800" />

                {/* Notifications */}
                <section>
                  <h3 className="text-2xl font-serif font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                    <BellRing className="text-sjsu-blue dark:text-sjsu-gold" size={24} />
                    Notifications &amp; Alerts
                  </h3>

                  <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/10 dark:to-gray-800 border border-blue-100 dark:border-blue-900/30 rounded-xl p-6">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="bg-sjsu-gold p-3 rounded-full text-white shrink-0">
                        <Mail size={24} />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Subscribe to SpartanHub Updates</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                          Join the official Google Group to receive daily summaries of new resources, administrative announcements, and platform updates directly to your inbox.
                        </p>
                      </div>
                    </div>

                    {isSubscribed ? (
                      <div className="flex flex-col items-center justify-center py-4 animate-in zoom-in-95">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-3">
                          <CheckCircle size={24} />
                        </div>
                        <h5 className="font-bold text-green-700 dark:text-green-400">Successfully Subscribed!</h5>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          You will receive a confirmation email at <strong>{email}</strong> shortly.
                        </p>
                        <button
                          onClick={() => { setIsSubscribed(false); setEmail(''); }}
                          className="mt-4 text-xs text-sjsu-blue hover:underline font-semibold"
                        >
                          Subscribe another email
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleSubscribe} className="space-y-4">
                        <p className="text-xs text-center text-gray-400">
                          You'll be prompted to sign in with your SJSU Google account.
                        </p>
                        <button
                          type="button"
                          onClick={(e) => handleSubscribe(e as any)}
                          className="w-full bg-sjsu-blue hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
                        >
                          Join Google Group <ExternalLink size={16} />
                        </button>
                        <p className="text-xs text-center text-gray-400">
                          By subscribing, you agree to receive automated email notifications from SpartanHub.
                        </p>
                      </form>
                    )}
                  </div>
                </section>

                <hr className="border-gray-100 dark:border-gray-800" />

                {/* System Health */}
                <section>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">System Health</h3>
                  <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
                    <div className="w-2 h-2 mt-2 bg-green-500 rounded-full animate-pulse" />
                    <div>
                      <h4 className="font-bold text-green-800 dark:text-green-400 text-sm">All Systems Operational</h4>
                      <p className="text-xs text-green-700 dark:text-green-500 mt-1">Knowledge base indexing active. Last sync: Today at 09:00 AM PST.</p>
                    </div>
                  </div>
                </section>

              </div>
            )}

            {/* ── ADMIN TAB ──────────────────────────────────────────────── */}
            {activeTab === 'admin' && (
              <div className="h-full flex flex-col items-center justify-center animate-in slide-in-from-right-4 duration-300 text-center max-w-lg mx-auto">
                {renderAdminContent()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;