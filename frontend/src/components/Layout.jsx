import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b-4 border-black bg-[#4ECDC4] px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Link to="/" className="font-bold text-xl text-black no-underline">
            HemoLink
          </Link>
          <span className="text-xs border-2 border-black px-2 py-0.5 bg-white/80 font-semibold hidden sm:inline">AI · ML · NLP</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link to="/request" className="font-semibold text-black no-underline border-2 border-black px-3 py-1.5 bg-[#FFE66D] shadow-[3px_3px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#000]">
            Emergency SOS
          </Link>
          {user ? (
            <>
              <Link to="/donor" className="font-semibold text-black no-underline">
                My donor profile
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="font-semibold border-2 border-black px-3 py-1.5 bg-white shadow-[3px_3px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="font-semibold text-black no-underline">
                Login
              </Link>
              <Link to="/register" className="font-semibold border-2 border-black px-3 py-1.5 bg-[#FF6B9D] text-black no-underline shadow-[3px_3px_0_0_#000]">
                Register
              </Link>
            </>
          )}
        </nav>
      </header>
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
