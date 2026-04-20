export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export const GRADE_LABEL: Record<string, string> = {
  baru: "Baru",
  seperti_baru: "Seperti Baru",
  bekas_baik: "Bekas — Baik",
  bekas_layak: "Bekas — Layak",
};
