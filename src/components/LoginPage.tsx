import React, { useState } from 'react';

type Role = 'ranger' | 'civilian';

interface LoginPageProps {
  onLogin: (role: Role, username: string) => void;
  onBack: () => void; // ✅ added
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onBack }) => {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) { setError('Please select a role to continue.'); return; }
    if (!username.trim()) { setError('Username is required.'); return; }
    if (!password.trim()) { setError('Password is required.'); return; }
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin(selectedRole, username.trim());
    }, 1000);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white flex flex-col">

      {/* ── Video Background ── */}
      <video
        autoPlay
        muted
        playsInline
        loop
        className="absolute z-0 w-full object-cover pointer-events-none"
        style={{ top: '300px', inset: 'auto 0 0 0', height: 'calc(100% - 300px)' }}
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4"
          type="video/mp4"
        />
      </video>

      {/* ── Gradient overlay ── */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-white via-white/80 to-white pointer-events-none" />

      {/* ── Nav ── */}
      <nav className="relative z-10 w-full px-8 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* ✅ Logo now clicks back to hero */}
          <button
            onClick={onBack}
            className="text-3xl tracking-tight bg-transparent border-none cursor-pointer p-0"
            style={{ fontFamily: '"Instrument Serif", serif', color: '#000000' }}
          >
            EchoGrid<sup style={{ fontSize: '0.5em', verticalAlign: 'super' }}>®</sup>
          </button>
          <span
            className="text-sm"
            style={{ fontFamily: '"Inter", sans-serif', color: '#6F6F6F' }}
          >
            Forest Acoustic Monitoring
          </span>
        </div>
      </nav>

      {/* ── Main content ── */}
      <div
        className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 text-center"
        style={{ paddingTop: 'calc(4rem - 75px)', paddingBottom: '10rem' }}
      >
        {/* Headline */}
        <h1
          className="animate-fade-rise"
          style={{
            fontFamily: '"Instrument Serif", serif',
            fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
            fontWeight: 400,
            lineHeight: 0.95,
            letterSpacing: '-2px',
            color: '#000000',
            maxWidth: '700px',
            marginBottom: '0.5rem',
          }}
        >
          Guard the forest,{' '}
          <em style={{ color: '#6F6F6F' }}>protect the silence.</em>
        </h1>

        {/* Subheading */}
        <p
          className="animate-fade-rise-delay"
          style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: '1rem',
            color: '#6F6F6F',
            maxWidth: '420px',
            marginTop: '1.5rem',
            lineHeight: 1.7,
          }}
        >
          Sign in to access the EchoGrid tactical dashboard. Rangers get full
          location and coordinate access.
        </p>

        {/* ── Login card ── */}
        <div
          className="animate-fade-rise-delay-2"
          style={{
            marginTop: '2.5rem',
            width: '100%',
            maxWidth: '400px',
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: '24px',
            padding: '32px 28px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.07)',
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            {/* Role picker */}
            <div>
              <p style={{
                fontFamily: '"Inter", sans-serif',
                fontSize: '11px',
                fontWeight: 500,
                color: '#6F6F6F',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '10px',
                textAlign: 'left',
              }}>
                Sign in as
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                {(['ranger', 'civilian'] as Role[]).map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    style={{
                      flex: 1,
                      padding: '14px 10px',
                      borderRadius: '14px',
                      border: selectedRole === role ? '1.5px solid #000' : '1.5px solid #e5e5e5',
                      background: selectedRole === role ? '#000' : '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '18px', marginBottom: '5px' }}>
                      {role === 'ranger' ? '🌲' : '👤'}
                    </div>
                    <div style={{
                      fontFamily: '"Instrument Serif", serif',
                      fontSize: '15px',
                      color: selectedRole === role ? '#fff' : '#000',
                      marginBottom: '3px',
                    }}>
                      {role === 'ranger' ? 'Ranger' : 'Civilian'}
                    </div>
                    <div style={{
                      fontFamily: '"Inter", sans-serif',
                      fontSize: '10px',
                      color: selectedRole === role ? 'rgba(255,255,255,0.65)' : '#6F6F6F',
                      lineHeight: 1.4,
                    }}>
                      {role === 'ranger' ? 'GPS · Coords · Full access' : 'Alerts · Acoustic feed'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Username */}
            <div style={{ textAlign: 'left' }}>
              <label style={{
                fontFamily: '"Inter", sans-serif',
                fontSize: '11px',
                fontWeight: 500,
                color: '#6F6F6F',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                display: 'block',
                marginBottom: '7px',
              }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1.5px solid #e5e5e5',
                  borderRadius: '12px',
                  fontFamily: '"Inter", sans-serif',
                  fontSize: '14px',
                  color: '#000',
                  background: '#fff',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = '#000'}
                onBlur={e => e.target.style.borderColor = '#e5e5e5'}
              />
            </div>

            {/* Password */}
            <div style={{ textAlign: 'left' }}>
              <label style={{
                fontFamily: '"Inter", sans-serif',
                fontSize: '11px',
                fontWeight: 500,
                color: '#6F6F6F',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                display: 'block',
                marginBottom: '7px',
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1.5px solid #e5e5e5',
                  borderRadius: '12px',
                  fontFamily: '"Inter", sans-serif',
                  fontSize: '14px',
                  color: '#000',
                  background: '#fff',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = '#000'}
                onBlur={e => e.target.style.borderColor = '#e5e5e5'}
              />
            </div>

            {/* Error */}
            {error && (
              <p style={{
                fontFamily: '"Inter", sans-serif',
                fontSize: '13px',
                color: '#b91c1c',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                padding: '10px 12px',
                textAlign: 'left',
                margin: 0,
              }}>
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="hover:scale-[1.03] transition-transform"
              style={{
                width: '100%',
                padding: '13px',
                background: loading ? '#555' : '#000000',
                color: '#ffffff',
                border: 'none',
                borderRadius: '999px',
                fontFamily: '"Inter", sans-serif',
                fontSize: '14px',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.01em',
                marginTop: '4px',
              }}
            >
              {loading ? 'Authenticating...' : 'Begin Journey'}
            </button>

          </form>

          {/* ✅ Back link */}
          <button
            onClick={onBack}
            style={{
              marginTop: '16px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: '"Inter", sans-serif',
              fontSize: '13px',
              color: '#6F6F6F',
              width: '100%',
            }}
          >
            ← Back to home
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;