export function SigningMethods() {
  return (
    <section className="card" aria-labelledby="methods-title">
      <h2 id="methods-title">Elegí cómo firmar</h2>
      <article className="method" aria-labelledby="method-local">
        <h3 id="method-local">Firma propia</h3>
        <p>
          Firma electrónica con el certificado de Firmadoc: es inmediata, pero sin la presunción legal de la firma
          digital.
        </p>
        <button type="button" disabled aria-describedby="method-local-status">
          Firmar
        </button>
        <span id="method-local-status" className="method-status">
          Disponible próximamente
        </span>
      </article>
    </section>
  )
}
