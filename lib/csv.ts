// Parser simple de CSV: soporta campos entre comillas con comas adentro.
// No cubre todos los casos raros de la especificación CSV, alcanza para
// los exports típicos de Excel/Sheets que arma la arquitecta.
export function parseCsv(text: string): string[][] {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.length > 0);
  const rows: string[][] = [];

  for (const line of lines) {
    const fields: string[] = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQuotes) {
        if (c === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cur += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        fields.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
    fields.push(cur);
    rows.push(fields.map((f) => f.trim()));
  }

  return rows;
}
