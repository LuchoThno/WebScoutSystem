import Image from 'next/image'

export default function Home() {
  return (
    <main style={{ padding: "1rem", textAlign: "center" }}>
      <h1>Bienvenido a Next.js</h1>
      <Image src="/logo.svg" alt="Logo" width={200} height={200} />
      <p>Esta es la página principal del proyecto.</p>
      <nav style={{ marginTop: '2rem' }}>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li><a href="/pages/actividades.html">Actividades</a></li>
          <li><a href="/pages/dirigentes.html">Dirigentes</a></li>
          <li><a href="/pages/documentos.html">Documentos</a></li>
          <li><a href="/pages/noticias.html">Noticias</a></li>
          <li><a href="/pages/visita.html">Visita</a></li>
          <li><a href="/pages/admin/dashboard.html">Admin Dashboard</a></li>
        </ul>
      </nav>
    </main>
  )
}
