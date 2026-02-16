import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold border-4 border-black inline-block px-4 py-2 bg-[#FFE66D] shadow-[4px_4px_0_0_#000] mb-6">
        Login
      </h1>
      <form onSubmit={handleSubmit} className="card-nb space-y-4">
        {error && (
          <div className="border-2 border-black bg-[#FF6B6B] text-white px-3 py-2 font-medium">
            {error}
          </div>
        )}
        <div>
          <label className="block font-bold mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-nb"
            required
          />
        </div>
        <div>
          <label className="block font-bold mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-nb"
            required
          />
        </div>
        <button type="submit" disabled={loading} className="btn-nb btn-nb-primary w-full">
          {loading ? 'Logging in…' : 'Login'}
        </button>
        <p className="text-sm">
          No account? <Link to="/register" className="font-semibold text-black underline">Register</Link>
        </p>
      </form>
    </div>
  );
}
