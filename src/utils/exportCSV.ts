import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

export async function exportExpensesToCSV(expenses: any[]) {
  let csv = "fecha,categoría,descripción,cantidad\n";

  expenses.forEach((item) => {
    csv += `${item.date},${item.category},${item.description},${item.amount}\n`;
  });

  const file = new File(Paths.cache, "gastos.csv");

  file.write(csv, { encoding: "utf8" });

  await Sharing.shareAsync(file.uri);
}
