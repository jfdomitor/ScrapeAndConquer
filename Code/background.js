// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => 
{

    if (message.action === 'domAsJson') {
      // Execute the script to read the DOM
      chrome.scripting.executeScript({
        target: { tabId: message.tabId },
        func: convertDOMToJson,
      })
        .then((results) => {
          const domJson = results[0].result; // Get the DOM JSON from the function
          saveJsonToFile(domJson, "dom.json"); // Save it as a JSON file
          sendResponse({ domJson: true });
        })
        .catch((err) => {
          console.error("Error:", err);
          sendResponse({ success: false, error: err });
        });

      // Indicate that we will send a response asynchronously
      return true;
    }
    if (message.action === 'tablesAsJson') {
      // Execute the script to read the DOM
      chrome.scripting.executeScript({
        target: { tabId: message.tabId },
        func: convertDOMToJson,
      })
        .then((results) => {
          const tableTemplate = getTableTemplate();
          const domJson = results[0].result; // Get the DOM JSON from the function
          const tableJson = extractTemplateData(domJson, tableTemplate);
          saveJsonToFile(tableJson, "tables.json"); // Save it as a JSON file
          sendResponse({ success: true });
        })
        .catch((err) => {
          console.error("Error:", err);
          sendResponse({ success: false, error: err });
        });

      // Indicate that we will send a response asynchronously
      return true;
    }

    if (message.action === 'templateBased') {
      // Execute the script to read the DOM
      chrome.scripting.executeScript({
        target: { tabId: message.tabId },
        func: convertDOMToJson,
      })
        .then((results) => {
          const domJson = results[0].result; // Get the DOM JSON from the function
          const tableJson = extractTemplateData(domJson, message.template);
          saveJsonToFile(tableJson, "tables_(template).json"); // Save it as a JSON file
          sendResponse({ success: true });
        })
        .catch((err) => {
          console.error("Error:", err);
          sendResponse({ success: false, error: err });
        });

      // Indicate that we will send a response asynchronously
      return true;
    }

});

function getTableTemplate() {
  return {
  "tableTagNames": ["TABLE"],
  "tableAttributes": {},

  "tableHeaderTagNames": ["THEAD"],
  "tableHeaderAttributes": {},

  "tableHeaderRowTagNames": ["TR"],
  "tableHeaderRowAttributes": {},
  
  "staticTableHeaderColumnNames": [],
  "tableHeaderColumnTagNames": ["TH"],
  "tableHeaderColumnAttributes": {},
  
  "tableBodyTagNames": ["TBODY"],
  "tableBodyAttributes": {},
  
  "rowTagNames": ["TR"],
  "rowAttributes": {},
  
  "columnTagNames": ["TD"],
  "columnAttributes": {}
  };
}


// Function to convert the DOM to JSON
function convertDOMToJson() 
{

      function serializeNode(node) 
      {
        // Exclude certain nodes based on tag name or other conditions
        if (shouldExcludeNode(node)) {
          return null;  // Return null for excluded nodes
        }
      
        const obj = {};
        obj.tagName = node.tagName;
        obj.nodeType = node.nodeType;
      
        if (node.attributes) {
          obj.attributes = {};
          for (const attr of node.attributes) {
            obj.attributes[attr.name] = attr.value;
          }
        }
        
      
        if (node.nodeType === Node.TEXT_NODE) {
          obj.text = node.nodeValue.trim();
        } else if (node.childNodes && node.childNodes.length === 1 && node.childNodes[0].nodeType === Node.TEXT_NODE) {
          obj.text = node.textContent.trim();
        }
      
        if (node.childNodes && node.childNodes.length > 0) {
          // Recursively serialize children and filter out null values
          const children = Array.from(node.childNodes)
            .map(serializeNode) // Serialize each child
            .filter(child => (child !== null)); // Filter out the excluded nodes (which are `null`)
          
          if (children.length > 0) {  // Only add the `children` property if there are valid children
            obj.children = children;
          }
        }
      
        return obj;
      }
      
      // Helper function to determine if a node should be excluded
      function shouldExcludeNode(node) {
        // Example: Exclude certain tags like <script> or <style>
        const excludedTags = ['SCRIPT', 'STYLE','BR','HR','NAV','INPUT','PATH','SVG','G'];
      
        // If the node is an element and matches an excluded tag, return true
        if (node.nodeType === Node.ELEMENT_NODE && excludedTags.includes(node.tagName)) {
          return true;
        }
      
        // Example: Exclude nodes with specific classes
        if (node.nodeType === Node.ELEMENT_NODE && node.classList && node.classList.contains('exclude-this-class')) {
          return true;
        }
      
        // You can also exclude nodes based on other properties, like attributes, IDs, etc.
        if (node.nodeType === Node.ELEMENT_NODE && node.id === 'exclude-this-id') {
          return true;
        }
    
        if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()==='' && !node.attributes)
        {
          if (!node.childNodes)
              return true;
          if (node.childNodes.length===0)
             return true;
        }
      
      
        // Add other exclusion conditions here as needed
      
        return false;  // Return false to include the node
      }

      
      return serializeNode(document.documentElement);


}

 

function extractTemplateData(serializedDOM, template) {
  const extractedTablesData = [];
  const jsonTemplate = template;

  if (!jsonTemplate) {
    throw new Error("Invalid template (1)");
  }

  if (!jsonTemplate.tableTagNames) {
    throw new Error("Invalid template (2)");
  }

  // Recursively search for template elements
  function findTablesByTemplate(node) {
    if (IsTable(node)) {
      const tableData = { rows: [] };
      let columnHeaders = [];

      // Find <THEAD> and extract column headers
      const thead = findDeepChild(node, IsTableHeader);
      if (thead) {
        const headerRow = findDeepChild(thead, IsTableHeaderRow);
        if (headerRow) {
          columnHeaders = (headerRow.children || []) // Null check for `headerRow.children`
          .filter(IsTableHeaderColumn) // Include <TD> or <TH>
          .map(cell => findDeepText(cell)); 
        }
      }

      // If no <THEAD> is found, fallback to generic column names
      if (columnHeaders.length === 0) {
        const firstRow = findDeepChild(node, IsRow) || {};
        columnHeaders = findDeepChildren(firstRow, IsColumn); // Use deep search for columns
        columnHeaders = Array.from(columnHeaders).map((_, index) => `column${index + 1}`);
      }

      // Find <TBODY> and extract rows
      const tbody = findDeepChild(node, IsTableBody);
      const rows = tbody
        ? tbody.children.filter(IsRow)
        : findDeepChildren(node, IsRow); // Use rows from <TBODY> or deep search under <TABLE>

      // Process each row with deep search for text in cells
      rows.forEach(row => {
        const rowData = {};

        const cells = findDeepChildren(row, IsColumn); // Use deep search for columns
        cells.forEach((cell, index) => {
          const columnName = columnHeaders[index] || `column${index + 1}`; // Use header name or fallback to column1, column2, etc.
          
          // Use deep search for text in the cell
          let cellText = findDeepText(cell); // This now uses deep search instead of just checking `cell.text`
          
          rowData[columnName] = cellText; // Store the found text
        });

        tableData.rows.push(rowData); // Add the row data to the table
      });

      extractedTablesData.push(tableData);
    }

    if (node.children) {
      node.children.forEach(child => findTablesByTemplate(child));
    }
  }

  // Helper to find the first matching child element at any depth
  function findDeepChild(node, predicate) {
    if (!node || !node.children) return null;
    for (const child of node.children) {
      if (predicate(child)) {
        return child;
      }
      const deepChild = findDeepChild(child, predicate);
      if (deepChild) {
        return deepChild;
      }
    }
    return null;
  }

  // Helper to find all matching child elements at any depth
  function findDeepChildren(node, predicate) {
    const results = [];
    if (!node || !node.children) return results;
    for (const child of node.children) {
      if (predicate(child)) {
        results.push(child);
      }
      results.push(...findDeepChildren(child, predicate));
    }
    return results;
  }

  function findDeepText(node) {
    // Check if the node itself has text
    if (node.text && node.text.trim()) {
      return node.text.trim();
    }
  
    // Otherwise, check its children recursively
    if (!node.children) return "";
    for (const child of node.children) {
      const childText = findDeepText(child);
      if (childText) {
        return childText; // Return first non-empty text found
      }
    }
  
    return ""; // Return empty if no text is found
  }

  // Predicates using `jsonTemplate`
  function IsTable(node) {
    // If no tag names are defined in the template, return false
    if (!jsonTemplate.tableTagNames || jsonTemplate.tableTagNames.length === 0) {
      return false;
    }

    // If "DC" is included in the tag names, automatically return true
    if (jsonTemplate.tableTagNames.includes("DC")) {
      return true;
    }

    // Check if "ANY" is included in the tag names (accept any tag)
    const acceptAny = jsonTemplate.tableTagNames.includes("ANY");

    // If not accepting any tag, check if the node's tagName is in the list
    if (!acceptAny && !jsonTemplate.tableTagNames.includes(node.tagName)) {
       return false;
    }
  
    // For each attribute in the template, check if the node's attribute contains the value
    for (const key in jsonTemplate.tableAttributes) {
      if (!node.attributes[key] || !node.attributes[key].includes(jsonTemplate.tableAttributes[key])) {
        return false;
      }
    }
  
    return true;
  }
  
  function IsTableHeader(node) {
    // If no tag names are defined in the template, return false
    if (!jsonTemplate.tableHeaderTagNames || jsonTemplate.tableHeaderTagNames.length === 0) {
      return false;
    }
  
    // If "DC" is included in the tag names, automatically return true
    if (jsonTemplate.tableHeaderTagNames.includes("DC")) {
      return true;
    }
  
    // Check if "ANY" is included in the tag names (accept any tag)
    const acceptAny = jsonTemplate.tableHeaderTagNames.includes("ANY");
  
    // If not accepting any tag, check if the node's tagName is in the list
    if (!acceptAny && !jsonTemplate.tableHeaderTagNames.includes(node.tagName)) {
      return false;
    }
  
    // Check if all attributes defined in the template are included in the node's attributes
    for (const key in jsonTemplate.tableHeaderAttributes) {
      if (
        !node.attributes[key] || // Attribute doesn't exist
        !node.attributes[key].includes(jsonTemplate.tableHeaderAttributes[key]) // Attribute value doesn't match
      ) {
        return false;
      }
    }
  
    // If all checks pass, return true
    return true;
  }
  
  
  function IsTableHeaderRow(node) {

    // If no tag names are defined in the template, return false
    if (!jsonTemplate.tableHeaderRowTagNames || jsonTemplate.tableHeaderRowTagNames.length === 0) {
      return false;
    }

    // If "DC" is included in the tag names, automatically return true
    if (jsonTemplate.tableHeaderRowTagNames.includes("DC")) {
      return true;
    }

    // Check if "ANY" is included in the tag names (accept any tag)
    const acceptAny = jsonTemplate.tableHeaderRowTagNames.includes("ANY");

    // If not accepting any tag, check if the node's tagName is in the list
    if (!acceptAny && !jsonTemplate.tableHeaderRowTagNames.includes(node.tagName)) {
      return false;
    }

    // For each attribute in the template, check if the node's attribute contains the value
    for (const key in jsonTemplate.tableHeaderRowAttributes) {
      if (!node.attributes[key] || !node.attributes[key].includes(jsonTemplate.tableHeaderRowAttributes[key])) {
        return false;
      }
    }
  
    return true;
  }
  
  function IsTableHeaderColumn(node) {

     // If no tag names are defined in the template, return false
     if (!jsonTemplate.tableHeaderColumnTagNames || jsonTemplate.tableHeaderColumnTagNames.length === 0) {
      return false;
     }

    // If "DC" is included in the tag names, automatically return true
    if (jsonTemplate.tableHeaderColumnTagNames.includes("DC")) {
      return true;
    }

    // Check if "ANY" is included in the tag names (accept any tag)
    const acceptAny = jsonTemplate.tableHeaderColumnTagNames.includes("ANY");

    // If not accepting any tag, check if the node's tagName is in the list
    if (!acceptAny && !jsonTemplate.tableHeaderColumnTagNames.includes(node.tagName)) {
      return false;
    }
  
    // For each attribute in the template, check if the node's attribute contains the value
    for (const key in jsonTemplate.tableHeaderColumnAttributes) {
      if (!node.attributes[key] || !node.attributes[key].includes(jsonTemplate.tableHeaderColumnAttributes[key])) {
        return false;
      }
    }
  
    return true;
  }
  
  function IsTableBody(node) {
    // If no tag names are defined in the template, return false
    if (!jsonTemplate.tableBodyTagNames || jsonTemplate.tableBodyTagNames.length === 0) {
      return false;
    }

    // If "DC" is included in the tag names, automatically return true
    if (jsonTemplate.tableBodyTagNames.includes("DC")) {
      return true;
    }

    // Check if "ANY" is included in the tag names (accept any tag)
    const acceptAny = jsonTemplate.tableBodyTagNames.includes("ANY");

    // If not accepting any tag, check if the node's tagName is in the list
    if (!acceptAny && !jsonTemplate.tableBodyTagNames.includes(node.tagName)) {
      return false;
    }
  
    // For each attribute in the template, check if the node's attribute contains the value
    for (const key in jsonTemplate.tableBodyAttributes) {
      if (!node.attributes[key] || !node.attributes[key].includes(jsonTemplate.tableBodyAttributes[key])) {
        return false;
      }
    }
  
    return true;
  }
  
  function IsRow(node) {

    // If no tag names are defined in the template, return false
    if (!jsonTemplate.rowTagNames || jsonTemplate.rowTagNames.length === 0) {
      return false;
    }

    // If "DC" is included in the tag names, automatically return true
    if (jsonTemplate.rowTagNames.includes("DC")) {
      return true;
    }

    // Check if "ANY" is included in the tag names (accept any tag)
    const acceptAny = jsonTemplate.rowTagNames.includes("ANY");

    // If not accepting any tag, check if the node's tagName is in the list
    if (!acceptAny && !jsonTemplate.rowTagNames.includes(node.tagName)) {
       return false;
    }

  
    // For each attribute in the template, check if the node's attribute contains the value
    for (const key in jsonTemplate.rowAttributes) {
      if (!node.attributes[key] || !node.attributes[key].includes(jsonTemplate.rowAttributes[key])) {
        return false;
      }
    }
  
    return true;
  }
  
  function IsColumn(node) {

    // If no tag names are defined in the template, return false
    if (!jsonTemplate.columnTagNames || jsonTemplate.columnTagNames.length === 0) {
      return false;
    }

    // If "DC" is included in the tag names, automatically return true
    if (jsonTemplate.columnTagNames.includes("DC")) {
      return true;
    }

    // Check if "ANY" is included in the tag names (accept any tag)
    const acceptAny = jsonTemplate.columnTagNames.includes("ANY");

    // If not accepting any tag, check if the node's tagName is in the list
    if (!acceptAny && !jsonTemplate.columnTagNames.includes(node.tagName)) {
       return false;
    }
  
    // For each attribute in the template, check if the node's attribute contains the value
    for (const key in jsonTemplate.columnAttributes) {
      if (!node.attributes[key] || !node.attributes[key].includes(jsonTemplate.columnAttributes[key])) {
        return false;
      }
    }
  
    return true;
  }
  

  // Start finding tables from the root of the DOM
  findTablesByTemplate(serializedDOM);

  return extractedTablesData;
}

// Function to save JSON data as a file
function saveJsonToFile(data, filename) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });

  // Using chrome.downloads API directly with Blob URL
  const reader = new FileReader();
  reader.onloadend = function() {
    const base64data = reader.result.split(',')[1]; // Get the base64 string from the Blob

    chrome.downloads.download({
      url: "data:application/json;base64," + base64data,
      filename: filename,
      saveAs: true
    });
  };

  reader.readAsDataURL(blob); // Read the blob as base64
}
