interface Props {
  groups: string[];
  selected: string;
  counts: Record<string, number>;
  total: number;
  onSelect: (group: string) => void;
}

export function GroupTabs({ groups, selected, counts, total, onSelect }: Props) {
  return (
    <div className="group-tabs">
      <button
        className={`group-tab ${selected === "" ? "active" : ""}`}
        onClick={() => onSelect("")}
      >
        all <span className="count">{total}</span>
      </button>
      {groups.map((g) => (
        <button
          key={g}
          className={`group-tab ${selected === g ? "active" : ""}`}
          onClick={() => onSelect(g)}
        >
          {g} <span className="count">{counts[g] ?? 0}</span>
        </button>
      ))}
    </div>
  );
}
