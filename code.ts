interface SheetRow {
  [key: string]: string; // Updated to accommodate dynamic property names
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

  // Process each data row
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

// Keep the rest of your functions unchanged
async function fetchSheetData(sheetUrl: string): Promise<SheetRow[]> {
  const corsProxy = "https://corsproxy.io/?"; // Make sure this proxy works or adjust accordingly

  try {
    const response = await fetch(`${corsProxy}${sheetUrl}`);
    if (!response.ok) throw new Error("Network response was not ok.");
    const csvText = await response.text();
    console.log(csvText);
    return csvToJson(csvText); // Convert and return JSON data
  } catch (error) {
    console.error("Failed to fetch:", error);
    return []; // Return an empty array in case of error
  }
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'update-text') {
    const sheetData = await fetchSheetData(msg.url); // Fetch and parse the CSV data
    const textNodes = figma.currentPage.findAll(node => node.type === "TEXT") as TextNode[];

    // New logic for updating nodes
    const nodeNameMatchCount: { [key: string]: number } = {};
    for (const node of textNodes) {
      if (!nodeNameMatchCount[node.name]) {
        nodeNameMatchCount[node.name] = 0;
      }

      const matchIndex = nodeNameMatchCount[node.name];
      const matchingRows = sheetData.filter(row => Object.keys(row).some(key => `#${key.toLowerCase()}` === node.name.toLowerCase()));

      if (matchingRows.length > matchIndex) {
        const matchingRow = matchingRows[matchIndex];
        for (const key of Object.keys(matchingRow)) {
          const keyWithHash = `#${key}`;
          if (keyWithHash === node.name) {
            await figma.loadFontAsync(node.fontName as FontName);
            node.characters = matchingRow[key];
            break; // Exit the loop after setting characters to avoid unnecessary iterations
          }
        }
        nodeNameMatchCount[node.name] += 1;
      } else {
        console.log(`No additional match found for node: ${node.name} at index ${matchIndex}`);
      }
    }

    // figma.closePlugin("Text layers updated from Google Sheets.");
  }
};
