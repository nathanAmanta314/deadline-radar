export type Filter =
  "All" | "Active" | "Due soon" | "Today" | "Overdue" | "Completed";
export function SummaryBar({
  counts,
  filter,
  setFilter,
}: {
  counts: Record<string, number>;
  filter: Filter;
  setFilter: (f: Filter) => void;
}) {
  return (
    <div className="summary-bar">
      {Object.entries(counts).map(([label, count]) => (
        <button
          key={label}
          data-status={label.toLowerCase().replace(" ", "-")}
          aria-pressed={filter === label}
          className={`summary-card ${filter === label ? "chosen" : ""} ${label === "Overdue" ? "overdue-summary" : ""}`}
          onClick={() =>
            setFilter(filter === label ? "All" : (label as Filter))
          }
        >
          <span>{label === "Today" ? "Due today" : label}</span>
          <strong>{count}</strong>
          <small>
            {label === "Active"
              ? "On your radar"
              : label === "Due soon"
                ? "Within 7 days"
                : label === "Today"
                  ? "In focus today"
                  : label === "Overdue"
                    ? "Needs your attention"
                    : "Finished"}
          </small>
        </button>
      ))}
    </div>
  );
}
