declare module 'plotly.js-basic-dist-min' {
  const Plotly: {
    react: (
      elemento: HTMLElement,
      datos: object[],
      disposicion: object,
      configuracion: object,
    ) => Promise<unknown>
    purge: (elemento: HTMLElement) => void
  }
  export default Plotly
}
