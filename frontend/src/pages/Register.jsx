import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, name, 'seeker');
      navigate('/');
    } catch (err) {
      setError(err.message || 'Register failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold border-4 border-black inline-block px-4 py-2 bg-[#95E1A3] shadow-[4px_4px_0_#000] mb-6">
        Register
      </h1>
      <form onSubmit={handleSubmit} className="card-nb space-y-4">
        {error && (
          <div className="border-2 border-black bg-[#FF6B6B] text-white px-3 py-2 font-medium">
            {error}
          </div>
        )}
        <div>
          <label className="block font-bold mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-nb"
            required
          />
        </div>
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
        <p className="text-sm text-black/70">After signup you can add a donor profile and/or request blood.</p>
        <button type="submit" disabled={loading} className="btn-nb btn-nb-primary w-full">
          {loading ? 'Registering…' : 'Register'}
        </button>
        <p className="text-sm">
          Already have an account? <Link to="/login" className="font-semibold text-black underline">Login</Link>
        </p>
      </form>
    </div>
  );
}
