import type { ParentProps } from 'solid-js'

export default function Layout(props: ParentProps) {
  return (
    <div class="flex min-h-dvh flex-col">
      <div class="flex flex-1 flex-col">{props.children}</div>
      <footer class="border-t bg-card px-6 py-3 text-center text-sm text-muted-foreground">
        <span>© 2026 Michael Harding</span>
        <span class="mx-2">·</span>
        <a
          href="https://github.com/michael-harding/TabulaPersonae"
          target="_blank"
          rel="noopener noreferrer"
          class="underline-offset-4 hover:underline"
        >
          Source on GitHub
        </a>
        <span class="mx-2">·</span>
        <span>AGPLv3</span>
      </footer>
    </div>
  )
}
