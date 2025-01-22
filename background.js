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
          console.error("Error saving DOM as JSON:", err);
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
          const domJson = results[0].result; // Get the DOM JSON from the function
          const tableJson = extractTableData(domJson);
          saveJsonToFile(tableJson, "tables.json"); // Save it as a JSON file
          sendResponse({ success: true });
        })
        .catch((err) => {
          console.error("Error saving DOM as JSON:", err);
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
          console.error("Error saving DOM as JSON:", err);
          sendResponse({ success: false, error: err });
        });

      // Indicate that we will send a response asynchronously
      return true;
    }

});

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
        const excludedTags = ['SCRIPT', 'STYLE','BR'];
      
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
    
      
      
        // Add other exclusion conditions here as needed
      
        return false;  // Return false to include the node
      }

      
      return serializeNode(document.documentElement);


}

 // Function to find and serialize all <TABLE> nodes into JSON
 function extractTableData(serializedDOM) 
 {
  const tablesData = [];

  // Recursively search for <TABLE> elements
  function findTables(node) {
    if (node.tagName === 'TABLE') {
      const tableData = { rows: [] };
      let columnHeaders = [];

      // Try to find <THEAD> and extract column headers
      const thead = node.children.find(child => child.tagName === 'THEAD');
      if (thead) {
        const headerRow = thead.children.find(child => child.tagName === 'TR');
        if (headerRow) {
          columnHeaders = headerRow.children
            .filter(child => child.tagName === 'TD' || child.tagName === 'TH') // Include <TD> or <TH>
            .map(cell => (cell.text ? cell.text.trim() : "")); // Null check for `cell.text`
        }
      }

      // If no <THEAD> is found, fallback to generic column names
      if (columnHeaders.length === 0) {
        const firstRow = node.children.find(child => child.tagName === 'TR') || {};
        columnHeaders = Array.from(firstRow.children || []).map(
          (_, index) => `column${index + 1}`
        );
      }

      // Try to find <TBODY> and extract rows
      const tbody = node.children.find(child => child.tagName === 'TBODY');
      const rows = (tbody ? tbody.children : node.children).filter(
        child => child.tagName === 'TR'
      ); // Use rows from <TBODY> or directly under <TABLE>

      // Process each row
      rows.forEach(row => {
        const rowData = {};

        const cells = row.children.filter(cell => cell.tagName === 'TD');
        cells.forEach((cell, index) => {
          const columnName = columnHeaders[index] || `column${index + 1}`; // Use header name or fallback to column1, column2, etc.
		   let cellText = cell.text ? cell.text.trim() : ""; // Check for `cell.text`
  
		  if (!cellText) {
			// If `cell.text` is empty, look for the first non-empty text in `cell.children`
			for (const child of cell.children) {
			  if (child.text && child.text.trim()) {
				cellText = child.text.trim();
				break;
			  }
			}
		  }
		  
          rowData[columnName] = cellText; // Null check for `cell.text`
        });

        tableData.rows.push(rowData);
      });

      tablesData.push(tableData);
    }

    if (node.children) {
      node.children.forEach(child => findTables(child));
    }
  }

  // Start finding tables from the root of the DOM
  findTables(serializedDOM);

  return tablesData;
}

// Function to find and serialize all <TABLE> nodes into JSON
function extractTemplateData(serializedDOM, template) 
{

 const extractedTablesData = [];
 const jsonTemplate = template;

 // Recursively search for template elements
 function findTablesByTemplate(node) 
 {
  if (IsTable(node)) {
     const tableData = { rows: [] };
     let columnHeaders = [];

     // Try to find <THEAD> and extract column headers
     const thead = node.children.find(child => IsTableHeader(child));
     if (thead) {
       const headerRow = thead.children.find(child => IsTableHeaderRow(child));
       if (headerRow) {
         columnHeaders = headerRow.children
           .filter(child => IsTableHeaderColumn(child)) // Include <TD> or <TH>
           .map(cell => (cell.text ? cell.text.trim() : "")); // Null check for `cell.text`
       }
     }

     // If no <THEAD> is found, fallback to generic column names
     if (columnHeaders.length === 0) {
       const firstRow = node.children.find(child => IsRow(child)) || {};
       columnHeaders = Array.from(firstRow.children || []).map(
         (_, index) => `column${index + 1}`
       );
     }

     // Try to find <TBODY> and extract rows
     const tbody = node.children.find(child => IsTableBody(child));
     const rows = (tbody ? tbody.children : node.children).filter(
       child => IsRow(child)
     ); // Use rows from <TBODY> or directly under <TABLE>

     // Process each row
     rows.forEach(row => {
       const rowData = {};

       const cells = row.children.filter(cell => IsColumn(cell));
       cells.forEach((cell, index) => {
         const columnName = columnHeaders[index] || `column${index + 1}`; // Use header name or fallback to column1, column2, etc.
      let cellText = cell.text ? cell.text.trim() : ""; // Check for `cell.text`
 
     if (!cellText) {
        // If cell.text is empty, look for the first non-empty text in cell.children
        for (const child of cell.children) 
        {
          if (child.text && child.text.trim()) 
          {
            cellText = child.text.trim();
            break;
          }
        }
     }
     
         rowData[columnName] = cellText; // Null check for `cell.text`
       });

       tableData.rows.push(rowData);
     });

     extractedTablesData.push(tableData);
   }

   if (node.children) {
       node.children.forEach(child => findTablesByTemplate(child));
   }
 }

 function IsTable(node) {
  if (node.tagName !== jsonTemplate.tableTagName) {
    return false;
  }
  for (const key in jsonTemplate.tableAttributes) {
    if (!node.attributes[key] || node.attributes[key] !== jsonTemplate.tableAttributes[key]) {
      return false;
    }
  }
  return true;
}

function IsTableHeader(node) {
  if (node.tagName !== template.tableHeaderTagName) {
    return false;
  }
  for (const key in jsonTemplate.tableHeaderAttributes) {
    if (!node.attributes[key] || node.attributes[key] !== jsonTemplate.tableHeaderAttributes[key]) {
      return false;
    }
  }
  return true;
}

function IsTableHeaderRow(node) {
  if (node.tagName !== jsonTemplate.tableHeaderRowTagName) {
    return false;
  }
  for (const key in jsonTemplate.tableHeaderRowAttributes) {
    if (!node.attributes[key] || node.attributes[key] !== jsonTemplate.tableHeaderRowAttributes[key]) {
      return false;
    }
  }
  return true;
}

function IsTableHeaderColumn(node) {
  if (node.tagName !== jsonTemplate.tableHeaderColumnTagName) {
    return false;
  }
  for (const key in jsonTemplate.tableHeaderColumnAttributes) {
    if (!node.attributes[key] || node.attributes[key] !== jsonTemplate.tableHeaderColumnAttributes[key]) {
      return false;
    }
  }
  return true;
}

function IsTableBody(node) {
  if (node.tagName !== jsonTemplate.tableBodyTagName) {
    return false;
  }
  for (const key in jsonTemplate.tableBodyAttributes) {
    if (!node.attributes[key] || node.attributes[key] !== jsonTemplate.tableBodyAttributes[key]) {
      return false;
    }
  }
  return true;
}

function IsRow(node) {
  if (node.tagName !== jsonTemplate.rowTagName) {
    return false;
  }
  for (const key in jsonTemplate.rowAttributes) {
    if (!node.attributes[key] || node.attributes[key] !== jsonTemplate.rowAttributes[key]) {
      return false;
    }
  }
  return true;
}

function IsColumn(node) {
  if (node.tagName !== jsonTemplate.columnTagName) {
    return false;
  }
  for (const key in jsonTemplate.columnAttributes) {
    if (!node.attributes[key] || node.attributes[key] !== jsonTemplate.columnAttributes[key]) {
      return false;
    }
  }
  return true;
}



if (!jsonTemplate)
{
    throw new Error('Invalid template (1)');
}

if (jsonTemplate.tableTagName==='')
{
      throw new Error('Invalid template (2)');
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
