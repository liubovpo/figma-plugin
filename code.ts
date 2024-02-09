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
  if (msg.type === "update-text") {
    const sheetData = await fetchSheetData(msg.url);
    const textNodes = figma.currentPage.findAll(
      (node) => node.type === "TEXT"
    ) as TextNode[];
    console.log(sheetData);

    for (const node of textNodes) {
      for (const node of textNodes) {
        // Find a row where any key matches node.name (prefixed with '#')
        sheetData.forEach(row => {
          Object.keys(row).forEach(key => {
            const keyWithHash = `#${key.toLocaleLowerCase()}`;
            if (keyWithHash === node.name.toLocaleLowerCase()) {
              // Load the font for the node
              figma.loadFontAsync(node.fontName as FontName).then(() => {
                // Once the font is loaded, set the node's characters to the value of the matched key
                node.characters = row[key];
              });
            }
          });
        });
      }
    }

    // figma.closePlugin("Text layers updated from Google Sheets.");
  }
};
