// Fixture for strip-data-attributes.test.ts — each element exercises an input that broke the
// previous text-scanning stripper. Not imported by the app.
export function Fixture(props: { x: string; i: number }) {
  return (
    <div data-test="root" data-sem="root">
      {/* pass data-test={id} to children */}
      <span data-test={props.x.replace(/'/g, '')} title="kept-after-quote">a</span>
      <span data-test={`slot-${props.i}`} data-sem={props.i > 0 ? 'a' : 'b'}>kept-text</span>
      <p>{"literal data-test={x} string"}</p>
    </div>
  )
}
