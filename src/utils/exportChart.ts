import * as Sharing from "expo-sharing";

export async function exportChartAsImage(viewShotRef: {
  current: { capture: () => any };
}) {
  const uri = await viewShotRef.current.capture();
  await Sharing.shareAsync(uri);
}
