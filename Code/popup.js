const fileInput = document.getElementById("templateFile");
const radioButtons = document.querySelectorAll('input[name="action"]');
const goButton = document.getElementById("goButton");

let templateJson = null; // To hold the parsed JSON data

// Enable or disable the file input based on selected action
radioButtons.forEach(radio => {
  radio.addEventListener("change", () => {
    if (radio.value === "templateBased") {
      fileInput.disabled = false;
    } else {
      fileInput.disabled = true;
      fileInput.value = ""; // Reset file input
      templateJson = null; // Clear previous JSON data
    }
  });
});

fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        templateJson = JSON.parse(e.target.result); // Parse JSON data
        console.log("Uploaded Template JSON:", templateJson);
        //alert("Template uploaded and parsed successfully!");
      } catch (error) {
        console.error("Error parsing JSON file:", error);
        //alert("Failed to parse JSON file. Please check the file format.");
        fileInput.value = ""; // Reset file input
      }
    };
    reader.readAsText(file);
  }
});

document.getElementById('saveDomButton').addEventListener('click', () => {

  const selectedOption = document.querySelector('input[name="action"]:checked');
  if (selectedOption) 
  {
    
    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const activeTab = tabs[0];
        // Send a message to the background script to save the DOM
        chrome.runtime.sendMessage(
          { action: selectedOption.value, tabId: activeTab.id, template: templateJson },
          (response) => {
            if (response && response.success) {
              //alert("DOM has been saved as JSON!");
            } else {
              //alert("Failed to save DOM as JSON.");
              console.error(response.error);
            }
          }
        );
      }
    });

  }

  


});
