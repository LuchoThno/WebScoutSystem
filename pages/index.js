export default function Home() {
  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      maxWidth: '1200px',
      margin: '0 auto',
      backgroundImage: 'url("/campamento-bg.jpg")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      color: '#fff',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      textAlign: 'center',
      padding: '1rem',
      boxSizing: 'border-box',
    }}>
      <style jsx>{`
        @media (max-width: 600px) {
          main {
            padding: 0.5rem;
          }
          h1 {
            font-size: 2rem !important;
          }
          p {
            font-size: 1rem !important;
          }
          a.button {
            font-size: 1rem !important;
            padding: 0.75rem 1.5rem !important;
          }
        }
        a.button {
          background-color: rgba(255, 255, 255, 0.85);
          color: #4a90e2;
          padding: 1rem 2rem;
          border-radius: 8px;
          font-weight: bold;
          font-size: 1.25rem;
          text-decoration: none;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          transition: background-color 0.3s ease;
        }
        a.button:hover {
          background-color: rgba(224, 224, 224, 0.85);
        }
      `}</style>
      <img src="/logo.svg" alt="Scout Logo" width={150} height={150} style={{ marginBottom: '2rem', maxWidth: '80vw', height: 'auto' }} />
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem', textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>Sistema de Gestión Scout</h1>
      <p style={{ fontSize: '1.25rem', marginBottom: '3rem', textShadow: '1px 1px 3px rgba(0,0,0,0.6)' }}>
        Bienvenido al sistema de gestión. Haga clic en el botón para ingresar.
      </p>
      <a href="/pages/actividades.html" className="button">
        Entrar al Proyecto Scout
      </a>
    </main>
  )
}
