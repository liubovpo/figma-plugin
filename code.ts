interface SheetRow {
  [key: string]: string;
}

figma.showUI(__html__);

function csvToJson(csv: string): SheetRow[] {
  const lines = csv
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line); // Trim each line and filter out any empty lines
  const result: SheetRow[] = [];
  if (lines.length < 2) return result; // Ensure there's at least one data row

  const headers = lines[0].split(",").map((header) => header.trim()); // Assuming the first row contains headers

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map((cell) => cell.trim());
    if (cells.length < headers.length) continue; // Ensure the row has the required number of cells

    const obj: SheetRow = headers.reduce((acc, header, index) => {
      acc[header] = cells[index] || ""; // Assign each cell to its corresponding header, default to empty string if undefined
      return acc;
    }, {} as SheetRow);

    result.push(obj);
  }
  return result;
}

async function fetchSheetData(sheetUrl: string): Promise<SheetRow[]> {
  const corsProxy = "https://corsproxy.io/?";

  try {
    const response = await fetch(`${corsProxy}${sheetUrl}`);
    if (!response.ok) throw new Error("Network response was not ok.");
    const csvText = await response.text();
    console.log(csvText);
    return csvToJson(csvText);
  } catch (error) {
    console.error("Failed to fetch:", error);
    return [];
  }
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === "update-text") {
    const sheetData = await fetchSheetData(msg.url);
    const textNodes = figma.currentPage.findAll(
      (node) => node.type === "TEXT"
    ) as TextNode[];

    const nodeNameMatchCount: { [key: string]: number } = {};
    for (const node of textNodes) {
      let contentFound = false;

      if (!nodeNameMatchCount[node.name]) {
        nodeNameMatchCount[node.name] = 0;
      }

      const matchIndex = nodeNameMatchCount[node.name];
      const nodeNameLower = node.name.toLowerCase();

      const matchingRows = sheetData.filter((row) =>
        Object.keys(row).some(
          (key) => `#${key.toLowerCase()}` === nodeNameLower
        )
      );
      const matchingSplitCells1 = sheetData.filter((row) =>
        Object.keys(row).some(
          (key) => `#${key.toLowerCase()}1` === nodeNameLower
        )
      );
      const matchingSplitCells2 = sheetData.filter((row) =>
        Object.keys(row).some(
          (key) => `#${key.toLowerCase()}2` === nodeNameLower
        )
      );

      if (matchingRows.length > matchIndex) {
        const matchingRow = matchingRows[matchIndex];
        for (const key of Object.keys(matchingRow)) {
          const keyWithHash = `#${key.toLowerCase()}`;
          if (keyWithHash === nodeNameLower) {
            await figma.loadFontAsync(node.fontName as FontName);
            node.characters = matchingRow[key];
            contentFound = matchingRow[key] !== "";
            break;
          }
        }
        nodeNameMatchCount[node.name] += 1;
      }

      if (matchingSplitCells1.length > matchIndex) {
        const matchingSplitCell1 = matchingSplitCells1[matchIndex];

        for (const key of Object.keys(matchingSplitCell1)) {
          if (`#${key.toLocaleLowerCase()}1` === nodeNameLower) {
            await figma.loadFontAsync(node.fontName as FontName);
            node.characters = matchingSplitCell1[key].split(" - ")[0];
            contentFound = true;
            break;
          }
        }
        nodeNameMatchCount[node.name] += 1;
      }

      if (matchingSplitCells2.length > matchIndex) {
        const matchingSplitCell2 = matchingSplitCells2[matchIndex];

        for (const key of Object.keys(matchingSplitCell2)) {
          if (`#${key.toLocaleLowerCase()}2` === nodeNameLower) {
            await figma.loadFontAsync(node.fontName as FontName);
            node.characters = matchingSplitCell2[key].split(" - ")[1];
            contentFound = true;
            break;
          }
        }
        nodeNameMatchCount[node.name] += 1;
      }
      node.visible = contentFound;
    }
    // figma.closePlugin("Text layers updated from Google Sheets.");
  }
};
