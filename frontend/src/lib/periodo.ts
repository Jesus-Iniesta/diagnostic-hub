export function getCurrentPeriodo(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return `${year}${month <= 6 ? 'A' : 'B'}`;
}
