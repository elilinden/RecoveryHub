type DateDisplayProps = {
  value: string;
  prefix?: string;
  className?: string;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function DateDisplay({ value, prefix, className }: DateDisplayProps) {
  return (
    <time className={className} dateTime={value}>
      {prefix ? `${prefix} ` : ""}
      {dateFormatter.format(new Date(`${value}T00:00:00Z`))}
    </time>
  );
}
