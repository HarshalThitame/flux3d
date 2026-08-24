import type { ReactNode } from 'react'

type AuthShellProps = {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}

export default function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: AuthShellProps) {
  return (
    <section className="luxe-shell">
      <div className="luxe-inner">
        <div className="luxe-copy">
          <p className="luxe-eyebrow">{eyebrow}</p>
          <h1 className="luxe-title">{title}</h1>
          <span className="luxe-rule" aria-hidden="true" />
          <p className="luxe-sub">{description}</p>
        </div>

        <div className="luxe-panel-wrap">
          <div className="luxe-panel">{children}</div>
        </div>
      </div>
    </section>
  )
}
