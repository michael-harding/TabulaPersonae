// @vitest-environment node
import path from 'path'

import { build, type Rollup } from 'vite'
import solid from 'vite-plugin-solid'

import { stripDataAttributesBabelPlugin } from '../../../vite-plugins/strip-data-attributes'

type BabelPlugins = NonNullable<Extract<NonNullable<Parameters<typeof solid>[0]>['babel'], { plugins?: unknown }>['plugins']>

async function compileFixture(plugins: BabelPlugins): Promise<string> {
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    plugins: [solid({ babel: { plugins } })],
    build: {
      write: false,
      minify: false,
      lib: { entry: path.resolve(__dirname, 'fixtures/strip-data-attributes-fixture.tsx'), formats: ['es'] },
      rollupOptions: { external: [/^solid-js/] },
    },
  }) as Rollup.RollupOutput[]
  return result[0].output[0].code
}

describe('stripDataAttributesBabelPlugin', () => {
  it('leaves data-test/data-sem in place when not applied', async () => {
    const code = await compileFixture([])
    expect(code).toMatch(/data-test=root/)
    expect(code).toMatch(/"data-sem"/)
  }, 30_000)

  it('removes every data-test/data-sem attribute without corrupting surrounding code', async () => {
    const code = await compileFixture([stripDataAttributesBabelPlugin])
    // The only surviving occurrence is the user-visible string literal, which isn't an attribute.
    expect(code.match(/data-test/g)).toEqual(['data-test'])
    expect(code).toContain('literal data-test={x} string')
    expect(code).not.toMatch(/data-sem/)
    // Code after a `/'/` regex and after a JSX comment mentioning data-test={...} survives.
    expect(code).toContain('kept-after-quote')
    expect(code).toContain('kept-text')
  }, 30_000)
})
