import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/store';
import { Play, Mail, Lock, User, AlertCircle } from 'lucide-react';

export default function Register() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await register(form);
      router.push('/dashboard');
    } catch (e: any) { setError(e.message || 'Registration failed'); }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-700 flex items-center justify-center p-4">
      <Head><title>Sign Up - NexaStream</title></Head>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-white mb-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center"><Play size={24} className="text-purple-600 fill-purple-600" /></div>
            <span className="text-2xl font-bold">NexaStream</span>
          </Link>
          <h1 className="text-3xl font-bold text-white">Create Account</h1>
          <p className="text-purple-200">Start earning USDC from day one!</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-2xl">
          {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 p-3 rounded-lg mb-4"><AlertCircle size={18} /><span>{error}</span></div>}

          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">Full Name</label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full pl-10 pr-4 py-3 border rounded-lg focus:border-purple-500 outline-none" placeholder="John Doe" />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">Email</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="w-full pl-10 pr-4 py-3 border rounded-lg focus:border-purple-500 outline-none" placeholder="you@example.com" />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">Username</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
              <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })} required className="w-full pl-10 pr-4 py-3 border rounded-lg focus:border-purple-500 outline-none" placeholder="johndoe" />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required className="w-full pl-10 pr-4 py-3 border rounded-lg focus:border-purple-500 outline-none" placeholder="Min 8 characters" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="mt-4 text-center text-gray-600 text-sm">By signing up, you agree to our <Link href="/terms" className="text-purple-600">Terms</Link> and <Link href="/privacy" className="text-purple-600">Privacy Policy</Link></p>

          <div className="mt-6 text-center">
            <p className="text-gray-600">Already have an account? <Link href="/login" className="text-purple-600 font-semibold">Login</Link></p>
          </div>
        </form>
      </div>
    </div>
  );
}
