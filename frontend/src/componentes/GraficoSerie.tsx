import { useEffect, useRef } from 'react'
import { armarSerie } from '../servicios/serie'
import type { Punto } from '../servicios/cliente'

interface Props {
  puntos: Punto[]
  unidad: string
  titulo: string
}

export function GraficoSerie({ puntos, unidad, titulo }: Props) {
  const contenedor = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const elemento = contenedor.current
    if (!elemento) {
      return
    }
    let vigente = true
    // Plotly pesa cerca de 1 MB: se carga solo al abrir un histórico.
    void import('plotly.js-basic-dist-min').then(({ default: Plotly }) => {
      if (!vigente) {
        return
      }
      const color = getComputedStyle(elemento).color
      const serie = armarSerie(puntos)
      void Plotly.react(
        elemento,
        [
          {
            x: serie.x,
            y: serie.y,
            type: 'scatter',
            mode: 'lines',
            connectgaps: false,
            line: { color: '#2f7fb5', width: 1.5 },
            hovertemplate: `%{x}<br>%{y} ${unidad}<extra></extra>`,
          },
        ],
        {
          margin: { l: 48, r: 12, t: 12, b: 40 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          font: { color, family: 'system-ui, sans-serif', size: 12 },
          xaxis: { type: 'date', gridcolor: 'rgba(127,127,127,.25)' },
          yaxis: {
            title: { text: unidad },
            gridcolor: 'rgba(127,127,127,.25)',
            zerolinecolor: 'rgba(127,127,127,.4)',
          },
        },
        { responsive: true, displayModeBar: false },
      )
    })
    return () => {
      vigente = false
      void import('plotly.js-basic-dist-min').then(({ default: Plotly }) => Plotly.purge(elemento))
    }
  }, [puntos, unidad])

  return <div ref={contenedor} className="grafico" role="img" aria-label={titulo} />
}
