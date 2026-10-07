type CsvValue = string | number | null | undefined;
export function csvText(rows: CsvValue[][]): string {
  const escape = (value: CsvValue) => {
    let text = value == null ? '' : String(value);
    const first = Array.from(text).find(char => char.charCodeAt(0) > 31 && !/\s/.test(char));
    if (typeof value === 'string' && first && '=+-@'.includes(first)) text = "'" + text;
    return /[;"\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  };
  return '\uFEFF' + rows.map(row => row.map(escape).join(';')).join('\r\n');
}
export function downloadCsv(name: string, rows: CsvValue[][]): void {
  const blob = new Blob([csvText(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = Array.from(name.replace(/[<>:"/\\|?*]/g, '-')).map(char => char.charCodeAt(0) < 32 ? '-' : char).join('').replace(/^\.+/, '').slice(0, 120) + '.csv';
  document.body.appendChild(link);
  try { link.click(); }
  finally { link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1_000); }
}
