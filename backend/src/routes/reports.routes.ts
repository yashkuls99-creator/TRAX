import { Router } from "express";
import { z } from "zod";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { Role } from "@prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, authorize } from "../middleware/auth";
import { buildMonthlyReport, MonthlyReport, ReportRow } from "../services/report.service";

export const reportRouter = Router();

reportRouter.use(authenticate, authorize(Role.FINANCE_ADMIN));

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const querySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  projectId: z.string().optional(),
  employeeId: z.string().optional(),
});

reportRouter.get(
  "/monthly",
  asyncHandler(async (req, res) => {
    const q = querySchema.parse(req.query);
    const report = await buildMonthlyReport(q);
    res.json(report);
  })
);

function currency(n: number) {
  return Number(n.toFixed(2));
}

function buildSheet(workbook: ExcelJS.Workbook, title: string, rows: ReportRow[], groupLabel: string) {
  const sheet = workbook.addWorksheet(title);
  sheet.columns = [
    { header: groupLabel, key: "name", width: 28 },
    { header: "City", key: "city", width: 16 },
    { header: "Total Claims", key: "totalClaims", width: 14 },
    { header: "Claimed Amount", key: "claimedAmount", width: 18 },
    { header: "Approved Amount", key: "approvedAmount", width: 18 },
    { header: "Paid Amount", key: "paidAmount", width: 16 },
    { header: "Pending Amount", key: "pendingAmount", width: 16 },
    { header: "Outstanding Balance", key: "outstandingBalance", width: 20 },
  ];
  sheet.getRow(1).font = { bold: true };
  rows.forEach((r) =>
    sheet.addRow({
      name: r.name,
      city: r.city ?? "-",
      totalClaims: r.totalClaims,
      claimedAmount: currency(r.claimedAmount),
      approvedAmount: currency(r.approvedAmount),
      paidAmount: currency(r.paidAmount),
      pendingAmount: currency(r.pendingAmount),
      outstandingBalance: currency(r.outstandingBalance),
    })
  );
  return sheet;
}

reportRouter.get(
  "/monthly/export/excel",
  asyncHandler(async (req, res) => {
    const q = querySchema.parse(req.query);
    const report = await buildMonthlyReport(q);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "NGO Expense Reimbursement System";
    workbook.created = new Date();

    buildSheet(workbook, "Employee-wise", report.employeeWise, "Employee");
    buildSheet(workbook, "Project-wise", report.projectWise, "Project");

    const fileName = `reimbursement-report-${MONTH_NAMES[q.month - 1]}-${q.year}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    await workbook.xlsx.write(res);
    res.end();
  })
);

function drawTable(doc: PDFKit.PDFDocument, title: string, rows: ReportRow[], groupLabel: string) {
  doc.fontSize(13).fillColor("#111827").text(title, { underline: true });
  doc.moveDown(0.5);

  const headers = [groupLabel, "Claims", "Claimed", "Approved", "Paid", "Pending", "Outstanding"];
  const colWidths = [140, 45, 65, 65, 65, 65, 75];
  const startX = doc.x;
  let y = doc.y;

  doc.fontSize(9).fillColor("#374151");
  headers.forEach((h, i) => {
    doc.text(h, startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, { width: colWidths[i], continued: false });
  });
  y += 14;
  doc.moveTo(startX, y).lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y).strokeColor("#d1d5db").stroke();
  y += 4;

  doc.fontSize(8.5).fillColor("#111827");
  for (const r of rows) {
    const values = [
      r.name,
      String(r.totalClaims),
      currency(r.claimedAmount).toLocaleString("en-IN"),
      currency(r.approvedAmount).toLocaleString("en-IN"),
      currency(r.paidAmount).toLocaleString("en-IN"),
      currency(r.pendingAmount).toLocaleString("en-IN"),
      currency(r.outstandingBalance).toLocaleString("en-IN"),
    ];
    values.forEach((v, i) => {
      doc.text(v, startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, { width: colWidths[i] });
    });
    y += 16;
    if (y > doc.page.height - 80) {
      doc.addPage();
      y = doc.y;
    }
  }
  doc.y = y + 10;
}

reportRouter.get(
  "/monthly/export/pdf",
  asyncHandler(async (req, res) => {
    const q = querySchema.parse(req.query);
    const report = await buildMonthlyReport(q);
    const fileName = `reimbursement-report-${MONTH_NAMES[q.month - 1]}-${q.year}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);

    doc.fontSize(18).fillColor("#111827").text("NGO Expense Reimbursement Report", { align: "left" });
    doc.fontSize(11).fillColor("#6b7280").text(`${MONTH_NAMES[q.month - 1]} ${q.year}`);
    doc.moveDown(1);

    drawTable(doc, "Employee-wise Summary", report.employeeWise, "Employee");
    doc.moveDown(0.5);
    drawTable(doc, "Project-wise Summary", report.projectWise, "Project");

    doc.moveDown(1);
    doc.fontSize(10).fillColor("#111827").text(
      `Grand Totals — Claims: ${report.totals.totalClaims} | Claimed: ${currency(report.totals.claimedAmount)} | Approved: ${currency(
        report.totals.approvedAmount
      )} | Paid: ${currency(report.totals.paidAmount)} | Pending: ${currency(report.totals.pendingAmount)} | Outstanding: ${currency(
        report.totals.outstandingBalance
      )}`
    );

    doc.end();
  })
);
