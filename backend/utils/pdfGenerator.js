import puppeteer from 'puppeteer';

export const generateReceivingPDF = async (receivingData, viewType = 'customer') => {
  let browser;
  try {
    // 1. Launch Puppeteer with safe arguments
    browser = await puppeteer.launch({ 
      headless: true, 
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
    });
    
    const page = await browser.newPage();

    // 2. Destructure and format the data safely
    const isAdmin = viewType === 'admin';
    const log = receivingData || {};
    const inv = log.inventoryItem || {};

    // Derived Variables matching the React UI
    const title = inv.division?.divisionName || 'UNASSIGNED DIVISION';
    const vendorTopRight = isAdmin ? (log.vendor || '') : '';
    
    const itemCode = inv.sku || inv.productCode || 'N/A';
    const lot = log.lot && log.lot !== 'N/A' ? log.lot : '';
    const categories = [inv.category1?.categoryName, inv.category2?.categoryName, inv.category3?.categoryName].filter(Boolean).join(', ') || 'None';
    
    const qty = Number(log.quantity) || 0;
    const cartons = Number(log.numberOfCartons) || 0;
    const breakdowns = log.cartonBreakdown || [];
    
    let totalWgt = Number(log.totalWeight) || 0;
    if (totalWgt === 0 && breakdowns.length > 0) {
        totalWgt = breakdowns.reduce((sum, b) => sum + ((Number(b.cartons)||0) * (Number(b.weightPerCarton)||0)), 0);
    }

    const dateRec = log.dateReceived ? new Date(log.dateReceived).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'N/A';
    const desc1 = inv.description || inv.itemName || '—';
    const desc2 = inv.description2 || '—';
    const skids = log.skids || 0;
    const carrier = log.carrier || '';
    const comments = log.description || '';

    const vendorName = log.vendor || '';
    const vendorAddress = log.vendorAddress || 'ON FILE';
    const vendorCityStateZip = log.vendorCityStateZip || 'ON FILE';
    const vendorPhone = log.vendorPhone || 'ON FILE';

    // Generate dynamic HTML for the breakdown array
    const breakdownHtml = breakdowns.map((b, i) => `
        <div class="row text-sm">
          <div class="label italic text-gray" style="font-weight: normal;">Breakdown ${i + 1}:</div>
          <div class="value">
            ${b.cartons} Cartons @ ${b.unitsPerCarton} units <span class="italic text-gray">(${b.weightPerCarton || 0} lbs/ctn)</span>
          </div>
        </div>
    `).join('');

    // 3. Build the exact HTML/CSS Layout matching the image
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { box-sizing: border-box; }
          body { 
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
            color: #000; 
            padding: 20px; 
            margin: 0;
            font-size: 11pt;
          }
          .header-container {
            position: relative;
            text-align: center;
            border-bottom: 3px solid #000;
            padding-bottom: 15px;
            margin-bottom: 30px;
          }
          .title {
            font-size: 22pt;
            font-weight: 900;
            text-transform: uppercase;
            margin: 0;
            letter-spacing: -0.5px;
          }
          .top-right {
            position: absolute;
            top: 0;
            right: 0;
            font-size: 9pt;
            font-weight: 900;
            text-transform: uppercase;
          }
          .grid-container {
            display: flex;
            justify-content: space-between;
          }
          .column {
            width: 48%;
          }
          .row {
            display: flex;
            margin-bottom: 14px;
            align-items: flex-start;
          }
          .label {
            width: 140px;
            font-weight: bold;
            flex-shrink: 0;
          }
          .value {
            flex-grow: 1;
          }
          .value-large {
            font-size: 13pt;
            font-weight: bold;
          }
          .divider {
            border-top: 1px dashed #ccc;
            margin: 15px 0;
          }
          .solid-divider {
            border-top: 1px solid #d1d5db;
            margin: 15px 0;
          }
          .italic { font-style: italic; }
          .text-gray { color: #6b7280; }
          .text-sm { font-size: 10pt; }
          .uppercase { text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div class="header-container">
          <h1 class="title">${title}</h1>
          ${vendorTopRight ? `<div class="top-right">${vendorTopRight}</div>` : ''}
        </div>

        <div class="grid-container">
          <div class="column">
            <div class="row">
              <div class="label">Item Code:</div>
              <div class="value">
                <div class="value-large">${itemCode}</div>
                ${lot ? `<div><strong>Lot:</strong> ${lot}</div>` : ''}
              </div>
            </div>

            <div class="row">
              <div class="label">Categories:</div>
              <div class="value">${categories}</div>
            </div>

            <div class="row">
              <div class="label">Receiver Type:</div>
              <div class="value uppercase">REGULAR</div>
            </div>

            <div class="row" style="margin-top: 25px;">
              <div class="label">Qty. Received:</div>
              <div class="value value-large">${qty.toLocaleString()}</div>
            </div>

            <div class="row divider" style="padding-top: 15px; margin-bottom: 8px;">
              <div class="label">Number of<br/>Cartons:</div>
              <div class="value value-large">${cartons.toLocaleString()}</div>
            </div>

            ${breakdownHtml}

            <div class="row solid-divider" style="padding-top: 15px;">
              <div class="label">Total Weight:</div>
              <div class="value value-large">${totalWgt.toFixed(2)} lbs</div>
            </div>

            <div class="row">
              <div class="label">Comments:</div>
              <div class="value">${comments}</div>
            </div>

            ${isAdmin ? `
              <div class="solid-divider" style="margin-top: 30px;"></div>
              <div class="row" style="padding-top: 5px;">
                <div class="label">Vendor Name:</div>
                <div class="value uppercase">${vendorName}</div>
              </div>
              <div class="row">
                <div class="label">Address:</div>
                <div class="value uppercase">${vendorAddress}</div>
              </div>
              <div class="row">
                <div class="label">City, State, ZIP:</div>
                <div class="value uppercase">${vendorCityStateZip}</div>
              </div>
            ` : ''}
          </div>

          <div class="column">
            <div class="row">
              <div class="label">Date Received:</div>
              <div class="value" style="font-weight: bold;">${dateRec}</div>
            </div>

            <div class="row">
              <div class="label">Description 1:</div>
              <div class="value">${desc1}</div>
            </div>

            <div class="row">
              <div class="label">Description 2:</div>
              <div class="value">${desc2}</div>
            </div>

            <div class="row" style="margin-top: 35px;">
              <div class="label">Number Of Skids:</div>
              <div class="value">${skids}</div>
            </div>

            <div class="row">
              <div class="label">Carrier:</div>
              <div class="value uppercase">${carrier}</div>
            </div>

            ${isAdmin ? `
              <div class="solid-divider" style="margin-top: 80px;"></div>
              <div class="row" style="padding-top: 5px;">
                <div class="label">Address cont'd:</div>
                <div class="value uppercase">ON FILE</div>
              </div>
              <div class="row">
                <div class="label">Phone:</div>
                <div class="value">${vendorPhone}</div>
              </div>
            ` : ''}
          </div>
        </div>
      </body>
      </html>
    `;

    // 4. Generate PDF matching the "Letter" sizing formatting requested
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({ 
      format: 'Letter', 
      printBackground: true, 
      margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' } 
    });
    
    await browser.close();
    return pdfBuffer;

  } catch (error) {
    if (browser) await browser.close();
    console.error("PUPPETEER GENERATION ERROR:", error);
    throw new Error("Failed to generate PDF document");
  }
};