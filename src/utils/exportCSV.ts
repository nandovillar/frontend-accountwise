import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

export async function exportExpensesToCSV(expenses) {
  let csv = "fecha,categoria,descripcion,cantidad\n";

  expenses.forEach((item) => {
    csv += `${item.date},${item.category},${item.description},${item.amount}\n`;
  });

  const fileUri = FileSystem.cacheDirectory + "gastos.csv";

  await FileSystem.writeAsStringAsync(fileUri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  await Sharing.shareAsync(fileUri);
}
