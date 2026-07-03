type CurrencyDisplayProps = {
  value: number;
  className?: string;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function CurrencyDisplay({ value, className }: CurrencyDisplayProps) {
  return <span className={className}>{currencyFormatter.format(value)}</span>;
}
