// Babel plugin that removes `data-test` / `data-sem` JSX attributes in production builds.
// These attributes are stable test selectors and semantic labels for dev/test and must not
// ship to production per §6.8–9 of the Constitution.
//
// Operates on the parsed JSX AST rather than raw source text, so attribute-like text inside
// comments or strings, and expressions containing quotes, braces or regex literals, can't
// confuse it. Passed to vite-plugin-solid's `babel` option, which already runs Babel — no
// extra dependency. The removal runs in its own traversal on Program entry because
// babel-preset-solid compiles each JSXElement as soon as it's entered, before a plain
// JSXAttribute visitor in the same pass would ever see the attributes.

const STRIPPED = new Set(['data-test', 'data-sem'])

interface JSXAttributePath {
  node: { name: { type: string; name?: unknown } }
  remove(): void
}

interface ProgramPath {
  traverse(visitor: { JSXAttribute(path: JSXAttributePath): void }): void
}

export function stripDataAttributesBabelPlugin() {
  return {
    name: 'strip-data-attributes',
    visitor: {
      Program(program: ProgramPath) {
        program.traverse({
          JSXAttribute(path) {
            const { name } = path.node
            if (name.type === 'JSXIdentifier' && typeof name.name === 'string' && STRIPPED.has(name.name)) {
              path.remove()
            }
          },
        })
      },
    },
  }
}
