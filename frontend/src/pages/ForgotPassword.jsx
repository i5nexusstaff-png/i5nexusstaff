import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, KeyRound, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../services/api';
import AppLogo from '../components/AppLogo';

// Step 1: enter username → get masked phone
// Step 2: enter OTP + new password → reset
export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.forgotPassword(username.trim());
      setMaskedPhone(data.masked_phone);
      setName(data.name);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'User not found or no phone registered');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(username.trim(), otp.trim(), newPassword);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left brand panel */}
      <div className="hidden md:flex md:w-1/2 bg-primary flex-col items-center justify-center p-10 relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute -bottom-24 -right-16 w-96 h-96 bg-accent/20 rounded-full" />
        <div className="relative z-10 text-center">
          <div className="mb-6 flex justify-center">
            <AppLogo size={90} variant="full" />
          </div>
          <h1 className="text-4xl font-black text-white mb-2">i5 Nexus</h1>
          <p className="text-accent text-base font-semibold tracking-wide mb-4">Smart Control, Seamless Growth</p>
          <p className="text-blue-300 text-sm max-w-xs mx-auto">
            Enter your username and we'll verify via your registered mobile number.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-6 min-h-screen md:min-h-0">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex md:hidden flex-col items-center gap-2 mb-8">
            <AppLogo size={64} variant="full" />
            <p className="text-accent text-xs font-semibold tracking-wide">Smart Control, Seamless Growth</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-6 transition">
              <ArrowLeft size={15} /> Back to Login
            </Link>

            {done ? (
              <div className="text-center py-4">
                <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-800 mb-2">Password Reset!</h2>
                <p className="text-gray-500 text-sm mb-6">Your password has been changed successfully.</p>
                <button onClick={() => navigate('/login')}
                  className="w-full bg-accent text-white py-2.5 rounded-lg font-semibold hover:bg-accent-dark transition">
                  Go to Login
                </button>
              </div>
            ) : step === 1 ? (
              <>
                <h2 className="text-2xl font-bold text-gray-800 mb-1">Forgot Password</h2>
                <p className="text-gray-400 text-sm mb-6">Enter your username to receive an OTP on your registered mobile number.</p>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-5 text-sm">{error}</div>
                )}

                <form onSubmit={handleRequestOTP} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                    <input
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
                      placeholder="Enter your username"
                      required
                    />
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full bg-accent text-white py-2.5 rounded-lg font-semibold hover:bg-accent-dark transition disabled:opacity-60">
                    {loading ? 'Sending OTP…' : 'Send OTP'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-5 bg-blue-50 rounded-xl p-4">
                  <Phone size={20} className="text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">OTP sent to {maskedPhone}</p>
                    <p className="text-xs text-gray-500">Hi {name}, check your registered mobile</p>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-gray-800 mb-1">Enter OTP</h2>
                <p className="text-gray-400 text-sm mb-5">Check the backend terminal for OTP (dev mode). In production, SMS will be delivered.</p>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-5 text-sm">{error}</div>
                )}

                <form onSubmit={handleReset} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">OTP Code</label>
                    <input
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition tracking-[0.3em] font-mono text-center text-lg"
                      placeholder="• • • • • •"
                      maxLength={6}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
                        placeholder="Min. 6 characters"
                        required
                      />
                      <button type="button" onClick={() => setShowPw(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
                      placeholder="Re-enter new password"
                      required
                    />
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full bg-accent text-white py-2.5 rounded-lg font-semibold hover:bg-accent-dark transition disabled:opacity-60">
                    {loading ? 'Resetting…' : 'Reset Password'}
                  </button>
                  <button type="button" onClick={() => { setStep(1); setError(''); }}
                    className="w-full text-sm text-gray-400 hover:text-gray-600 py-1 transition">
                    ← Change username
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
