// xl/sharedStrings.xml: one string per <si>, concatenating its <t> runs (rich text) and skipping phonetic <rPh> runs.
import { type XmlSink, xmlSink } from './xml.js'

export interface SharedStringsCollector extends XmlSink {
  readonly strings: string[]
}

export function sharedStringsCollector(onEntry: (count: number) => void): SharedStringsCollector {
  const strings: string[] = []
  let current: string[] | null = null
  let capturing = false
  let phoneticDepth = 0

  const sink = xmlSink({
    open(name) {
      if (name === 'si') current = []
      else if (name === 'rPh') phoneticDepth++
      else if (name === 't' && current !== null && phoneticDepth === 0) capturing = true
    },
    text(text) {
      if (capturing) current?.push(text)
    },
    close(name) {
      if (name === 't') capturing = false
      else if (name === 'rPh') phoneticDepth--
      else if (name === 'si' && current !== null) {
        strings.push(current.join(''))
        current = null
        onEntry(strings.length)
      }
    },
  })

  return { strings, push: sink.push }
}
