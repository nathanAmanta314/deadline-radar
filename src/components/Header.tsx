import { ShieldCheck } from "lucide-react";
export function Header({
  page,
  storageState,
}: {
  page: string;
  storageState: string;
}) {
  return (
    <header className="topbar">
      <span className="breadcrumb">
        {page === "/settings"
          ? "03 / PREFERENCES"
          : page === "/archive"
            ? "02 / THE ARCHIVE"
            : "01 / YOUR DEADLINES, AT A GLANCE"}
      </span>
      <span className="local-indicator">
        <ShieldCheck size={15} />
        {storageState}
      </span>
    </header>
  );
}
