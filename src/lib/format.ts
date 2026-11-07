export const currency = (amount: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", currencyDisplay: "code", maximumFractionDigits: 0 }).format(amount);

export const timeLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-KE", { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
