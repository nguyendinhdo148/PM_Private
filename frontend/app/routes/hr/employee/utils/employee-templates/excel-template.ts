import ExcelJS from "exceljs";
import type { Employee } from "../../types";

export type EmployeeTemplateType =
  | "EMPLOYEE_INFO"
  | "RESUME"
  | "CONTRACT"
  | "SALARY_INSURANCE"
  | "EMPLOYEE_FULL";

/* ============================================================
 *  HELPERS
 * ============================================================ */

function safeString(value?: string | number | null): string {
  if (value === undefined || value === null || value === "") return "";
  return String(value);
}

function formatDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function formatMoney(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "";
  return value.toLocaleString("vi-VN");
}

function getStatusLabel(status?: Employee["status"]): string {
  switch (status) {
    case "ACTIVE": return "Đang làm việc";
    case "PROBATION": return "Thử việc";
    case "ON_LEAVE": return "Nghỉ phép";
    case "RESIGNED": return "Đã nghỉ việc";
    case "TERMINATED": return "Đã chấm dứt";
    default: return "";
  }
}

function getGenderLabel(value?: string): string {
  switch (value) {
    case "MALE": return "Nam";
    case "FEMALE": return "Nữ";
    case "OTHER": return "Khác";
    default: return safeString(value);
  }
}

function getMaritalLabel(value?: string): string {
  switch (value) {
    case "SINGLE": return "Độc thân";
    case "MARRIED": return "Đã kết hôn";
    case "DIVORCED": return "Đã ly hôn";
    case "WIDOWED": return "Góa";
    case "OTHER": return "Khác";
    default: return safeString(value);
  }
}

/* ============================================================
 *  STYLE PRESETS
 * ============================================================ */

const FONT_NAME = "Times New Roman";

const BORDER_THIN: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FF000000" } },
  bottom: { style: "thin", color: { argb: "FF000000" } },
  left: { style: "thin", color: { argb: "FF000000" } },
  right: { style: "thin", color: { argb: "FF000000" } },
};

const BORDER_DOTTED: Partial<ExcelJS.Borders> = {
  top: { style: "dotted", color: { argb: "FF808080" } },
  bottom: { style: "dotted", color: { argb: "FF808080" } },
  left: { style: "dotted", color: { argb: "FF808080" } },
  right: { style: "dotted", color: { argb: "FF808080" } },
};

const BORDER_BOTTOM_ONLY: Partial<ExcelJS.Borders> = {
  bottom: { style: "thin", color: { argb: "FF000000" } },
};

const CENTER: Partial<ExcelJS.Alignment> = {
  horizontal: "center",
  vertical: "middle",
  wrapText: true,
};

const LEFT: Partial<ExcelJS.Alignment> = {
  horizontal: "left",
  vertical: "middle",
  wrapText: false,
};

const LEFT_WRAP: Partial<ExcelJS.Alignment> = {
  horizontal: "left",
  vertical: "middle",
  wrapText: true,
};

const LEFT_TOP: Partial<ExcelJS.Alignment> = {
  horizontal: "left",
  vertical: "top",
  wrapText: true,
};

const RIGHT: Partial<ExcelJS.Alignment> = {
  horizontal: "right",
  vertical: "middle",
  wrapText: false,
};

const A4_PORTRAIT: Partial<ExcelJS.PageSetup> = {
  paperSize: 9,
  orientation: "portrait",
  fitToPage: true,
  fitToWidth: 1,
  margins: {
    left: 0.4, right: 0.4, top: 0.4, bottom: 0.4,
    header: 0.2, footer: 0.2,
  },
  horizontalCentered: true,
};

const A4_LANDSCAPE: Partial<ExcelJS.PageSetup> = {
  paperSize: 9,
  orientation: "landscape",
  fitToPage: true,
  fitToWidth: 1,
  margins: {
    left: 0.4, right: 0.4, top: 0.4, bottom: 0.4,
    header: 0.2, footer: 0.2,
  },
  horizontalCentered: true,
};

/* ============================================================
 *  LOGO INSERTER
 * ============================================================ */

async function tryInsertLogo(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  targetCell = "A1",
  width = 110,
  height = 110
): Promise<void> {
  try {
    const response = await fetch("/logo/bieumau.png");
    if (!response.ok) throw new Error("Không fetch được logo");
    const arrayBuffer = await response.arrayBuffer();
    const imageId = workbook.addImage({
      buffer: arrayBuffer as any,
      extension: "png",
    });

    const cell = sheet.getCell(targetCell);
    const colNumber = Number(cell.col) - 1;
    const rowNumber = Number(cell.row) - 1;

    sheet.addImage(imageId, {
      tl: { col: colNumber + 0.1, row: rowNumber + 0.1 } as any,
      ext: { width, height },
      editAs: "oneCell",
    });
  } catch (error) {
    console.warn("Không load được logo:", error);
  }
}

/* ============================================================
 *  COMMON HEADER (dùng cho mọi form) — logo + tiêu đề + ảnh 3x4
 *  Ảnh 3x4 kéo dài từ row 1 -> row 6 (đủ không gian)
 * ============================================================ */

function writeCommonHeader(
  sheet: ExcelJS.Worksheet,
  docTitle: string,
  options?: { hasPhotoBox?: boolean }
): void {
  const hasPhotoBox = options?.hasPhotoBox ?? true;

  // Logo A1:C6 (cao hơn để cân với ảnh)
  sheet.mergeCells("A1:C6");
  sheet.getCell("A1").alignment = CENTER;

  // Tiêu đề D1:I6
  sheet.mergeCells("D1:I6");
  const titleCell = sheet.getCell("D1");
  titleCell.value = docTitle;
  titleCell.font = { name: FONT_NAME, size: 16, bold: true };
  titleCell.alignment = CENTER;

  // Ô ảnh J1:K6 (kéo dài 6 dòng, đúng tỷ lệ 3x4)
  if (hasPhotoBox) {
    sheet.mergeCells("J1:K6");
    const photoCell = sheet.getCell("J1");
    photoCell.value = "Ảnh 3x4";
    photoCell.font = { name: FONT_NAME, size: 10 };
    photoCell.alignment = CENTER;
    photoCell.border = BORDER_THIN;
  }

  // Chiều cao các dòng header
  sheet.getRow(1).height = 22;
  sheet.getRow(2).height = 22;
  sheet.getRow(3).height = 22;
  sheet.getRow(4).height = 22;
  sheet.getRow(5).height = 22;
  sheet.getRow(6).height = 22;
}

/* ============================================================
 *  COMMON HEADER BLOCK — Ngày nhận việc / Chức danh / ĐT / Email
 *  Tách label và ô nhập liệu ra 2 dòng riêng biệt (giống bên dưới)
 * ============================================================ */

function writeCommonHeaderBlock(
  sheet: ExcelJS.Worksheet,
  employee: Employee
): void {
  const wi = employee.workInfo;

  // --- Row 7: Labels ---
  sheet.getCell("A7").value = "Ngày nhận việc";
  sheet.getCell("A7").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A7").alignment = LEFT;

  sheet.getCell("D7").value = "Chức danh công việc";
  sheet.getCell("D7").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("D7").alignment = LEFT;

  sheet.getCell("G7").value = "Điện thoại di động";
  sheet.getCell("G7").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("G7").alignment = LEFT;

  sheet.getCell("J7").value = "Email";
  sheet.getCell("J7").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("J7").alignment = LEFT;

  sheet.getRow(7).height = 18;

  // --- Row 8: Value boxes ---
  sheet.mergeCells("A8:C8");
  const startDateCell = sheet.getCell("A8");
  startDateCell.value = formatDate(wi?.startDate);
  startDateCell.font = { name: FONT_NAME, size: 10 };
  startDateCell.alignment = LEFT;
  startDateCell.border = BORDER_THIN;

  sheet.mergeCells("D8:F8");
  const positionCell = sheet.getCell("D8");
  positionCell.value = safeString(wi?.position);
  positionCell.font = { name: FONT_NAME, size: 10 };
  positionCell.alignment = LEFT_WRAP;
  positionCell.border = BORDER_THIN;

  sheet.mergeCells("G8:I8");
  const phoneCell = sheet.getCell("G8");
  phoneCell.value = safeString(employee.phone);
  phoneCell.font = { name: FONT_NAME, size: 10 };
  phoneCell.alignment = LEFT;
  phoneCell.border = BORDER_THIN;

  sheet.mergeCells("J8:K8");
  const emailCell = sheet.getCell("J8");
  emailCell.value = safeString(employee.email);
  emailCell.font = { name: FONT_NAME, size: 10 };
  emailCell.alignment = LEFT_WRAP;
  emailCell.border = BORDER_THIN;

  sheet.getRow(8).height = 28;
  sheet.getRow(9).height = 8; // khoảng trống
}

/* ============================================================
 *  COMMON SECTION TITLE
 * ============================================================ */

function writeSectionTitle(
  sheet: ExcelJS.Worksheet,
  row: number,
  title: string
): void {
  sheet.mergeCells(`A${row}:K${row}`);
  const cell = sheet.getCell(`A${row}`);
  cell.value = title;
  cell.font = { name: FONT_NAME, size: 11, bold: true };
  cell.alignment = LEFT;
  cell.border = BORDER_BOTTOM_ONLY;
  sheet.getRow(row).height = 22;
}

/* ============================================================
 *  BUILDER 1: PHIẾU THÔNG TIN NHÂN SỰ (sheet "02")
 *  Bắt đầu section I từ row 10
 * ============================================================ */

async function buildPersonalInfoFormSheet(
  workbook: ExcelJS.Workbook,
  employee: Employee
): Promise<ExcelJS.Worksheet> {
  const sheet = workbook.addWorksheet("02", { pageSetup: A4_PORTRAIT });

  const pi = employee.personalInfo;
  const wi = employee.workInfo;
  const sb = employee.salaryAndBenefits;

  sheet.columns = [
    { width: 18 }, { width: 14 }, { width: 10 }, { width: 12 },
    { width: 12 }, { width: 10 }, { width: 12 }, { width: 12 },
    { width: 10 }, { width: 10 }, { width: 14 },
  ];

  writeCommonHeader(sheet, "BẢNG THÔNG TIN CÁ NHÂN");
  writeCommonHeaderBlock(sheet, employee);

  /* I. THÔNG TIN CÁ NHÂN */
  writeSectionTitle(sheet, 10, "I. THÔNG TIN CÁ NHÂN");

  // --- Hàng 1: Họ tên (A-C) | Ngày sinh (D-F) | Nơi sinh (G-I) | Nguyên quán (J-K) ---
  sheet.getCell("A11").value = "1. Họ và tên";
  sheet.getCell("A11").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A11").alignment = LEFT;

  sheet.getCell("D11").value = "2. Ngày sinh";
  sheet.getCell("D11").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("D11").alignment = LEFT;

  sheet.getCell("G11").value = "3. Nơi sinh";
  sheet.getCell("G11").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("G11").alignment = LEFT;

  sheet.getCell("J11").value = "4. Nguyên quán";
  sheet.getCell("J11").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("J11").alignment = LEFT;

  sheet.mergeCells("A12:C12");
  const nameCell = sheet.getCell("A12");
  nameCell.value = safeString(employee.name);
  nameCell.font = { name: FONT_NAME, size: 10 };
  nameCell.alignment = LEFT_WRAP;
  nameCell.border = BORDER_THIN;

  sheet.mergeCells("D12:F12");
  const dobCell = sheet.getCell("D12");
  dobCell.value = formatDate(pi?.dateOfBirth);
  dobCell.font = { name: FONT_NAME, size: 10 };
  dobCell.alignment = LEFT;
  dobCell.border = BORDER_THIN;

  sheet.mergeCells("G12:I12");
  const pobCell = sheet.getCell("G12");
  pobCell.value = safeString(pi?.placeOfBirth);
  pobCell.font = { name: FONT_NAME, size: 10 };
  pobCell.alignment = LEFT_WRAP;
  pobCell.border = BORDER_THIN;

  sheet.mergeCells("J12:K12");
  const homeCell = sheet.getCell("J12");
  homeCell.value = safeString(pi?.hometown);
  homeCell.font = { name: FONT_NAME, size: 10 };
  homeCell.alignment = LEFT_WRAP;
  homeCell.border = BORDER_THIN;

  sheet.getRow(11).height = 18;
  sheet.getRow(12).height = 30;
  sheet.getRow(13).height = 6;

  // --- Hàng 2: CCCD (A-C) | Ngày cấp (D-F) | Nơi cấp (G-I) | Quốc tịch (J-K) ---
  sheet.getCell("A14").value = "5. Số CMND/CCCD";
  sheet.getCell("A14").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A14").alignment = LEFT;

  sheet.getCell("D14").value = "6. Ngày cấp";
  sheet.getCell("D14").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("D14").alignment = LEFT;

  sheet.getCell("G14").value = "7. Nơi cấp";
  sheet.getCell("G14").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("G14").alignment = LEFT;

  sheet.getCell("J14").value = "8. Quốc tịch";
  sheet.getCell("J14").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("J14").alignment = LEFT;

  sheet.mergeCells("A15:C15");
  const idCell = sheet.getCell("A15");
  idCell.value = safeString(pi?.idCardNumber);
  idCell.font = { name: FONT_NAME, size: 10 };
  idCell.alignment = LEFT;
  idCell.border = BORDER_THIN;

  sheet.mergeCells("D15:F15");
  const idDateCell = sheet.getCell("D15");
  idDateCell.value = formatDate(pi?.idCardIssueDate);
  idDateCell.font = { name: FONT_NAME, size: 10 };
  idDateCell.alignment = LEFT;
  idDateCell.border = BORDER_THIN;

  sheet.mergeCells("G15:I15");
  const idPlaceCell = sheet.getCell("G15");
  idPlaceCell.value = safeString(pi?.idCardIssuePlace);
  idPlaceCell.font = { name: FONT_NAME, size: 10 };
  idPlaceCell.alignment = LEFT_WRAP;
  idPlaceCell.border = BORDER_THIN;

  sheet.mergeCells("J15:K15");
  const natCell = sheet.getCell("J15");
  natCell.value = safeString(pi?.nationality);
  natCell.font = { name: FONT_NAME, size: 10 };
  natCell.alignment = LEFT;
  natCell.border = BORDER_THIN;

  sheet.getRow(14).height = 18;
  sheet.getRow(15).height = 28;
  sheet.getRow(16).height = 6;

  // --- Hàng 3: Dân tộc (A-C) | Giới tính (D-F) | Hôn nhân (G-I) | BHXH (J-K) ---
  sheet.getCell("A17").value = "9. Dân tộc";
  sheet.getCell("A17").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A17").alignment = LEFT;

  sheet.getCell("D17").value = "10. Giới tính";
  sheet.getCell("D17").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("D17").alignment = LEFT;

  sheet.getCell("G17").value = "11. Tình trạng hôn nhân";
  sheet.getCell("G17").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("G17").alignment = LEFT;

  sheet.getCell("J17").value = "12. Số sổ BHXH";
  sheet.getCell("J17").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("J17").alignment = LEFT;

  sheet.mergeCells("A18:C18");
  const ethCell = sheet.getCell("A18");
  ethCell.value = safeString(pi?.ethnicity);
  ethCell.font = { name: FONT_NAME, size: 10 };
  ethCell.alignment = LEFT;
  ethCell.border = BORDER_THIN;

  sheet.mergeCells("D18:F18");
  const genCell = sheet.getCell("D18");
  genCell.value = getGenderLabel(pi?.gender);
  genCell.font = { name: FONT_NAME, size: 10 };
  genCell.alignment = LEFT;
  genCell.border = BORDER_THIN;

  sheet.mergeCells("G18:I18");
  const marCell = sheet.getCell("G18");
  marCell.value = getMaritalLabel(pi?.maritalStatus);
  marCell.font = { name: FONT_NAME, size: 10 };
  marCell.alignment = LEFT;
  marCell.border = BORDER_THIN;

  sheet.mergeCells("J18:K18");
  const bhxhCell = sheet.getCell("J18");
  bhxhCell.value = safeString(sb?.socialInsuranceNumber);
  bhxhCell.font = { name: FONT_NAME, size: 10 };
  bhxhCell.alignment = LEFT;
  bhxhCell.border = BORDER_THIN;

  sheet.getRow(17).height = 18;
  sheet.getRow(18).height = 28;
  sheet.getRow(19).height = 6;

  // --- Hàng 4: Mã số thuế (A-K full) ---
  sheet.mergeCells("A20:K20");
  const taxLabel = sheet.getCell("A20");
  taxLabel.value = "13. Mã số thuế";
  taxLabel.font = { name: FONT_NAME, size: 10 };
  taxLabel.alignment = LEFT;

  sheet.mergeCells("A21:K21");
  const taxCell = sheet.getCell("A21");
  taxCell.value = safeString(sb?.taxCode);
  taxCell.font = { name: FONT_NAME, size: 10 };
  taxCell.alignment = LEFT;
  taxCell.border = BORDER_THIN;

  sheet.getRow(20).height = 18;
  sheet.getRow(21).height = 26;
  sheet.getRow(22).height = 6;

  // --- Địa chỉ thường trú ---
  sheet.mergeCells("A23:K23");
  const addr1Label = sheet.getCell("A23");
  addr1Label.value = "14. Địa chỉ thường trú (Sau sát nhập)";
  addr1Label.font = { name: FONT_NAME, size: 10 };
  addr1Label.alignment = LEFT;
  sheet.getRow(23).height = 18;

  sheet.mergeCells("A24:K25");
  const addr1Cell = sheet.getCell("A24");
  addr1Cell.value = safeString(pi?.permanentAddress);
  addr1Cell.font = { name: FONT_NAME, size: 10 };
  addr1Cell.alignment = LEFT_TOP;
  addr1Cell.border = BORDER_THIN;
  sheet.getRow(24).height = 22;
  sheet.getRow(25).height = 22;
  sheet.getRow(26).height = 6;

  // --- Địa chỉ hiện tại ---
  sheet.mergeCells("A27:K27");
  const addr2Label = sheet.getCell("A27");
  addr2Label.value = "15. Địa chỉ hiện tại (nếu khác địa chỉ trên)";
  addr2Label.font = { name: FONT_NAME, size: 10 };
  addr2Label.alignment = LEFT;
  sheet.getRow(27).height = 18;

  sheet.mergeCells("A28:K29");
  const addr2Cell = sheet.getCell("A28");
  addr2Cell.value = safeString(pi?.currentAddress);
  addr2Cell.font = { name: FONT_NAME, size: 10 };
  addr2Cell.alignment = LEFT_TOP;
  addr2Cell.border = BORDER_THIN;
  sheet.getRow(28).height = 22;
  sheet.getRow(29).height = 22;
  sheet.getRow(30).height = 6;

  // --- 16. Gia đình ---
  sheet.mergeCells("A31:K31");
  const famTitle = sheet.getCell("A31");
  famTitle.value = "16. Thành phần gia đình (cha/mẹ/chồng/vợ/con/anh chị em ruột)";
  famTitle.font = { name: FONT_NAME, size: 10, bold: true };
  famTitle.alignment = LEFT;
  sheet.getRow(31).height = 22;

  sheet.mergeCells("A32:B32");
  const famH1 = sheet.getCell("A32");
  famH1.value = "Họ và tên";
  famH1.font = { name: FONT_NAME, size: 10, bold: true };
  famH1.alignment = CENTER;
  famH1.border = BORDER_THIN;

  sheet.mergeCells("C32:D32");
  const famH2 = sheet.getCell("C32");
  famH2.value = "Mối quan hệ";
  famH2.font = { name: FONT_NAME, size: 10, bold: true };
  famH2.alignment = CENTER;
  famH2.border = BORDER_THIN;

  sheet.mergeCells("E32:F32");
  const famH3 = sheet.getCell("E32");
  famH3.value = "Năm sinh";
  famH3.font = { name: FONT_NAME, size: 10, bold: true };
  famH3.alignment = CENTER;
  famH3.border = BORDER_THIN;

  sheet.mergeCells("G32:K32");
  const famH4 = sheet.getCell("G32");
  famH4.value = "Nghề nghiệp";
  famH4.font = { name: FONT_NAME, size: 10, bold: true };
  famH4.alignment = CENTER;
  famH4.border = BORDER_THIN;
  sheet.getRow(32).height = 24;

  const familyMembers = pi?.familyMembers || [];
  for (let i = 0; i < 5; i += 1) {
    const r = 33 + i;
    const member = familyMembers[i];

    sheet.mergeCells(`A${r}:B${r}`);
    const c1 = sheet.getCell(`A${r}`);
    c1.value = member ? safeString(member.name) : "";
    c1.font = { name: FONT_NAME, size: 10 };
    c1.alignment = LEFT_WRAP;
    c1.border = BORDER_DOTTED;

    sheet.mergeCells(`C${r}:D${r}`);
    const c2 = sheet.getCell(`C${r}`);
    c2.value = member ? safeString(member.relationship) : "";
    c2.font = { name: FONT_NAME, size: 10 };
    c2.alignment = LEFT;
    c2.border = BORDER_DOTTED;

    sheet.mergeCells(`E${r}:F${r}`);
    const c3 = sheet.getCell(`E${r}`);
    c3.value = member?.birthYear ?? "";
    c3.font = { name: FONT_NAME, size: 10 };
    c3.alignment = CENTER;
    c3.border = BORDER_DOTTED;

    sheet.mergeCells(`G${r}:K${r}`);
    const c4 = sheet.getCell(`G${r}`);
    c4.value = member ? safeString(member.occupation) : "";
    c4.font = { name: FONT_NAME, size: 10 };
    c4.alignment = LEFT_WRAP;
    c4.border = BORDER_DOTTED;

    sheet.getRow(r).height = 22;
  }
  sheet.getRow(38).height = 8;

  // --- Khẩn cấp ---
  sheet.mergeCells("A39:K39");
  const emTitle = sheet.getCell("A39");
  emTitle.value = "*** Trường hợp khẩn cấp liên hệ (Thông tin bổ sung hoặc anh/chị/em ruột)";
  emTitle.font = { name: FONT_NAME, size: 10, bold: true, italic: true };
  emTitle.alignment = LEFT;
  sheet.getRow(39).height = 22;

  sheet.getCell("A40").value = "Tên";
  sheet.getCell("A40").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A40").alignment = LEFT;

  sheet.mergeCells("B40:C40");
  const emName = sheet.getCell("B40");
  emName.value = safeString(pi?.emergencyContact?.name);
  emName.font = { name: FONT_NAME, size: 10 };
  emName.alignment = LEFT_WRAP;
  emName.border = BORDER_THIN;

  sheet.getCell("D40").value = "Mối quan hệ";
  sheet.getCell("D40").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("D40").alignment = LEFT;

  sheet.mergeCells("E40:F40");
  const emRel = sheet.getCell("E40");
  emRel.value = safeString(pi?.emergencyContact?.relationship);
  emRel.font = { name: FONT_NAME, size: 10 };
  emRel.alignment = LEFT;
  emRel.border = BORDER_THIN;

  sheet.getCell("G40").value = "Địa chỉ";
  sheet.getCell("G40").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("G40").alignment = LEFT;

  sheet.mergeCells("H40:K40");
  const emAddr = sheet.getCell("H40");
  emAddr.value = safeString(pi?.emergencyContact?.address);
  emAddr.font = { name: FONT_NAME, size: 10 };
  emAddr.alignment = LEFT_WRAP;
  emAddr.border = BORDER_THIN;

  sheet.getCell("G41").value = "Số điện thoại";
  sheet.getCell("G41").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("G41").alignment = LEFT;

  sheet.mergeCells("H41:K41");
  const emPhone = sheet.getCell("H41");
  emPhone.value = safeString(pi?.emergencyContact?.phone);
  emPhone.font = { name: FONT_NAME, size: 10 };
  emPhone.alignment = LEFT;
  emPhone.border = BORDER_THIN;

  sheet.getRow(40).height = 24;
  sheet.getRow(41).height = 24;
  sheet.getRow(42).height = 8;

  // II. Học tập
  writeSectionTitle(sheet, 43, "II. QUÁ TRÌNH HỌC TẬP & ĐÀO TẠO");
  sheet.getRow(44).height = 6;

  sheet.mergeCells("A45:B46");
  const edH1 = sheet.getCell("A45");
  edH1.value = "Thời gian\n(từ ... đến ...)";
  edH1.font = { name: FONT_NAME, size: 10, bold: true };
  edH1.alignment = CENTER;
  edH1.border = BORDER_THIN;

  sheet.mergeCells("C45:F46");
  const edH2 = sheet.getCell("C45");
  edH2.value = "Chuyên ngành / chứng chỉ";
  edH2.font = { name: FONT_NAME, size: 10, bold: true };
  edH2.alignment = CENTER;
  edH2.border = BORDER_THIN;

  sheet.mergeCells("G45:I46");
  const edH3 = sheet.getCell("G45");
  edH3.value = "Tên trường";
  edH3.font = { name: FONT_NAME, size: 10, bold: true };
  edH3.alignment = CENTER;
  edH3.border = BORDER_THIN;

  sheet.mergeCells("J45:K46");
  const edH4 = sheet.getCell("J45");
  edH4.value = "Bằng cấp/Chứng chỉ";
  edH4.font = { name: FONT_NAME, size: 10, bold: true };
  edH4.alignment = CENTER;
  edH4.border = BORDER_THIN;

  sheet.getRow(45).height = 22;
  sheet.getRow(46).height = 22;

  const education = employee.education || [];
  for (let i = 0; i < 3; i += 1) {
    const r = 47 + i;
    const item = education[i];

    sheet.mergeCells(`A${r}:B${r}`);
    const e1 = sheet.getCell(`A${r}`);
    e1.value = item ? `${formatDate(item.fromDate)} - ${formatDate(item.toDate)}` : "";
    e1.font = { name: FONT_NAME, size: 10 };
    e1.alignment = CENTER;
    e1.border = BORDER_DOTTED;

    sheet.mergeCells(`C${r}:F${r}`);
    const e2 = sheet.getCell(`C${r}`);
    e2.value = item ? safeString(item.majorOrCertificate) : "";
    e2.font = { name: FONT_NAME, size: 10 };
    e2.alignment = LEFT_WRAP;
    e2.border = BORDER_DOTTED;

    sheet.mergeCells(`G${r}:I${r}`);
    const e3 = sheet.getCell(`G${r}`);
    e3.value = item ? safeString(item.school) : "";
    e3.font = { name: FONT_NAME, size: 10 };
    e3.alignment = LEFT_WRAP;
    e3.border = BORDER_DOTTED;

    sheet.mergeCells(`J${r}:K${r}`);
    const e4 = sheet.getCell(`J${r}`);
    e4.value = item ? safeString(item.degreeOrCertificate) : "";
    e4.font = { name: FONT_NAME, size: 10 };
    e4.alignment = LEFT_WRAP;
    e4.border = BORDER_DOTTED;

    sheet.getRow(r).height = 28;
  }
  sheet.getRow(50).height = 8;
  sheet.getRow(51).height = 8;

  // III. Kinh nghiệm
  writeSectionTitle(sheet, 52, "III. KINH NGHIỆM LÀM VIỆC (Ghi công việc gần nhất)");
  sheet.getRow(53).height = 6;

  sheet.mergeCells("A54:B55");
  const exH1 = sheet.getCell("A54");
  exH1.value = "Thời gian\n(từ ... đến ...)";
  exH1.font = { name: FONT_NAME, size: 10, bold: true };
  exH1.alignment = CENTER;
  exH1.border = BORDER_THIN;

  sheet.mergeCells("C54:H55");
  const exH2 = sheet.getCell("C54");
  exH2.value = "Công ty / Chức danh\nNhiệm vụ chính";
  exH2.font = { name: FONT_NAME, size: 10, bold: true };
  exH2.alignment = CENTER;
  exH2.border = BORDER_THIN;

  sheet.mergeCells("I54:K55");
  const exH3 = sheet.getCell("I54");
  exH3.value = "Loại hình làm việc";
  exH3.font = { name: FONT_NAME, size: 10, bold: true };
  exH3.alignment = CENTER;
  exH3.border = BORDER_THIN;

  sheet.getRow(54).height = 22;
  sheet.getRow(55).height = 22;

  const experiences = employee.workExperience || [];
  for (let i = 0; i < 3; i += 1) {
    const r = 56 + i;
    const item = experiences[i];

    sheet.mergeCells(`A${r}:B${r}`);
    const x1 = sheet.getCell(`A${r}`);
    x1.value = item ? `${formatDate(item.fromDate)} - ${formatDate(item.toDate)}` : "";
    x1.font = { name: FONT_NAME, size: 10 };
    x1.alignment = CENTER;
    x1.border = BORDER_DOTTED;

    sheet.mergeCells(`C${r}:H${r}`);
    const x2 = sheet.getCell(`C${r}`);
    const companyText = item
      ? `${safeString(item.company)}${item.position ? ` / ${item.position}` : ""}${
          item.responsibilities ? `\n${item.responsibilities}` : ""
        }`
      : "";
    x2.value = companyText;
    x2.font = { name: FONT_NAME, size: 10 };
    x2.alignment = LEFT_TOP;
    x2.border = BORDER_DOTTED;

    sheet.mergeCells(`I${r}:K${r}`);
    const x3 = sheet.getCell(`I${r}`);
    x3.value = item ? safeString(item.employmentType) : "";
    x3.font = { name: FONT_NAME, size: 10 };
    x3.alignment = LEFT_WRAP;
    x3.border = BORDER_DOTTED;

    sheet.getRow(r).height = 34;
  }
  sheet.getRow(59).height = 8;
  sheet.getRow(60).height = 8;
  sheet.getRow(61).height = 8;

  // Ngân hàng
  sheet.getCell("A62").value = "Tên ngân hàng:";
  sheet.getCell("A62").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A62").alignment = LEFT;

  sheet.mergeCells("B62:F62");
  const bankName = sheet.getCell("B62");
  bankName.value = safeString(sb?.bankName);
  bankName.font = { name: FONT_NAME, size: 10 };
  bankName.alignment = LEFT_WRAP;
  bankName.border = BORDER_THIN;

  sheet.getCell("G62").value = "Số tài khoản:";
  sheet.getCell("G62").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("G62").alignment = LEFT;

  sheet.mergeCells("H62:K62");
  const bankAcc = sheet.getCell("H62");
  bankAcc.value = safeString(sb?.bankAccountNumber);
  bankAcc.font = { name: FONT_NAME, size: 10 };
  bankAcc.alignment = LEFT;
  bankAcc.border = BORDER_THIN;

  sheet.getCell("G63").value = "Chi nhánh:";
  sheet.getCell("G63").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("G63").alignment = LEFT;

  sheet.mergeCells("H63:K63");
  const bankBranch = sheet.getCell("H63");
  bankBranch.value = safeString(sb?.bankBranch);
  bankBranch.font = { name: FONT_NAME, size: 10 };
  bankBranch.alignment = LEFT_WRAP;
  bankBranch.border = BORDER_THIN;

  sheet.getRow(62).height = 22;
  sheet.getRow(63).height = 22;
  sheet.getRow(64).height = 8;

  // IV. Cam kết
  writeSectionTitle(sheet, 65, "IV. CAM KẾT");

  sheet.mergeCells("A66:K66");
  const cam1 = sheet.getCell("A66");
  cam1.value = "Tôi xin cam đoan những thông tin cung cấp trên đây là hoàn toàn chính xác và đầy đủ.";
  cam1.font = { name: FONT_NAME, size: 10 };
  cam1.alignment = LEFT;
  sheet.getRow(66).height = 20;

  sheet.mergeCells("A67:K67");
  const cam2 = sheet.getCell("A67");
  cam2.value = "Tôi xin chịu trách nhiệm và chấp nhận việc điều tra các thông tin đã cung cấp.";
  cam2.font = { name: FONT_NAME, size: 10 };
  cam2.alignment = LEFT;
  sheet.getRow(67).height = 20;
  sheet.getRow(68).height = 10;

  const today = new Date();
  const dateLine = `Ngày ${String(today.getDate()).padStart(2, "0")} / ${String(
    today.getMonth() + 1
  ).padStart(2, "0")} / ${today.getFullYear()}`;

  sheet.mergeCells("G69:K69");
  const dateCell = sheet.getCell("G69");
  dateCell.value = dateLine;
  dateCell.font = { name: FONT_NAME, size: 10, italic: true };
  dateCell.alignment = CENTER;

  sheet.mergeCells("G70:K70");
  const sigLabel = sheet.getCell("G70");
  sigLabel.value = "Ký và ghi rõ họ tên";
  sigLabel.font = { name: FONT_NAME, size: 10, bold: true };
  sigLabel.alignment = CENTER;

  sheet.mergeCells("G71:K74");
  for (let r = 71; r <= 74; r += 1) {
    sheet.getRow(r).height = 20;
  }

  await tryInsertLogo(workbook, sheet, "A1");
  sheet.pageSetup.printTitlesRow = "1:6";

  return sheet;
}

/* ============================================================
 *  BUILDER 2: HỢP ĐỒNG LAO ĐỘNG (sheet "HopDong")
 * ============================================================ */

function buildContractSheet(
  workbook: ExcelJS.Workbook,
  employee: Employee
): ExcelJS.Worksheet {
  const sheet = workbook.addWorksheet("HopDong", { pageSetup: A4_PORTRAIT });

  const pi = employee.personalInfo;
  const wi = employee.workInfo;
  const ci = employee.contractInfo;
  const sb = employee.salaryAndBenefits;

  sheet.columns = [
    { width: 18 }, { width: 12 }, { width: 14 }, { width: 10 },
    { width: 14 }, { width: 10 }, { width: 12 }, { width: 10 },
    { width: 10 }, { width: 10 }, { width: 14 },
  ];

  writeCommonHeader(sheet, "HỢP ĐỒNG LAO ĐỘNG");
  writeCommonHeaderBlock(sheet, employee);

  /* I. THÔNG TIN NHÂN VIÊN */
  writeSectionTitle(sheet, 10, "I. THÔNG TIN NHÂN VIÊN");

  // Hàng 1: Họ tên (A-C) | Mã NV (D-F) | Ngày sinh (G-I) | Giới tính (J-K)
  sheet.getCell("A11").value = "1. Họ và tên";
  sheet.getCell("A11").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A11").alignment = LEFT;

  sheet.getCell("D11").value = "2. Mã NV";
  sheet.getCell("D11").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("D11").alignment = LEFT;

  sheet.getCell("G11").value = "3. Ngày sinh";
  sheet.getCell("G11").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("G11").alignment = LEFT;

  sheet.getCell("J11").value = "4. Giới tính";
  sheet.getCell("J11").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("J11").alignment = LEFT;

  sheet.mergeCells("A12:C12");
  const nameCell = sheet.getCell("A12");
  nameCell.value = safeString(employee.name);
  nameCell.font = { name: FONT_NAME, size: 10 };
  nameCell.alignment = LEFT_WRAP;
  nameCell.border = BORDER_THIN;

  sheet.mergeCells("D12:F12");
  const codeCell = sheet.getCell("D12");
  codeCell.value = safeString(wi?.employeeCode);
  codeCell.font = { name: FONT_NAME, size: 10 };
  codeCell.alignment = LEFT;
  codeCell.border = BORDER_THIN;

  sheet.mergeCells("G12:I12");
  const dobCell = sheet.getCell("G12");
  dobCell.value = formatDate(pi?.dateOfBirth);
  dobCell.font = { name: FONT_NAME, size: 10 };
  dobCell.alignment = LEFT;
  dobCell.border = BORDER_THIN;

  sheet.mergeCells("J12:K12");
  const genderCell = sheet.getCell("J12");
  genderCell.value = getGenderLabel(pi?.gender);
  genderCell.font = { name: FONT_NAME, size: 10 };
  genderCell.alignment = LEFT;
  genderCell.border = BORDER_THIN;

  sheet.getRow(11).height = 18;
  sheet.getRow(12).height = 28;
  sheet.getRow(13).height = 6;

  // Hàng 2: CCCD (A-C) | Ngày cấp (D-F) | Nơi cấp (G-I) | Phòng ban (J-K)
  sheet.getCell("A14").value = "5. Số CMND/CCCD";
  sheet.getCell("A14").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A14").alignment = LEFT;

  sheet.getCell("D14").value = "6. Ngày cấp";
  sheet.getCell("D14").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("D14").alignment = LEFT;

  sheet.getCell("G14").value = "7. Nơi cấp";
  sheet.getCell("G14").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("G14").alignment = LEFT;

  sheet.getCell("J14").value = "8. Phòng ban";
  sheet.getCell("J14").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("J14").alignment = LEFT;

  sheet.mergeCells("A15:C15");
  const idCell = sheet.getCell("A15");
  idCell.value = safeString(pi?.idCardNumber);
  idCell.font = { name: FONT_NAME, size: 10 };
  idCell.alignment = LEFT;
  idCell.border = BORDER_THIN;

  sheet.mergeCells("D15:F15");
  const idDateCell = sheet.getCell("D15");
  idDateCell.value = formatDate(pi?.idCardIssueDate);
  idDateCell.font = { name: FONT_NAME, size: 10 };
  idDateCell.alignment = LEFT;
  idDateCell.border = BORDER_THIN;

  sheet.mergeCells("G15:I15");
  const idPlaceCell = sheet.getCell("G15");
  idPlaceCell.value = safeString(pi?.idCardIssuePlace);
  idPlaceCell.font = { name: FONT_NAME, size: 10 };
  idPlaceCell.alignment = LEFT_WRAP;
  idPlaceCell.border = BORDER_THIN;

  sheet.mergeCells("J15:K15");
  const deptCell = sheet.getCell("J15");
  deptCell.value = safeString(wi?.department);
  deptCell.font = { name: FONT_NAME, size: 10 };
  deptCell.alignment = LEFT_WRAP;
  deptCell.border = BORDER_THIN;

  sheet.getRow(14).height = 18;
  sheet.getRow(15).height = 28;
  sheet.getRow(16).height = 6;

  // Hàng 3: Chức vụ (A-K full)
  sheet.mergeCells("A17:K17");
  const posLabel = sheet.getCell("A17");
  posLabel.value = "9. Chức vụ";
  posLabel.font = { name: FONT_NAME, size: 10 };
  posLabel.alignment = LEFT;

  sheet.mergeCells("A18:K18");
  const posCell = sheet.getCell("A18");
  posCell.value = safeString(wi?.position);
  posCell.font = { name: FONT_NAME, size: 10 };
  posCell.alignment = LEFT_WRAP;
  posCell.border = BORDER_THIN;

  sheet.getRow(17).height = 18;
  sheet.getRow(18).height = 26;
  sheet.getRow(19).height = 6;

  // Hàng 4: Địa chỉ thường trú (A-K full)
  sheet.mergeCells("A20:K20");
  const addrLabel = sheet.getCell("A20");
  addrLabel.value = "10. Địa chỉ thường trú";
  addrLabel.font = { name: FONT_NAME, size: 10 };
  addrLabel.alignment = LEFT;
  sheet.getRow(20).height = 18;

  sheet.mergeCells("A21:K22");
  const addrCell = sheet.getCell("A21");
  addrCell.value = safeString(pi?.permanentAddress);
  addrCell.font = { name: FONT_NAME, size: 10 };
  addrCell.alignment = LEFT_TOP;
  addrCell.border = BORDER_THIN;
  sheet.getRow(21).height = 20;
  sheet.getRow(22).height = 20;
  sheet.getRow(23).height = 6;

  /* II. THÔNG TIN HỢP ĐỒNG */
  writeSectionTitle(sheet, 24, "II. THÔNG TIN HỢP ĐỒNG");

  // Hàng 1: Số HĐ (A-C) | Loại HĐ (D-K)
  sheet.getCell("A25").value = "11. Số hợp đồng";
  sheet.getCell("A25").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A25").alignment = LEFT;

  sheet.getCell("D25").value = "12. Loại hợp đồng";
  sheet.getCell("D25").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("D25").alignment = LEFT;

  sheet.mergeCells("A26:C26");
  const numCell = sheet.getCell("A26");
  numCell.value = safeString(ci?.contractNumber);
  numCell.font = { name: FONT_NAME, size: 10 };
  numCell.alignment = LEFT;
  numCell.border = BORDER_THIN;

  sheet.mergeCells("D26:K26");
  const typeCell = sheet.getCell("D26");
  typeCell.value = safeString(ci?.contractType);
  typeCell.font = { name: FONT_NAME, size: 10 };
  typeCell.alignment = LEFT_WRAP;
  typeCell.border = BORDER_THIN;

  sheet.getRow(25).height = 18;
  sheet.getRow(26).height = 28;
  sheet.getRow(27).height = 6;

  // Hàng 2: Ngày bắt đầu (A-C) | Ngày kết thúc (D-F) | Ngày nhận việc (G-I) | Thử việc từ (J-K)
  sheet.getCell("A28").value = "13. Ngày bắt đầu";
  sheet.getCell("A28").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A28").alignment = LEFT;

  sheet.getCell("D28").value = "14. Ngày kết thúc";
  sheet.getCell("D28").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("D28").alignment = LEFT;

  sheet.getCell("G28").value = "15. Ngày nhận việc";
  sheet.getCell("G28").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("G28").alignment = LEFT;

  sheet.getCell("J28").value = "16. Bắt đầu thử việc";
  sheet.getCell("J28").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("J28").alignment = LEFT;

  sheet.mergeCells("A29:C29");
  const startCell = sheet.getCell("A29");
  startCell.value = formatDate(ci?.contractStartDate);
  startCell.font = { name: FONT_NAME, size: 10 };
  startCell.alignment = LEFT;
  startCell.border = BORDER_THIN;

  sheet.mergeCells("D29:F29");
  const endCell = sheet.getCell("D29");
  endCell.value = formatDate(ci?.contractEndDate);
  endCell.font = { name: FONT_NAME, size: 10 };
  endCell.alignment = LEFT;
  endCell.border = BORDER_THIN;

  sheet.mergeCells("G29:I29");
  const hireCell = sheet.getCell("G29");
  hireCell.value = formatDate(wi?.startDate);
  hireCell.font = { name: FONT_NAME, size: 10 };
  hireCell.alignment = LEFT;
  hireCell.border = BORDER_THIN;

  sheet.mergeCells("J29:K29");
  const probStartCell = sheet.getCell("J29");
  probStartCell.value = formatDate(ci?.probationStartDate);
  probStartCell.font = { name: FONT_NAME, size: 10 };
  probStartCell.alignment = LEFT;
  probStartCell.border = BORDER_THIN;

  sheet.getRow(28).height = 18;
  sheet.getRow(29).height = 28;
  sheet.getRow(30).height = 6;

  // Hàng 3: Kết thúc thử việc (A-K full)
  sheet.mergeCells("A31:K31");
  const probEndLabel = sheet.getCell("A31");
  probEndLabel.value = "17. Kết thúc thử việc";
  probEndLabel.font = { name: FONT_NAME, size: 10 };
  probEndLabel.alignment = LEFT;

  sheet.mergeCells("A32:K32");
  const probEndCell = sheet.getCell("A32");
  probEndCell.value = formatDate(ci?.probationEndDate);
  probEndCell.font = { name: FONT_NAME, size: 10 };
  probEndCell.alignment = LEFT;
  probEndCell.border = BORDER_THIN;

  sheet.getRow(31).height = 18;
  sheet.getRow(32).height = 26;
  sheet.getRow(33).height = 6;

  /* III. LƯƠNG & BẢO HIỂM */
  writeSectionTitle(sheet, 34, "III. LƯƠNG & BẢO HIỂM");

  // Hàng 1: Lương CB (A-C) | Lương BH (D-F) | Tiền ăn (G-I) | BHXH (J-K)
  sheet.getCell("A35").value = "18. Lương cơ bản";
  sheet.getCell("A35").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A35").alignment = LEFT;

  sheet.getCell("D35").value = "19. Lương đóng BH";
  sheet.getCell("D35").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("D35").alignment = LEFT;

  sheet.getCell("G35").value = "20. Tiền ăn";
  sheet.getCell("G35").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("G35").alignment = LEFT;

  sheet.getCell("J35").value = "21. Số sổ BHXH";
  sheet.getCell("J35").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("J35").alignment = LEFT;

  sheet.mergeCells("A36:C36");
  const baseSal = sheet.getCell("A36");
  baseSal.value = formatMoney(sb?.baseSalary) + " VNĐ";
  baseSal.font = { name: FONT_NAME, size: 10 };
  baseSal.alignment = RIGHT;
  baseSal.border = BORDER_THIN;

  sheet.mergeCells("D36:F36");
  const insSal = sheet.getCell("D36");
  insSal.value = formatMoney(sb?.insuranceSalary) + " VNĐ";
  insSal.font = { name: FONT_NAME, size: 10 };
  insSal.alignment = RIGHT;
  insSal.border = BORDER_THIN;

  sheet.mergeCells("G36:I36");
  const meal = sheet.getCell("G36");
  meal.value = formatMoney(sb?.mealRate) + " VNĐ";
  meal.font = { name: FONT_NAME, size: 10 };
  meal.alignment = RIGHT;
  meal.border = BORDER_THIN;

  sheet.mergeCells("J36:K36");
  const bhxh = sheet.getCell("J36");
  bhxh.value = safeString(sb?.socialInsuranceNumber);
  bhxh.font = { name: FONT_NAME, size: 10 };
  bhxh.alignment = LEFT;
  bhxh.border = BORDER_THIN;

  sheet.getRow(35).height = 18;
  sheet.getRow(36).height = 28;
  sheet.getRow(37).height = 6;

  // Hàng 2: Mã số thuế (A-K full)
  sheet.mergeCells("A38:K38");
  const taxLabel = sheet.getCell("A38");
  taxLabel.value = "22. Mã số thuế";
  taxLabel.font = { name: FONT_NAME, size: 10 };
  taxLabel.alignment = LEFT;

  sheet.mergeCells("A39:K39");
  const tax = sheet.getCell("A39");
  tax.value = safeString(sb?.taxCode);
  tax.font = { name: FONT_NAME, size: 10 };
  tax.alignment = LEFT;
  tax.border = BORDER_THIN;

  sheet.getRow(38).height = 18;
  sheet.getRow(39).height = 26;
  sheet.getRow(40).height = 6;

  /* IV. GHI CHÚ */
  writeSectionTitle(sheet, 41, "IV. GHI CHÚ");

  sheet.mergeCells("A42:K43");
  const notesCell = sheet.getCell("A42");
  notesCell.value = safeString(ci?.notes);
  notesCell.font = { name: FONT_NAME, size: 10 };
  notesCell.alignment = LEFT_TOP;
  notesCell.border = BORDER_THIN;
  sheet.getRow(42).height = 20;
  sheet.getRow(43).height = 20;

  sheet.getRow(44).height = 8;

  /* V. XÁC NHẬN */
  writeSectionTitle(sheet, 45, "V. XÁC NHẬN CỦA HAI BÊN");

  sheet.mergeCells("A46:K46");
  const dateCell = sheet.getCell("A46");
  const today = new Date();
  dateCell.value = `Ngày ${String(today.getDate()).padStart(2, "0")} tháng ${String(
    today.getMonth() + 1
  ).padStart(2, "0")} năm ${today.getFullYear()}`;
  dateCell.font = { name: FONT_NAME, size: 10, italic: true };
  dateCell.alignment = RIGHT;
  sheet.getRow(46).height = 20;

  sheet.mergeCells("A47:E47");
  const leftLabel = sheet.getCell("A47");
  leftLabel.value = "NGƯỜI LAO ĐỘNG";
  leftLabel.font = { name: FONT_NAME, size: 11, bold: true };
  leftLabel.alignment = CENTER;

  sheet.mergeCells("G47:K47");
  const rightLabel = sheet.getCell("G47");
  rightLabel.value = "ĐẠI DIỆN CÔNG TY";
  rightLabel.font = { name: FONT_NAME, size: 11, bold: true };
  rightLabel.alignment = CENTER;

  sheet.mergeCells("A48:E48");
  const leftHint = sheet.getCell("A48");
  leftHint.value = "(Ký, ghi rõ họ tên)";
  leftHint.font = { name: FONT_NAME, size: 10, italic: true };
  leftHint.alignment = CENTER;

  sheet.mergeCells("G48:K48");
  const rightHint = sheet.getCell("G48");
  rightHint.value = "(Ký, ghi rõ họ tên)";
  rightHint.font = { name: FONT_NAME, size: 10, italic: true };
  rightHint.alignment = CENTER;

  sheet.mergeCells("A49:E52");
  sheet.mergeCells("G49:K52");
  for (let r = 49; r <= 52; r += 1) {
    sheet.getRow(r).height = 20;
  }

  sheet.mergeCells("A53:E53");
  const leftName = sheet.getCell("A53");
  leftName.value = safeString(employee.name);
  leftName.font = { name: FONT_NAME, size: 10, bold: true };
  leftName.alignment = CENTER;

  sheet.mergeCells("G53:K53");
  const rightName = sheet.getCell("G53");
  rightName.value = "";
  rightName.font = { name: FONT_NAME, size: 10, bold: true };
  rightName.alignment = CENTER;

  sheet.getRow(53).height = 20;

  sheet.pageSetup.printTitlesRow = "1:6";

  return sheet;
}

/* ============================================================
 *  BUILDER 3: LƯƠNG & BẢO HIỂM (sheet "LuongBaoHiem")
 * ============================================================ */

function buildSalaryInsuranceSheet(
  workbook: ExcelJS.Workbook,
  employee: Employee
): ExcelJS.Worksheet {
  const sheet = workbook.addWorksheet("LuongBaoHiem", { pageSetup: A4_PORTRAIT });

  const wi = employee.workInfo;
  const sb = employee.salaryAndBenefits;

  sheet.columns = [
    { width: 18 }, { width: 12 }, { width: 14 }, { width: 10 },
    { width: 14 }, { width: 10 }, { width: 12 }, { width: 10 },
    { width: 10 }, { width: 10 }, { width: 14 },
  ];

  writeCommonHeader(sheet, "LƯƠNG & BẢO HIỂM");
  writeCommonHeaderBlock(sheet, employee);

  /* I. THÔNG TIN NHÂN VIÊN */
  writeSectionTitle(sheet, 10, "I. THÔNG TIN NHÂN VIÊN");

  // Hàng 1: Họ tên (A-C) | Mã NV (D-F) | Phòng ban (G-K)
  sheet.getCell("A11").value = "1. Họ và tên";
  sheet.getCell("A11").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A11").alignment = LEFT;

  sheet.getCell("D11").value = "2. Mã NV";
  sheet.getCell("D11").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("D11").alignment = LEFT;

  sheet.getCell("G11").value = "3. Phòng ban";
  sheet.getCell("G11").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("G11").alignment = LEFT;

  sheet.mergeCells("A12:C12");
  const nameCell = sheet.getCell("A12");
  nameCell.value = safeString(employee.name);
  nameCell.font = { name: FONT_NAME, size: 10 };
  nameCell.alignment = LEFT_WRAP;
  nameCell.border = BORDER_THIN;

  sheet.mergeCells("D12:F12");
  const codeCell = sheet.getCell("D12");
  codeCell.value = safeString(wi?.employeeCode);
  codeCell.font = { name: FONT_NAME, size: 10 };
  codeCell.alignment = LEFT;
  codeCell.border = BORDER_THIN;

  sheet.mergeCells("G12:K12");
  const deptCell = sheet.getCell("G12");
  deptCell.value = safeString(wi?.department);
  deptCell.font = { name: FONT_NAME, size: 10 };
  deptCell.alignment = LEFT_WRAP;
  deptCell.border = BORDER_THIN;

  sheet.getRow(11).height = 18;
  sheet.getRow(12).height = 28;
  sheet.getRow(13).height = 6;

  // Hàng 2: Chức vụ (A-C) | Ngày nhận việc (D-F) | Trạng thái (G-K)
  sheet.getCell("A14").value = "4. Chức vụ";
  sheet.getCell("A14").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A14").alignment = LEFT;

  sheet.getCell("D14").value = "5. Ngày nhận việc";
  sheet.getCell("D14").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("D14").alignment = LEFT;

  sheet.getCell("G14").value = "6. Trạng thái";
  sheet.getCell("G14").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("G14").alignment = LEFT;

  sheet.mergeCells("A15:C15");
  const posCell = sheet.getCell("A15");
  posCell.value = safeString(wi?.position);
  posCell.font = { name: FONT_NAME, size: 10 };
  posCell.alignment = LEFT_WRAP;
  posCell.border = BORDER_THIN;

  sheet.mergeCells("D15:F15");
  const hireCell = sheet.getCell("D15");
  hireCell.value = formatDate(wi?.startDate);
  hireCell.font = { name: FONT_NAME, size: 10 };
  hireCell.alignment = LEFT;
  hireCell.border = BORDER_THIN;

  sheet.mergeCells("G15:K15");
  const statusCell = sheet.getCell("G15");
  statusCell.value = getStatusLabel(employee.status);
  statusCell.font = { name: FONT_NAME, size: 10 };
  statusCell.alignment = LEFT;
  statusCell.border = BORDER_THIN;

  sheet.getRow(14).height = 18;
  sheet.getRow(15).height = 28;
  sheet.getRow(16).height = 6;

  /* II. LƯƠNG */
  writeSectionTitle(sheet, 17, "II. LƯƠNG");

  // Hàng 1: Lương CB (A-C) | Lương BH (D-F) | Tiền ăn (G-K)
  sheet.getCell("A18").value = "7. Lương cơ bản";
  sheet.getCell("A18").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A18").alignment = LEFT;

  sheet.getCell("D18").value = "8. Lương đóng BH";
  sheet.getCell("D18").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("D18").alignment = LEFT;

  sheet.getCell("G18").value = "9. Tiền ăn";
  sheet.getCell("G18").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("G18").alignment = LEFT;

  sheet.mergeCells("A19:C19");
  const baseCell = sheet.getCell("A19");
  baseCell.value = formatMoney(sb?.baseSalary) + " VNĐ";
  baseCell.font = { name: FONT_NAME, size: 10 };
  baseCell.alignment = RIGHT;
  baseCell.border = BORDER_THIN;

  sheet.mergeCells("D19:F19");
  const insCell = sheet.getCell("D19");
  insCell.value = formatMoney(sb?.insuranceSalary) + " VNĐ";
  insCell.font = { name: FONT_NAME, size: 10 };
  insCell.alignment = RIGHT;
  insCell.border = BORDER_THIN;

  sheet.mergeCells("G19:K19");
  const mealCell = sheet.getCell("G19");
  mealCell.value = formatMoney(sb?.mealRate) + " VNĐ";
  mealCell.font = { name: FONT_NAME, size: 10 };
  mealCell.alignment = RIGHT;
  mealCell.border = BORDER_THIN;

  sheet.getRow(18).height = 18;
  sheet.getRow(19).height = 28;
  sheet.getRow(20).height = 6;

  // Hàng 2: Người phụ thuộc (A-C) | Kỳ trả lương (D-K)
  sheet.getCell("A21").value = "10. Người phụ thuộc";
  sheet.getCell("A21").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A21").alignment = LEFT;

  sheet.getCell("D21").value = "11. Kỳ trả lương";
  sheet.getCell("D21").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("D21").alignment = LEFT;

  sheet.mergeCells("A22:C22");
  const depCell = sheet.getCell("A22");
  depCell.value = safeString(sb?.dependents);
  depCell.font = { name: FONT_NAME, size: 10 };
  depCell.alignment = LEFT;
  depCell.border = BORDER_THIN;

  sheet.mergeCells("D22:K22");
  const periodCell = sheet.getCell("D22");
  periodCell.value = safeString(sb?.paymentPeriod);
  periodCell.font = { name: FONT_NAME, size: 10 };
  periodCell.alignment = LEFT_WRAP;
  periodCell.border = BORDER_THIN;

  sheet.getRow(21).height = 18;
  sheet.getRow(22).height = 28;
  sheet.getRow(23).height = 6;

  /* III. THƯỞNG */
  writeSectionTitle(sheet, 24, "III. THƯỞNG");

  // Hàng 1: Thưởng chung (A-C) | Thưởng hiệu suất (D-F) | Thưởng trách nhiệm (G-K)
  sheet.getCell("A25").value = "12. Thưởng chung";
  sheet.getCell("A25").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A25").alignment = LEFT;

  sheet.getCell("D25").value = "13. Thưởng hiệu suất";
  sheet.getCell("D25").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("D25").alignment = LEFT;

  sheet.getCell("G25").value = "14. Thưởng trách nhiệm";
  sheet.getCell("G25").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("G25").alignment = LEFT;

  sheet.mergeCells("A26:C26");
  const bonus1 = sheet.getCell("A26");
  bonus1.value = formatMoney(sb?.bonuses?.general) + " VNĐ";
  bonus1.font = { name: FONT_NAME, size: 10 };
  bonus1.alignment = RIGHT;
  bonus1.border = BORDER_THIN;

  sheet.mergeCells("D26:F26");
  const bonus2 = sheet.getCell("D26");
  bonus2.value = formatMoney(sb?.bonuses?.performance) + " VNĐ";
  bonus2.font = { name: FONT_NAME, size: 10 };
  bonus2.alignment = RIGHT;
  bonus2.border = BORDER_THIN;

  sheet.mergeCells("G26:K26");
  const bonus3 = sheet.getCell("G26");
  bonus3.value = formatMoney(sb?.bonuses?.responsibility) + " VNĐ";
  bonus3.font = { name: FONT_NAME, size: 10 };
  bonus3.alignment = RIGHT;
  bonus3.border = BORDER_THIN;

  sheet.getRow(25).height = 18;
  sheet.getRow(26).height = 28;
  sheet.getRow(27).height = 6;

  /* IV. BẢO HIỂM & THUẾ */
  writeSectionTitle(sheet, 28, "IV. BẢO HIỂM & THUẾ");

  // Hàng 1: BHXH (A-C) | Mã số thuế (D-K)
  sheet.getCell("A29").value = "15. Số sổ BHXH";
  sheet.getCell("A29").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A29").alignment = LEFT;

  sheet.getCell("D29").value = "16. Mã số thuế";
  sheet.getCell("D29").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("D29").alignment = LEFT;

  sheet.mergeCells("A30:C30");
  const bhxhCell = sheet.getCell("A30");
  bhxhCell.value = safeString(sb?.socialInsuranceNumber);
  bhxhCell.font = { name: FONT_NAME, size: 10 };
  bhxhCell.alignment = LEFT;
  bhxhCell.border = BORDER_THIN;

  sheet.mergeCells("D30:K30");
  const taxCell = sheet.getCell("D30");
  taxCell.value = safeString(sb?.taxCode);
  taxCell.font = { name: FONT_NAME, size: 10 };
  taxCell.alignment = LEFT;
  taxCell.border = BORDER_THIN;

  sheet.getRow(29).height = 18;
  sheet.getRow(30).height = 28;
  sheet.getRow(31).height = 6;

  /* V. NGÂN HÀNG */
  writeSectionTitle(sheet, 32, "V. THÔNG TIN NGÂN HÀNG");

  // Hàng 1: Ngân hàng (A-C) | Chi nhánh (D-K)
  sheet.getCell("A33").value = "17. Ngân hàng";
  sheet.getCell("A33").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A33").alignment = LEFT;

  sheet.getCell("D33").value = "18. Chi nhánh";
  sheet.getCell("D33").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("D33").alignment = LEFT;

  sheet.mergeCells("A34:C34");
  const bankNameCell = sheet.getCell("A34");
  bankNameCell.value = safeString(sb?.bankName);
  bankNameCell.font = { name: FONT_NAME, size: 10 };
  bankNameCell.alignment = LEFT_WRAP;
  bankNameCell.border = BORDER_THIN;

  sheet.mergeCells("D34:K34");
  const branchCell = sheet.getCell("D34");
  branchCell.value = safeString(sb?.bankBranch);
  branchCell.font = { name: FONT_NAME, size: 10 };
  branchCell.alignment = LEFT_WRAP;
  branchCell.border = BORDER_THIN;

  sheet.getRow(33).height = 18;
  sheet.getRow(34).height = 28;
  sheet.getRow(35).height = 6;

  // Hàng 2: Số tài khoản (A-C) | Phương thức TT (D-K)
  sheet.getCell("A36").value = "19. Số tài khoản";
  sheet.getCell("A36").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A36").alignment = LEFT;

  sheet.getCell("D36").value = "20. Phương thức TT";
  sheet.getCell("D36").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("D36").alignment = LEFT;

  sheet.mergeCells("A37:C37");
  const accCell = sheet.getCell("A37");
  accCell.value = safeString(sb?.bankAccountNumber);
  accCell.font = { name: FONT_NAME, size: 10 };
  accCell.alignment = LEFT;
  accCell.border = BORDER_THIN;

  sheet.mergeCells("D37:K37");
  const methodCell = sheet.getCell("D37");
  methodCell.value = safeString(sb?.paymentMethod);
  methodCell.font = { name: FONT_NAME, size: 10 };
  methodCell.alignment = LEFT_WRAP;
  methodCell.border = BORDER_THIN;

  sheet.getRow(36).height = 18;
  sheet.getRow(37).height = 28;
  sheet.getRow(38).height = 6;
  sheet.getRow(39).height = 6;

  /* NGÀY + CHỮ KÝ */
  sheet.mergeCells("G40:K40");
  const dateCell = sheet.getCell("G40");
  const today = new Date();
  dateCell.value = `Ngày ${String(today.getDate()).padStart(2, "0")} tháng ${String(
    today.getMonth() + 1
  ).padStart(2, "0")} năm ${today.getFullYear()}`;
  dateCell.font = { name: FONT_NAME, size: 10, italic: true };
  dateCell.alignment = CENTER;
  sheet.getRow(40).height = 20;

  sheet.mergeCells("G41:K41");
  const sigLabel = sheet.getCell("G41");
  sigLabel.value = "Người lập biểu";
  sigLabel.font = { name: FONT_NAME, size: 10, bold: true };
  sigLabel.alignment = CENTER;

  sheet.mergeCells("G42:K45");
  for (let r = 42; r <= 45; r += 1) {
    sheet.getRow(r).height = 20;
  }

  sheet.pageSetup.printTitlesRow = "1:6";

  return sheet;
}

/* ============================================================
 *  SHEET PHỤ: GIA ĐÌNH
 * ============================================================ */

function buildFamilySheet(
  workbook: ExcelJS.Workbook,
  employee: Employee
): ExcelJS.Worksheet {
  const sheet = workbook.addWorksheet("GiaDinh", { pageSetup: A4_LANDSCAPE });

  sheet.columns = [
    { width: 18 }, { width: 25 }, { width: 25 },
    { width: 18 }, { width: 12 }, { width: 28 },
  ];

  const headers = ["Mã nhân viên", "Họ và tên", "Tên thành viên", "Quan hệ", "Năm sinh", "Nghề nghiệp"];

  headers.forEach((h, i) => {
    const cell = sheet.getCell(1, i + 1);
    cell.value = h;
    cell.font = { name: FONT_NAME, size: 10, bold: true };
    cell.alignment = CENTER;
    cell.border = BORDER_THIN;
  });
  sheet.getRow(1).height = 24;

  const members = employee.personalInfo?.familyMembers || [];

  if (members.length === 0) {
    const emptyValues = [
      safeString(employee.workInfo?.employeeCode),
      safeString(employee.name),
      "", "", "", "",
    ];
    emptyValues.forEach((v, i) => {
      const cell = sheet.getCell(2, i + 1);
      cell.value = v;
      cell.font = { name: FONT_NAME, size: 10 };
      cell.alignment = LEFT;
      cell.border = BORDER_THIN;
    });
  } else {
    members.forEach((m, idx) => {
      const row = idx + 2;
      const values = [
        safeString(employee.workInfo?.employeeCode),
        safeString(employee.name),
        safeString(m.name),
        safeString(m.relationship),
        m.birthYear ?? "",
        safeString(m.occupation),
      ];
      values.forEach((v, i) => {
        const cell = sheet.getCell(row, i + 1);
        cell.value = v;
        cell.font = { name: FONT_NAME, size: 10 };
        cell.alignment = LEFT;
        cell.border = BORDER_THIN;
      });
      sheet.getRow(row).height = 22;
    });
  }

  return sheet;
}

/* ============================================================
 *  SHEET PHỤ: HỌC TẬP
 * ============================================================ */

function buildEducationSheet(
  workbook: ExcelJS.Workbook,
  employee: Employee
): ExcelJS.Worksheet {
  const sheet = workbook.addWorksheet("HocTap", { pageSetup: A4_LANDSCAPE });

  sheet.columns = [
    { width: 18 }, { width: 25 }, { width: 14 }, { width: 14 },
    { width: 30 }, { width: 30 }, { width: 30 },
  ];

  const headers = [
    "Mã nhân viên", "Họ và tên", "Từ ngày", "Đến ngày",
    "Trường", "Chuyên ngành / chứng chỉ", "Bằng cấp / chứng chỉ",
  ];

  headers.forEach((h, i) => {
    const cell = sheet.getCell(1, i + 1);
    cell.value = h;
    cell.font = { name: FONT_NAME, size: 10, bold: true };
    cell.alignment = CENTER;
    cell.border = BORDER_THIN;
  });
  sheet.getRow(1).height = 24;

  const edu = employee.education || [];

  if (edu.length === 0) {
    const emptyValues = [
      safeString(employee.workInfo?.employeeCode),
      safeString(employee.name),
      "", "", "", "", "",
    ];
    emptyValues.forEach((v, i) => {
      const cell = sheet.getCell(2, i + 1);
      cell.value = v;
      cell.font = { name: FONT_NAME, size: 10 };
      cell.border = BORDER_THIN;
    });
  } else {
    edu.forEach((item, idx) => {
      const row = idx + 2;
      const values = [
        safeString(employee.workInfo?.employeeCode),
        safeString(employee.name),
        formatDate(item.fromDate),
        formatDate(item.toDate),
        safeString(item.school),
        safeString(item.majorOrCertificate),
        safeString(item.degreeOrCertificate),
      ];
      values.forEach((v, i) => {
        const cell = sheet.getCell(row, i + 1);
        cell.value = v;
        cell.font = { name: FONT_NAME, size: 10 };
        cell.border = BORDER_THIN;
      });
      sheet.getRow(row).height = 22;
    });
  }

  return sheet;
}

/* ============================================================
 *  SHEET PHỤ: KINH NGHIỆM
 * ============================================================ */

function buildExperienceSheet(
  workbook: ExcelJS.Workbook,
  employee: Employee
): ExcelJS.Worksheet {
  const sheet = workbook.addWorksheet("KinhNghiem", { pageSetup: A4_LANDSCAPE });

  sheet.columns = [
    { width: 18 }, { width: 25 }, { width: 14 }, { width: 14 },
    { width: 30 }, { width: 25 }, { width: 20 }, { width: 45 },
  ];

  const headers = [
    "Mã nhân viên", "Họ và tên", "Từ ngày", "Đến ngày",
    "Công ty", "Chức vụ", "Loại hình", "Nhiệm vụ",
  ];

  headers.forEach((h, i) => {
    const cell = sheet.getCell(1, i + 1);
    cell.value = h;
    cell.font = { name: FONT_NAME, size: 10, bold: true };
    cell.alignment = CENTER;
    cell.border = BORDER_THIN;
  });
  sheet.getRow(1).height = 24;

  const exps = employee.workExperience || [];

  if (exps.length === 0) {
    const emptyValues = [
      safeString(employee.workInfo?.employeeCode),
      safeString(employee.name),
      "", "", "", "", "", "",
    ];
    emptyValues.forEach((v, i) => {
      const cell = sheet.getCell(2, i + 1);
      cell.value = v;
      cell.font = { name: FONT_NAME, size: 10 };
      cell.border = BORDER_THIN;
    });
  } else {
    exps.forEach((item, idx) => {
      const row = idx + 2;
      const values = [
        safeString(employee.workInfo?.employeeCode),
        safeString(employee.name),
        formatDate(item.fromDate),
        formatDate(item.toDate),
        safeString(item.company),
        safeString(item.position),
        safeString(item.employmentType),
        safeString(item.responsibilities),
      ];
      values.forEach((v, i) => {
        const cell = sheet.getCell(row, i + 1);
        cell.value = v;
        cell.font = { name: FONT_NAME, size: 10 };
        cell.border = BORDER_THIN;
      });
      sheet.getRow(row).height = 28;
    });
  }

  return sheet;
}

/* ============================================================
 *  API CHÍNH — SWITCH THEO TEMPLATE
 * ============================================================ */

export async function createEmployeeTemplateWorkbook(
  employee: Employee,
  template: EmployeeTemplateType
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "HRM System";
  workbook.created = new Date();

  switch (template) {
    case "EMPLOYEE_INFO": {
      const sheet = await buildPersonalInfoFormSheet(workbook, employee);
      await tryInsertLogo(workbook, sheet, "A1");
      break;
    }

    case "CONTRACT": {
      const sheet = buildContractSheet(workbook, employee);
      await tryInsertLogo(workbook, sheet, "A1");
      break;
    }

    case "SALARY_INSURANCE": {
      const sheet = buildSalaryInsuranceSheet(workbook, employee);
      await tryInsertLogo(workbook, sheet, "A1");
      break;
    }

    case "RESUME": {
      const sheet = await buildPersonalInfoFormSheet(workbook, employee);
      sheet.getCell("D1").value = "SƠ YẾU LÝ LỊCH";
      await tryInsertLogo(workbook, sheet, "A1");
      buildFamilySheet(workbook, employee);
      buildEducationSheet(workbook, employee);
      buildExperienceSheet(workbook, employee);
      break;
    }

    case "EMPLOYEE_FULL": {
      const sheet02 = await buildPersonalInfoFormSheet(workbook, employee);
      await tryInsertLogo(workbook, sheet02, "A1");

      const sheetHd = buildContractSheet(workbook, employee);
      await tryInsertLogo(workbook, sheetHd, "A1");

      const sheetLb = buildSalaryInsuranceSheet(workbook, employee);
      await tryInsertLogo(workbook, sheetLb, "A1");

      buildFamilySheet(workbook, employee);
      buildEducationSheet(workbook, employee);
      buildExperienceSheet(workbook, employee);
      break;
    }

    default: {
      const sheet = await buildPersonalInfoFormSheet(workbook, employee);
      await tryInsertLogo(workbook, sheet, "A1");
    }
  }

  return workbook;
}

/* ============================================================
 *  EXPORT
 * ============================================================ */

export async function exportEmployeeTemplateToExcel(
  employee: Employee,
  template: EmployeeTemplateType
): Promise<void> {
  const workbook = await createEmployeeTemplateWorkbook(employee, template);
  const buffer = await workbook.xlsx.writeBuffer();

  const employeeCode = employee.workInfo?.employeeCode || employee._id;
  const safeEmployeeCode = employeeCode.replace(/[\\/:*?"<>|]/g, "_");
  const date = new Date().toISOString().split("T")[0];

  const templateNames: Record<EmployeeTemplateType, string> = {
    EMPLOYEE_INFO: "PhieuThongTinNhanSu",
    RESUME: "SoYeuLyLich",
    CONTRACT: "HopDongLaoDong",
    SALARY_INSURANCE: "LuongVaBaoHiem",
    EMPLOYEE_FULL: "HoSoNhanSuTongHop",
  };

  const fileName = `${templateNames[template]}_${safeEmployeeCode}_${date}.xlsx`;

  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 100);
}