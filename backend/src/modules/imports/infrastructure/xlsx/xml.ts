// Streaming XML over byte chunks with saxes. Namespace prefixes are stripped from element names so that
// `<x:row>` and `<row>` read the same; attributes keep their raw names.
import { SaxesParser, type SaxesTagPlain } from 'saxes'

export interface XmlHandlers {
  open?(name: string, attributes: Record<string, string>): void
  close?(name: string): void
  text?(text: string): void
}

export interface XmlSink {
  push(chunk: Uint8Array, final: boolean): void
}

export function localName(name: string): string {
  const colon = name.indexOf(':')
  return colon === -1 ? name : name.slice(colon + 1)
}

/** Reads the attribute named `name` with any namespace prefix (`r:id`, `id`). */
export function attribute(attributes: Record<string, string>, name: string): string | undefined {
  if (attributes[name] !== undefined) return attributes[name]
  for (const [key, value] of Object.entries(attributes)) {
    if (localName(key) === name) return value
  }
  return undefined
}

/** A sink that feeds decoded chunks to a saxes parser; saxes throws on malformed XML. */
export function xmlSink(handlers: XmlHandlers): XmlSink {
  const parser = new SaxesParser({ xmlns: false, position: false })
  const decoder = new TextDecoder('utf-8')
  if (handlers.open) {
    const open = handlers.open
    parser.on('opentag', (tag: SaxesTagPlain) => open(localName(tag.name), tag.attributes))
  }
  if (handlers.close) {
    const close = handlers.close
    parser.on('closetag', (tag: SaxesTagPlain) => close(localName(tag.name)))
  }
  if (handlers.text) parser.on('text', handlers.text)
  return {
    push(chunk, final) {
      parser.write(decoder.decode(chunk, { stream: !final }))
      if (final) parser.close()
    },
  }
}
