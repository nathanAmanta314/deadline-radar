import { Radar } from "lucide-react";

export function Navigation({
  page,
  archiveCount,
}: {
  page: string;
  archiveCount: number;
}) {
  return (
    <header className="site-navigation">
      <a href="#/" className="brand" aria-label="Deadline Radar home">
        <span className="brand-icon">
          <Radar size={23} strokeWidth={1.8} />
        </span>
        <span>
          Deadline Radar<span className="brand-period">.</span>
        </span>
      </a>
      <nav aria-label="Main navigation">
        <a
          className={page === "/" ? "current" : ""}
          aria-current={page === "/" ? "page" : undefined}
          href="#/"
        >
          Overview
        </a>
        <a
          className={page === "/archive" ? "current" : ""}
          aria-current={page === "/archive" ? "page" : undefined}
          href="#/archive"
        >
          Archive <span className="nav-count">{archiveCount}</span>
        </a>
        <a
          className={page === "/settings" ? "current" : ""}
          aria-current={page === "/settings" ? "page" : undefined}
          href="#/settings"
        >
          Settings
        </a>
      </nav>
    </header>
  );
}
