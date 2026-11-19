import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { GATEWAY_DIVISION_ID } from "./netSuiteOrderUtils";

export const generateNetSuitePickPackPdf = ({
  orderNumber,
  orderType,
  items,
  inventoryData = [],
  shipping,
  address,
  notes,
}) => {
  const doc = new jsPDF();
  const formattedToday = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // --- PAGE 1: MASTER PICKING LIST ---
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text("MASTER PICKING LIST", 14, 20);

  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 0, 0);
  doc.line(14, 22, 196, 22);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  doc.text("Orders Count: 1", 14, 28);
  doc.text(`Date Printed: ${formattedToday}`, 14, 33);

  const itemMap = {};
  items.forEach((item) => {
    if (!itemMap[item.sku]) {
      const invItem = inventoryData.find(
        (inv) =>
          String(inv.division) === GATEWAY_DIVISION_ID &&
          String(inv.corporateSku || "").toLowerCase() ===
            String(item.sku).toLowerCase(),
      );

      let locationStr = "";
      if (
        invItem?.locations &&
        Array.isArray(invItem.locations) &&
        invItem.locations.length > 0
      ) {
        locationStr = invItem.locations
          .map((loc) => loc.designation || loc.name || "")
          .filter(Boolean)
          .join(", ");
      }

      itemMap[item.sku] = {
        name: item.name,
        sku: item.sku,
        qty: 0,
        location: locationStr,
      };
    }
    itemMap[item.sku].qty += Number(item.qty || 0);
  });

  const pickingRows = Object.values(itemMap).map((i) => [
    " [    ] ",
    i.location,
    i.sku,
    i.name,
    i.qty.toString(),
  ]);

  autoTable(doc, {
    startY: 40,
    head: [
      ["Picked", "Location", "SKU", "Item Description", "Total Qty Required"],
    ],
    body: pickingRows,
    theme: "grid",
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: 20,
      fontStyle: "bold",
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 20, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 30, halign: "center" },
      4: { halign: "center", fontStyle: "bold" },
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
      textColor: 20,
      font: "helvetica",
    },
  });

  // --- PAGE 2: PACKING SLIP ---
  doc.addPage();
  const shipVia =
    `${shipping.carrierType || ""} ${shipping.serviceCode || ""}`.trim() ||
    "UPS - Ground";
  const phone = address.phone || "";

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("GATEWAY\nCorporate", 14, 20);

  const rightColKeyX = 160;
  const rightColValX = 162;
  let rightY = 20;

  const metaRows = [
    ["Order ID:", orderNumber || "N/A"],
    ["Order Type:", orderType || "WEBORD"],
    ["Ordered:", formattedToday],
    ["Ship Via:", shipVia],
  ];

  doc.setFontSize(9);
  metaRows.forEach(([label, val]) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, rightColKeyX, rightY, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(String(val), rightColValX, rightY);
    rightY += 5;
  });

  const addressBlockY = 55;
  doc.setFontSize(10);

  doc.setFont("helvetica", "bold");
  doc.text("SHIP FROM:", 14, addressBlockY);
  doc.setFont("helvetica", "normal");
  doc.text("MI-KRO Industries", 40, addressBlockY + 5);
  doc.text("1509 RT 38, Unit 9", 40, addressBlockY + 10);
  doc.text("Hainesport, NJ 08036 US", 40, addressBlockY + 15);
  doc.text("Phone: 609-694-0521", 40, addressBlockY + 20);
  doc.text("Email: mike@mi-krologistics.com", 40, addressBlockY + 25);

  doc.setFont("helvetica", "bold");
  doc.text("SHIP TO:", 110, addressBlockY);
  doc.setFont("helvetica", "normal");

  let currentYOffset = addressBlockY;
  if (address.companyName) {
    doc.text(address.companyName, 130, currentYOffset);
    currentYOffset += 5;
    doc.text(`c/o ${address.name || "N/A"}`, 130, currentYOffset);
  } else {
    doc.text(address.name || "N/A", 130, currentYOffset);
  }

  currentYOffset += 5;
  doc.text(
    `${address.street || ""} ${address.line2 || ""}`.trim(),
    130,
    currentYOffset,
  );
  currentYOffset += 5;
  doc.text(
    `${address.city || ""}, ${address.state || ""} ${address.zip || ""}`.trim(),
    130,
    currentYOffset,
  );
  currentYOffset += 5;
  doc.text(address.country || "US", 130, currentYOffset);

  if (phone) {
    currentYOffset += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Phone:", 110, currentYOffset);
    doc.setFont("helvetica", "normal");
    doc.text(phone, 130, currentYOffset);
  }

  let commentsY = 95;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Comments:", 14, commentsY);

  if (notes) {
    doc.setFont("helvetica", "normal");
    const splitNotes = doc.splitTextToSize(notes, 150);
    doc.text(splitNotes, 40, commentsY);
    commentsY += splitNotes.length * 5;
  } else {
    commentsY += 5;
  }

  const tableRows = items.map((item) => [
    item.sku,
    item.name,
    " ",
    (item.qty || 0).toString(),
    " ",
  ]);

  autoTable(doc, {
    startY: commentsY + 5,
    head: [
      [
        "Item Code / Lot(s) #",
        "Description",
        "Qty.\nPicked",
        "Qty.\nOrdered",
        "Qty.\nShipped",
      ],
    ],
    body: tableRows,
    theme: "plain",
    headStyles: {
      fontStyle: "bold",
      textColor: 0,
      halign: "left",
      borderBottomColor: 0,
      borderBottomWidth: 0.5,
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: 20,
      font: "helvetica",
    },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 20, halign: "center" },
      4: { cellWidth: 20, halign: "center" },
    },
    willDrawCell: (data) => {
      if (data.row.section === "body") {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.1);
        doc.line(
          data.cell.x,
          data.cell.y + data.cell.height,
          data.cell.x + data.cell.width,
          data.cell.y + data.cell.height,
        );
      }
    },
  });

  const finalY = doc.lastAutoTable.finalY + 15;
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(55, finalY, 100, 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("*** THANK YOU FOR YOUR ORDER! ***", 105, finalY + 5.5, {
    align: "center",
  });

  doc.setLineWidth(1.5);
  doc.line(14, 280, 196, 280);

  doc.autoPrint();
  window.open(doc.output("bloburl"), "_blank");
};