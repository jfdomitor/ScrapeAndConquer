## Chrome extension to scrape the DOM for tables
* Finds html tables automaticly
* You may also set up a template do define what's tables, columns, rows and so on

![alt text](https://github.com/jfdomitor/ScrapeAndConquer/blob/main/screenshot_1.png)

* Example template
    {
      "tableTagNames": ["DIV"],
      "tableAttributes": {"class": "tabsContainer"},
    
      "tableHeaderTagNames": ["DIV"],
      "tableHeaderAttributes": {"role": "tabpanel"},
    
      "tableHeaderRowTagNames": ["DIV"],
      "tableHeaderRowAttributes": {"class":"_header_330y8_20 _xl_330y8_1"},
      
      "tableHeaderColumnTagNames": ["DC"],
      "tableHeaderColumnAttributes": {},
      
      "tableBodyTagNames": [""],
      "tableBodyAttributes": {},
      
      "rowTagNames":  ["DIV"],
      "rowAttributes": {"class": "_cardContent_330y8_140"},
      
      "columnTagNames":  ["DIV"],
      "columnAttributes": {"class":"_block_330y8_153"}
  }
