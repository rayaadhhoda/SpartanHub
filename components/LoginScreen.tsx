import React, { useState } from 'react';
import { Shield, Lock, ArrowLeft, User, Mail, Building, AtSign, AlertCircle } from 'lucide-react';
import { SJSU_DEPARTMENTS } from '../constants';

interface LoginScreenProps {
  onLogin: (username: string, department?: string) => void;
}

// Mock database of existing users for validation simulation
const MOCK_TAKEN_USERNAMES = ['admin', 'spartan', 'sjsu', 'root', 'test'];
const MOCK_TAKEN_EMAILS = ['admin@sjsu.edu', 'president@sjsu.edu', 'test@sjsu.edu'];

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [view, setView] = useState<'landing' | 'login' | 'signup'>('landing');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [password, setPassword] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState(''); // Username or Email for login

  const clearError = () => setError(null);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      // Basic mock validation for login
      if (password.length < 4) {
        setError("Invalid credentials. Please try again.");
        setIsLoading(false);
        return;
      }

      const displayUser = loginIdentifier.includes('@') ? loginIdentifier.split('@')[0] : loginIdentifier;
      onLogin(displayUser);
      setIsLoading(false);
    }, 1000);
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setIsLoading(true);

    // Simulate API call and Validation
    setTimeout(() => {
      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError("Please enter a valid email address.");
        setIsLoading(false);
        return;
      }

      // Check for taken username
      if (MOCK_TAKEN_USERNAMES.includes(username.toLowerCase())) {
        setError(`The username '${username}' is already taken.`);
        setIsLoading(false);
        return;
      }

      // Check for taken email
      if (MOCK_TAKEN_EMAILS.includes(email.toLowerCase())) {
        setError(`The email '${email}' is already associated with an account.`);
        setIsLoading(false);
        return;
      }

      // Pass the Full Name as the display user for a friendlier welcome message
      onLogin(name, department);
      setIsLoading(false);
    }, 1000);
  };

  const handleGuestLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      onLogin('Guest User');
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#E5A823] to-[#0055A2] font-sans p-4 transition-all duration-500">
      
      {/* Main Card */}
      <div className="bg-white dark:bg-gray-900 w-full max-w-[480px] rounded-2xl shadow-2xl p-8 sm:p-10 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500 relative overflow-hidden transition-colors">
        
        {/* Back Button for forms */}
        {view !== 'landing' && (
          <button 
            onClick={() => {
              setView('landing');
              clearError();
            }}
            className="absolute top-6 left-6 text-gray-400 hover:text-sjsu-blue dark:hover:text-blue-400 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
          >
            <ArrowLeft size={20} />
          </button>
        )}

        {/* Logo Header - Always visible */}
        <div className="mb-6 mt-2">
           <img 
             src="universityasset.png" 
             alt="Spartan Logo" 
             className="h-16 w-auto object-contain mx-auto"
           />
        </div>
        
        {view === 'landing' && (
          <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-right-8 duration-300">
            <h1 className="text-3xl font-serif font-bold text-sjsu-blue dark:text-blue-400 mb-2">
              Spartan<span className="text-sjsu-gold">Hub</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-10">
              Proprietary Research & Knowledge Platform
            </p>

            {/* Login Button */}
            <button 
              onClick={() => setView('login')}
              className="w-full bg-[#0055A2] hover:bg-[#004488] text-white font-bold py-3.5 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 mb-4"
            >
              <Shield size={20} />
              <span>Log In</span>
            </button>

            {/* Sign Up Button */}
            <button 
              onClick={() => setView('signup')}
              className="w-full bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800 text-[#0055A2] dark:text-blue-300 border-2 border-[#0055A2] dark:border-blue-500 font-bold py-3.5 rounded-lg transition-all flex items-center justify-center gap-3 mb-6"
            >
              <User size={20} />
              <span>Create Account</span>
            </button>

            {/* Divider */}
            <div className="relative w-full flex items-center justify-center mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
              </div>
              <span className="relative bg-white dark:bg-gray-900 px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                OR
              </span>
            </div>

            {/* Guest Action */}
            <button 
              onClick={handleGuestLogin}
              className="text-gray-500 dark:text-gray-400 hover:text-[#0055A2] dark:hover:text-blue-300 font-semibold text-sm transition-colors mb-2"
            >
              Continue as Guest
            </button>
          </div>
        )}

        {view === 'login' && (
          <form onSubmit={handleLoginSubmit} className="w-full text-left animate-in fade-in slide-in-from-right-8 duration-300">
            <h2 className="text-2xl font-serif font-bold text-sjsu-blue dark:text-blue-400 mb-6 text-center">Welcome Back</h2>
            
            {error && (
              <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Username or Email</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    required
                    value={loginIdentifier}
                    onChange={(e) => {
                      setLoginIdentifier(e.target.value);
                      clearError();
                    }}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-sjsu-blue focus:border-transparent outline-none transition-all dark:text-white dark:placeholder-gray-500"
                    placeholder="username or email@example.com"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearError();
                    }}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-sjsu-blue focus:border-transparent outline-none transition-all dark:text-white dark:placeholder-gray-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0055A2] hover:bg-[#004488] text-white font-bold py-3.5 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                'Sign In'
              )}
            </button>
            <p className="text-center text-xs text-gray-400 mt-4">
              Hint: Use username <strong>admin</strong> for admin access.
            </p>
          </form>
        )}

        {view === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="w-full text-left animate-in fade-in slide-in-from-right-8 duration-300">
            <h2 className="text-2xl font-serif font-bold text-sjsu-blue dark:text-blue-400 mb-1 text-center">Join SpartanHub</h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs text-center mb-6">Create your faculty account</p>
            
            {error && (
              <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wide">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-sjsu-blue focus:border-transparent outline-none transition-all dark:text-white dark:placeholder-gray-500"
                  placeholder="Dr. Sammy Spartan"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wide">Username</label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    required
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      clearError();
                    }}
                    className={`w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition-all dark:text-white dark:placeholder-gray-500 ${
                      error && error.includes('username') 
                        ? 'border-red-300 dark:border-red-800 focus:ring-red-500' 
                        : 'border-gray-200 dark:border-gray-700 focus:ring-sjsu-blue'
                    }`}
                    placeholder="spartan_1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wide">Department</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <select 
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-sjsu-blue focus:border-transparent outline-none transition-all appearance-none cursor-pointer text-sm truncate dark:text-white"
                  >
                    {SJSU_DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wide">Email</label>
                <div className="relative">
                   <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                   <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearError();
                    }}
                    className={`w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition-all dark:text-white dark:placeholder-gray-500 ${
                      error && (error.includes('email') || error.includes('valid')) 
                        ? 'border-red-300 dark:border-red-800 focus:ring-red-500' 
                        : 'border-gray-200 dark:border-gray-700 focus:ring-sjsu-blue'
                    }`}
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wide">Password</label>
                <div className="relative">
                   <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                   <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-sjsu-blue focus:border-transparent outline-none transition-all dark:text-white dark:placeholder-gray-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#E5A823] hover:bg-yellow-500 text-sjsu-blue font-bold py-3.5 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-blue-900/30 border-t-blue-900 rounded-full animate-spin"></span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        )}

        {/* Security Footer - Always visible */}
        <div className="mt-8 flex items-center justify-center gap-2 text-gray-400 dark:text-gray-500 text-xs font-medium">
          <Lock size={12} />
          <span>Secure Single Sign-On</span>
        </div>
      </div>

      {/* Page Footer */}
      <div className="mt-8 text-white/80 text-xs font-medium tracking-wide">
        © 2025 San Jose State University. For authorized use only.
      </div>

    </div>
  );
};

export default LoginScreen;