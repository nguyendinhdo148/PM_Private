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
 * ============================================================ */

function writeCommonHeader(
  sheet: ExcelJS.Worksheet,
  docTitle: string,
  options?: { hasPhotoBox?: boolean }
): void {
  const hasPhotoBox = options?.hasPhotoBox ?? true;

  // Logo A1:C4
  sheet.mergeCells("A1:C4");
  sheet.getCell("A1").alignment = CENTER;

  // Tiêu đề D1:I4
  sheet.mergeCells("D1:I4");
  const titleCell = sheet.getCell("D1");
  titleCell.value = docTitle;
  titleCell.font = { name: FONT_NAME, size: 16, bold: true };
  titleCell.alignment = CENTER;

  // Ô ảnh J1:K4
  if (hasPhotoBox) {
    sheet.mergeCells("J1:K4");
    const photoCell = sheet.getCell("J1");
    photoCell.value = "Ảnh 3x4";
    photoCell.font = { name: FONT_NAME, size: 10 };
    photoCell.alignment = CENTER;
    photoCell.border = BORDER_THIN;
  }

  sheet.getRow(1).height = 22;
  sheet.getRow(2).height = 22;
  sheet.getRow(3).height = 22;
  sheet.getRow(4).height = 22;
}

/* ============================================================
 *  COMMON HEADER BLOCK — Ngày nhận việc / Chức danh / ĐT / Email
 * ============================================================ */

function writeCommonHeaderBlock(
  sheet: ExcelJS.Worksheet,
  employee: Employee
): void {
  const wi = employee.workInfo;

  sheet.getCell("A5").value = "Ngày nhận việc";
  sheet.getCell("A5").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A5").alignment = LEFT;

  sheet.mergeCells("B5:D6");
  const startDateCell = sheet.getCell("B5");
  startDateCell.value = formatDate(wi?.startDate);
  startDateCell.font = { name: FONT_NAME, size: 10 };
  startDateCell.alignment = LEFT;
  startDateCell.border = BORDER_THIN;

  sheet.getRow(5).height = 24;
  sheet.getRow(6).height = 24;

  sheet.getCell("A7").value = "Chức danh công việc";
  sheet.getCell("A7").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A7").alignment = LEFT;

  sheet.mergeCells("B7:C8");
  const positionCell = sheet.getCell("B7");
  positionCell.value = safeString(wi?.position);
  positionCell.font = { name: FONT_NAME, size: 10 };
  positionCell.alignment = LEFT_WRAP;
  positionCell.border = BORDER_THIN;

  sheet.getCell("D7").value = "Điện thoại di động";
  sheet.getCell("D7").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("D7").alignment = LEFT;

  sheet.mergeCells("E7:F8");
  const phoneCell = sheet.getCell("E7");
  phoneCell.value = safeString(employee.phone);
  phoneCell.font = { name: FONT_NAME, size: 10 };
  phoneCell.alignment = LEFT;
  phoneCell.border = BORDER_THIN;

  sheet.getCell("G7").value = "Email";
  sheet.getCell("G7").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("G7").alignment = LEFT;

  sheet.mergeCells("H7:K8");
  const emailCell = sheet.getCell("H7");
  emailCell.value = safeString(employee.email);
  emailCell.font = { name: FONT_NAME, size: 10 };
  emailCell.alignment = LEFT_WRAP;
  emailCell.border = BORDER_THIN;

  sheet.getRow(7).height = 26;
  sheet.getRow(8).height = 26;
  sheet.getRow(9).height = 8;
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

  // Hàng 1
  sheet.getCell("A11").value = "1. Họ và tên";
  sheet.getCell("A11").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A11").alignment = LEFT;

  sheet.mergeCells("B11:C11");
  const nameCell = sheet.getCell("B11");
  nameCell.value = safeString(employee.name);
  nameCell.font = { name: FONT_NAME, size: 10 };
  nameCell.alignment = LEFT_WRAP;
  nameCell.border = BORDER_THIN;

  sheet.getCell("D11").value = "2. Ngày sinh";
  sheet.getCell("D11").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("D11").alignment = LEFT;

  sheet.mergeCells("E11:F11");
  const dobCell = sheet.getCell("E11");
  dobCell.value = formatDate(pi?.dateOfBirth);
  dobCell.font = { name: FONT_NAME, size: 10 };
  dobCell.alignment = LEFT;
  dobCell.border = BORDER_THIN;

  sheet.getCell("G11").value = "3. Nơi sinh";
  sheet.getCell("G11").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("G11").alignment = LEFT;

  sheet.mergeCells("H11:I11");
  const pobCell = sheet.getCell("H11");
  pobCell.value = safeString(pi?.placeOfBirth);
  pobCell.font = { name: FONT_NAME, size: 10 };
  pobCell.alignment = LEFT_WRAP;
  pobCell.border = BORDER_THIN;

  sheet.getCell("J11").value = "4. Nguyên quán";
  sheet.getCell("J11").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("J11").alignment = LEFT;

  const homeCell = sheet.getCell("K11");
  homeCell.value = safeString(pi?.hometown);
  homeCell.font = { name: FONT_NAME, size: 10 };
  homeCell.alignment = LEFT_WRAP;
  homeCell.border = BORDER_THIN;

  sheet.getRow(11).height = 30;
  sheet.getRow(12).height = 8;

  // Hàng 2
  sheet.getCell("A13").value = "5. Số CMND/CCCD";
  sheet.getCell("A13").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A13").alignment = LEFT;

  sheet.mergeCells("B13:C13");
  const idCell = sheet.getCell("B13");
  idCell.value = safeString(pi?.idCardNumber);
  idCell.font = { name: FONT_NAME, size: 10 };
  idCell.alignment = LEFT;
  idCell.border = BORDER_THIN;

  sheet.getCell("D13").value = "6. Ngày cấp";
  sheet.getCell("D13").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("D13").alignment = LEFT;

  sheet.mergeCells("E13:F13");
  const idDateCell = sheet.getCell("E13");
  idDateCell.value = formatDate(pi?.idCardIssueDate);
  idDateCell.font = { name: FONT_NAME, size: 10 };
  idDateCell.alignment = LEFT;
  idDateCell.border = BORDER_THIN;

  sheet.getCell("G13").value = "7. Nơi cấp";
  sheet.getCell("G13").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("G13").alignment = LEFT;

  sheet.mergeCells("H13:I13");
  const idPlaceCell = sheet.getCell("H13");
  idPlaceCell.value = safeString(pi?.idCardIssuePlace);
  idPlaceCell.font = { name: FONT_NAME, size: 10 };
  idPlaceCell.alignment = LEFT_WRAP;
  idPlaceCell.border = BORDER_THIN;

  sheet.getCell("J13").value = "8. Quốc tịch";
  sheet.getCell("J13").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("J13").alignment = LEFT;

  const natCell = sheet.getCell("K13");
  natCell.value = safeString(pi?.nationality);
  natCell.font = { name: FONT_NAME, size: 10 };
  natCell.alignment = LEFT;
  natCell.border = BORDER_THIN;

  sheet.getCell("J14").value = "9. Dân tộc";
  sheet.getCell("J14").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("J14").alignment = LEFT;

  const ethCell = sheet.getCell("K14");
  ethCell.value = safeString(pi?.ethnicity);
  ethCell.font = { name: FONT_NAME, size: 10 };
  ethCell.alignment = LEFT;
  ethCell.border = BORDER_THIN;

  sheet.getRow(13).height = 26;
  sheet.getRow(14).height = 26;
  sheet.getRow(15).height = 8;

  // Hàng 3
  sheet.getCell("A16").value = "10. Giới tính (Nam/Nữ)";
  sheet.getCell("A16").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A16").alignment = LEFT;

  sheet.mergeCells("B16:C16");
  const genCell = sheet.getCell("B16");
  genCell.value = getGenderLabel(pi?.gender);
  genCell.font = { name: FONT_NAME, size: 10 };
  genCell.alignment = LEFT;
  genCell.border = BORDER_THIN;

  sheet.getCell("D16").value = "11. Tình trạng hôn nhân";
  sheet.getCell("D16").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("D16").alignment = LEFT;

  sheet.mergeCells("E16:F16");
  const marCell = sheet.getCell("E16");
  marCell.value = getMaritalLabel(pi?.maritalStatus);
  marCell.font = { name: FONT_NAME, size: 10 };
  marCell.alignment = LEFT;
  marCell.border = BORDER_THIN;

  sheet.getCell("G16").value = "12. Số sổ BHXH";
  sheet.getCell("G16").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("G16").alignment = LEFT;

  sheet.mergeCells("H16:I16");
  const bhxhCell = sheet.getCell("H16");
  bhxhCell.value = safeString(sb?.socialInsuranceNumber);
  bhxhCell.font = { name: FONT_NAME, size: 10 };
  bhxhCell.alignment = LEFT;
  bhxhCell.border = BORDER_THIN;

  sheet.getCell("J16").value = "13. Mã số thuế";
  sheet.getCell("J16").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("J16").alignment = LEFT;

  const taxCell = sheet.getCell("K16");
  taxCell.value = safeString(sb?.taxCode);
  taxCell.font = { name: FONT_NAME, size: 10 };
  taxCell.alignment = LEFT;
  taxCell.border = BORDER_THIN;

  sheet.getRow(16).height = 30;
  sheet.getRow(17).height = 8;
  sheet.getRow(18).height = 8;

  // Địa chỉ thường trú
  sheet.mergeCells("A19:K19");
  const addr1Label = sheet.getCell("A19");
  addr1Label.value = "14. Địa chỉ thường trú (Sau sát nhập)";
  addr1Label.font = { name: FONT_NAME, size: 10 };
  addr1Label.alignment = LEFT;
  sheet.getRow(19).height = 22;

  sheet.mergeCells("A20:K21");
  const addr1Cell = sheet.getCell("A20");
  addr1Cell.value = safeString(pi?.permanentAddress);
  addr1Cell.font = { name: FONT_NAME, size: 10 };
  addr1Cell.alignment = LEFT_TOP;
  addr1Cell.border = BORDER_THIN;
  sheet.getRow(20).height = 22;
  sheet.getRow(21).height = 22;

  // Địa chỉ hiện tại
  sheet.mergeCells("A22:K22");
  const addr2Label = sheet.getCell("A22");
  addr2Label.value = "15. Địa chỉ hiện tại (nếu khác địa chỉ trên)";
  addr2Label.font = { name: FONT_NAME, size: 10 };
  addr2Label.alignment = LEFT;
  sheet.getRow(22).height = 22;

  sheet.mergeCells("A23:K24");
  const addr2Cell = sheet.getCell("A23");
  addr2Cell.value = safeString(pi?.currentAddress);
  addr2Cell.font = { name: FONT_NAME, size: 10 };
  addr2Cell.alignment = LEFT_TOP;
  addr2Cell.border = BORDER_THIN;
  sheet.getRow(23).height = 22;
  sheet.getRow(24).height = 22;

  // 16. Gia đình
  sheet.mergeCells("A25:K25");
  const famTitle = sheet.getCell("A25");
  famTitle.value = "16. Thành phần gia đình (cha/mẹ/chồng/vợ/con/anh chị em ruột)";
  famTitle.font = { name: FONT_NAME, size: 10 };
  famTitle.alignment = LEFT;
  sheet.getRow(25).height = 22;

  sheet.mergeCells("A26:B26");
  const famH1 = sheet.getCell("A26");
  famH1.value = "Họ và tên";
  famH1.font = { name: FONT_NAME, size: 10, bold: true };
  famH1.alignment = CENTER;
  famH1.border = BORDER_THIN;

  sheet.mergeCells("C26:D26");
  const famH2 = sheet.getCell("C26");
  famH2.value = "Mối quan hệ";
  famH2.font = { name: FONT_NAME, size: 10, bold: true };
  famH2.alignment = CENTER;
  famH2.border = BORDER_THIN;

  sheet.mergeCells("E26:F26");
  const famH3 = sheet.getCell("E26");
  famH3.value = "Năm sinh";
  famH3.font = { name: FONT_NAME, size: 10, bold: true };
  famH3.alignment = CENTER;
  famH3.border = BORDER_THIN;

  sheet.mergeCells("G26:K26");
  const famH4 = sheet.getCell("G26");
  famH4.value = "Nghề nghiệp";
  famH4.font = { name: FONT_NAME, size: 10, bold: true };
  famH4.alignment = CENTER;
  famH4.border = BORDER_THIN;
  sheet.getRow(26).height = 24;

  const familyMembers = pi?.familyMembers || [];
  for (let i = 0; i < 5; i += 1) {
    const r = 27 + i;
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
  sheet.getRow(32).height = 8;

  // Khẩn cấp
  sheet.mergeCells("A33:K33");
  const emTitle = sheet.getCell("A33");
  emTitle.value = "*** Trường hợp khẩn cấp liên hệ (Thông tin bổ sung hoặc anh/chị/em ruột)";
  emTitle.font = { name: FONT_NAME, size: 10, bold: true, italic: true };
  emTitle.alignment = LEFT;
  sheet.getRow(33).height = 22;

  sheet.getCell("A34").value = "Tên";
  sheet.getCell("A34").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A34").alignment = LEFT;

  sheet.mergeCells("B34:C34");
  const emName = sheet.getCell("B34");
  emName.value = safeString(pi?.emergencyContact?.name);
  emName.font = { name: FONT_NAME, size: 10 };
  emName.alignment = LEFT_WRAP;
  emName.border = BORDER_THIN;

  sheet.getCell("D34").value = "Mối quan hệ";
  sheet.getCell("D34").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("D34").alignment = LEFT;

  sheet.mergeCells("E34:F34");
  const emRel = sheet.getCell("E34");
  emRel.value = safeString(pi?.emergencyContact?.relationship);
  emRel.font = { name: FONT_NAME, size: 10 };
  emRel.alignment = LEFT;
  emRel.border = BORDER_THIN;

  sheet.getCell("G34").value = "Địa chỉ";
  sheet.getCell("G34").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("G34").alignment = LEFT;

  sheet.mergeCells("H34:K34");
  const emAddr = sheet.getCell("H34");
  emAddr.value = safeString(pi?.emergencyContact?.address);
  emAddr.font = { name: FONT_NAME, size: 10 };
  emAddr.alignment = LEFT_WRAP;
  emAddr.border = BORDER_THIN;

  sheet.getCell("G35").value = "Số điện thoại";
  sheet.getCell("G35").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("G35").alignment = LEFT;

  sheet.mergeCells("H35:K35");
  const emPhone = sheet.getCell("H35");
  emPhone.value = safeString(pi?.emergencyContact?.phone);
  emPhone.font = { name: FONT_NAME, size: 10 };
  emPhone.alignment = LEFT;
  emPhone.border = BORDER_THIN;

  sheet.getRow(34).height = 24;
  sheet.getRow(35).height = 24;
  sheet.getRow(36).height = 8;

  // II. Học tập
  writeSectionTitle(sheet, 37, "II. QUÁ TRÌNH HỌC TẬP & ĐÀO TẠO");
  sheet.getRow(38).height = 6;

  sheet.mergeCells("A39:B40");
  const edH1 = sheet.getCell("A39");
  edH1.value = "Thời gian\n(từ ... đến ...)";
  edH1.font = { name: FONT_NAME, size: 10, bold: true };
  edH1.alignment = CENTER;
  edH1.border = BORDER_THIN;

  sheet.mergeCells("C39:F40");
  const edH2 = sheet.getCell("C39");
  edH2.value = "Chuyên ngành / chứng chỉ";
  edH2.font = { name: FONT_NAME, size: 10, bold: true };
  edH2.alignment = CENTER;
  edH2.border = BORDER_THIN;

  sheet.mergeCells("G39:I40");
  const edH3 = sheet.getCell("G39");
  edH3.value = "Tên trường";
  edH3.font = { name: FONT_NAME, size: 10, bold: true };
  edH3.alignment = CENTER;
  edH3.border = BORDER_THIN;

  sheet.mergeCells("J39:K40");
  const edH4 = sheet.getCell("J39");
  edH4.value = "Bằng cấp/Chứng chỉ";
  edH4.font = { name: FONT_NAME, size: 10, bold: true };
  edH4.alignment = CENTER;
  edH4.border = BORDER_THIN;

  sheet.getRow(39).height = 22;
  sheet.getRow(40).height = 22;

  const education = employee.education || [];
  for (let i = 0; i < 3; i += 1) {
    const r = 41 + i;
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
  sheet.getRow(44).height = 8;
  sheet.getRow(45).height = 8;

  // III. Kinh nghiệm
  writeSectionTitle(sheet, 46, "III. KINH NGHIỆM LÀM VIỆC (Ghi công việc gần nhất)");
  sheet.getRow(47).height = 6;

  sheet.mergeCells("A48:B49");
  const exH1 = sheet.getCell("A48");
  exH1.value = "Thời gian\n(từ ... đến ...)";
  exH1.font = { name: FONT_NAME, size: 10, bold: true };
  exH1.alignment = CENTER;
  exH1.border = BORDER_THIN;

  sheet.mergeCells("C48:H49");
  const exH2 = sheet.getCell("C48");
  exH2.value = "Công ty / Chức danh\nNhiệm vụ chính";
  exH2.font = { name: FONT_NAME, size: 10, bold: true };
  exH2.alignment = CENTER;
  exH2.border = BORDER_THIN;

  sheet.mergeCells("I48:K49");
  const exH3 = sheet.getCell("I48");
  exH3.value = "Loại hình làm việc";
  exH3.font = { name: FONT_NAME, size: 10, bold: true };
  exH3.alignment = CENTER;
  exH3.border = BORDER_THIN;

  sheet.getRow(48).height = 22;
  sheet.getRow(49).height = 22;

  const experiences = employee.workExperience || [];
  for (let i = 0; i < 3; i += 1) {
    const r = 50 + i;
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
  sheet.getRow(53).height = 8;
  sheet.getRow(54).height = 8;
  sheet.getRow(55).height = 8;

  // Ngân hàng
  sheet.getCell("A56").value = "Tên ngân hàng:";
  sheet.getCell("A56").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A56").alignment = LEFT;

  sheet.mergeCells("B56:F56");
  const bankName = sheet.getCell("B56");
  bankName.value = safeString(sb?.bankName);
  bankName.font = { name: FONT_NAME, size: 10 };
  bankName.alignment = LEFT_WRAP;
  bankName.border = BORDER_THIN;

  sheet.getCell("G56").value = "Số tài khoản:";
  sheet.getCell("G56").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("G56").alignment = LEFT;

  sheet.mergeCells("H56:K56");
  const bankAcc = sheet.getCell("H56");
  bankAcc.value = safeString(sb?.bankAccountNumber);
  bankAcc.font = { name: FONT_NAME, size: 10 };
  bankAcc.alignment = LEFT;
  bankAcc.border = BORDER_THIN;

  sheet.getCell("G57").value = "Chi nhánh:";
  sheet.getCell("G57").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("G57").alignment = LEFT;

  sheet.mergeCells("H57:K57");
  const bankBranch = sheet.getCell("H57");
  bankBranch.value = safeString(sb?.bankBranch);
  bankBranch.font = { name: FONT_NAME, size: 10 };
  bankBranch.alignment = LEFT_WRAP;
  bankBranch.border = BORDER_THIN;

  sheet.getRow(56).height = 22;
  sheet.getRow(57).height = 22;
  sheet.getRow(58).height = 8;

  // IV. Cam kết
  writeSectionTitle(sheet, 59, "IV. CAM KẾT");

  sheet.mergeCells("A60:K60");
  const cam1 = sheet.getCell("A60");
  cam1.value = "Tôi xin cam đoan những thông tin cung cấp trên đây là hoàn toàn chính xác và đầy đủ.";
  cam1.font = { name: FONT_NAME, size: 10 };
  cam1.alignment = LEFT;
  sheet.getRow(60).height = 20;

  sheet.mergeCells("A61:K61");
  const cam2 = sheet.getCell("A61");
  cam2.value = "Tôi xin chịu trách nhiệm và chấp nhận việc điều tra các thông tin đã cung cấp.";
  cam2.font = { name: FONT_NAME, size: 10 };
  cam2.alignment = LEFT;
  sheet.getRow(61).height = 20;
  sheet.getRow(62).height = 10;

  // Ngày + chữ ký
  const today = new Date();
  const dateLine = `Ngày ${String(today.getDate()).padStart(2, "0")} / ${String(
    today.getMonth() + 1
  ).padStart(2, "0")} / ${today.getFullYear()}`;

  sheet.mergeCells("G63:K63");
  const dateCell = sheet.getCell("G63");
  dateCell.value = dateLine;
  dateCell.font = { name: FONT_NAME, size: 10, italic: true };
  dateCell.alignment = CENTER;

  sheet.mergeCells("G64:K64");
  const sigLabel = sheet.getCell("G64");
  sigLabel.value = "Ký và ghi rõ họ tên";
  sigLabel.font = { name: FONT_NAME, size: 10, bold: true };
  sigLabel.alignment = CENTER;

  sheet.mergeCells("G65:K68");
  for (let r = 65; r <= 68; r += 1) {
    sheet.getRow(r).height = 20;
  }

  await tryInsertLogo(workbook, sheet, "A1");
  sheet.pageSetup.printTitlesRow = "1:4";

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

  // ⚠️ Đổi bố cục cột: A-B (label) | C-D (value) | E-F (label) | G-H (value) | I-J (label) | K (value)
  // Cột A rộng 18, B rộng 12 → label 1 = 30 ký tự
  // Cột C rộng 14, D rộng 10 → value 1 = 24 ký tự
  // Cột E rộng 14, F rộng 10 → label 2 = 24 ký tự
  // Cột G rộng 12, H rộng 10 → value 2 = 22 ký tự
  // Cột I rộng 10, J rộng 10 → label 3 = 20 ký tự
  // Cột K rộng 14 → value 3
  sheet.columns = [
    { width: 18 }, { width: 12 }, { width: 14 }, { width: 10 },
    { width: 14 }, { width: 10 }, { width: 12 }, { width: 10 },
    { width: 10 }, { width: 10 }, { width: 14 },
  ];

  // Tiêu đề "HỢP ĐỒNG LAO ĐỘNG"
  writeCommonHeader(sheet, "HỢP ĐỒNG LAO ĐỘNG");

  // Khối header: Ngày nhận việc / Chức danh / ĐT / Email
  // — vẫn dùng layout cũ vì đã đủ rộng
  sheet.getCell("A5").value = "Ngày nhận việc";
  sheet.getCell("A5").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A5").alignment = LEFT;

  sheet.mergeCells("B5:D6");
  const startDateCell = sheet.getCell("B5");
  startDateCell.value = formatDate(wi?.startDate);
  startDateCell.font = { name: FONT_NAME, size: 10 };
  startDateCell.alignment = LEFT;
  startDateCell.border = BORDER_THIN;

  sheet.getRow(5).height = 24;
  sheet.getRow(6).height = 24;

  sheet.getCell("A7").value = "Chức danh công việc";
  sheet.getCell("A7").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A7").alignment = LEFT;

  sheet.mergeCells("B7:C8");
  const positionCell = sheet.getCell("B7");
  positionCell.value = safeString(wi?.position);
  positionCell.font = { name: FONT_NAME, size: 10 };
  positionCell.alignment = LEFT_WRAP;
  positionCell.border = BORDER_THIN;

  sheet.getCell("D7").value = "Điện thoại di động";
  sheet.getCell("D7").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("D7").alignment = LEFT;

  // Đổi merge: ĐT từ E:F → E:G để rộng hơn
  sheet.mergeCells("E7:G8");
  const phoneCell = sheet.getCell("E7");
  phoneCell.value = safeString(employee.phone);
  phoneCell.font = { name: FONT_NAME, size: 10 };
  phoneCell.alignment = LEFT;
  phoneCell.border = BORDER_THIN;

  sheet.getCell("H7").value = "Email";
  sheet.getCell("H7").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("H7").alignment = LEFT;

  sheet.mergeCells("I7:K8");
  const emailCell = sheet.getCell("I7");
  emailCell.value = safeString(employee.email);
  emailCell.font = { name: FONT_NAME, size: 10 };
  emailCell.alignment = LEFT_WRAP;
  emailCell.border = BORDER_THIN;

  sheet.getRow(7).height = 26;
  sheet.getRow(8).height = 26;
  sheet.getRow(9).height = 8;

  /* ============================================================
   *  I. THÔNG TIN NHÂN VIÊN
   * ============================================================ */
  writeSectionTitle(sheet, 10, "I. THÔNG TIN NHÂN VIÊN");

  // Hàng 1: Họ và tên (A label, B-C value) | Mã NV (D-E label, F-G value) | Ngày sinh (H label, I-J value) | Giới tính (K label...)
  // ⚠️ Rút gọn: dùng 3 mục/hàng thay vì 4 mục/hàng

  // Hàng 1
  sheet.getCell("A11").value = "1. Họ và tên";
  sheet.getCell("A11").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A11").alignment = LEFT;

  sheet.mergeCells("B11:D11");
  const nameCell = sheet.getCell("B11");
  nameCell.value = safeString(employee.name);
  nameCell.font = { name: FONT_NAME, size: 10 };
  nameCell.alignment = LEFT_WRAP;
  nameCell.border = BORDER_THIN;

  sheet.getCell("E11").value = "2. Mã NV";
  sheet.getCell("E11").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("E11").alignment = LEFT;

  sheet.mergeCells("F11:G11");
  const codeCell = sheet.getCell("F11");
  codeCell.value = safeString(wi?.employeeCode);
  codeCell.font = { name: FONT_NAME, size: 10 };
  codeCell.alignment = LEFT;
  codeCell.border = BORDER_THIN;

  sheet.getCell("H11").value = "3. Ngày sinh";
  sheet.getCell("H11").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("H11").alignment = LEFT;

  sheet.mergeCells("I11:K11");
  const dobCell = sheet.getCell("I11");
  dobCell.value = formatDate(pi?.dateOfBirth);
  dobCell.font = { name: FONT_NAME, size: 10 };
  dobCell.alignment = LEFT;
  dobCell.border = BORDER_THIN;

  sheet.getRow(11).height = 28;
  sheet.getRow(12).height = 6;

  // Hàng 2: Giới tính | CCCD | Ngày cấp
  sheet.getCell("A13").value = "4. Giới tính";
  sheet.getCell("A13").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A13").alignment = LEFT;

  sheet.mergeCells("B13:D13");
  const genderCell = sheet.getCell("B13");
  genderCell.value = getGenderLabel(pi?.gender);
  genderCell.font = { name: FONT_NAME, size: 10 };
  genderCell.alignment = LEFT;
  genderCell.border = BORDER_THIN;

  sheet.getCell("E13").value = "5. Số CMND/CCCD";
  sheet.getCell("E13").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("E13").alignment = LEFT;

  sheet.mergeCells("F13:G13");
  const idCell = sheet.getCell("F13");
  idCell.value = safeString(pi?.idCardNumber);
  idCell.font = { name: FONT_NAME, size: 10 };
  idCell.alignment = LEFT;
  idCell.border = BORDER_THIN;

  sheet.getCell("H13").value = "6. Ngày cấp";
  sheet.getCell("H13").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("H13").alignment = LEFT;

  sheet.mergeCells("I13:K13");
  const idDateCell = sheet.getCell("I13");
  idDateCell.value = formatDate(pi?.idCardIssueDate);
  idDateCell.font = { name: FONT_NAME, size: 10 };
  idDateCell.alignment = LEFT;
  idDateCell.border = BORDER_THIN;

  sheet.getRow(13).height = 28;
  sheet.getRow(14).height = 6;

  // Hàng 3: Nơi cấp | Phòng ban | Chức vụ
  sheet.getCell("A15").value = "7. Nơi cấp";
  sheet.getCell("A15").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A15").alignment = LEFT;

  sheet.mergeCells("B15:D15");
  const idPlaceCell = sheet.getCell("B15");
  idPlaceCell.value = safeString(pi?.idCardIssuePlace);
  idPlaceCell.font = { name: FONT_NAME, size: 10 };
  idPlaceCell.alignment = LEFT_WRAP;
  idPlaceCell.border = BORDER_THIN;

  sheet.getCell("E15").value = "8. Phòng ban";
  sheet.getCell("E15").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("E15").alignment = LEFT;

  sheet.mergeCells("F15:G15");
  const deptCell = sheet.getCell("F15");
  deptCell.value = safeString(wi?.department);
  deptCell.font = { name: FONT_NAME, size: 10 };
  deptCell.alignment = LEFT_WRAP;
  deptCell.border = BORDER_THIN;

  sheet.getCell("H15").value = "9. Chức vụ";
  sheet.getCell("H15").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("H15").alignment = LEFT;

  sheet.mergeCells("I15:K15");
  const posCell = sheet.getCell("I15");
  posCell.value = safeString(wi?.position);
  posCell.font = { name: FONT_NAME, size: 10 };
  posCell.alignment = LEFT_WRAP;
  posCell.border = BORDER_THIN;

  sheet.getRow(15).height = 28;
  sheet.getRow(16).height = 6;

  // Hàng 4: Địa chỉ thường trú (full)
  sheet.mergeCells("A17:K17");
  const addrLabel = sheet.getCell("A17");
  addrLabel.value = "10. Địa chỉ thường trú";
  addrLabel.font = { name: FONT_NAME, size: 10 };
  addrLabel.alignment = LEFT;
  sheet.getRow(17).height = 18;

  sheet.mergeCells("A18:K19");
  const addrCell = sheet.getCell("A18");
  addrCell.value = safeString(pi?.permanentAddress);
  addrCell.font = { name: FONT_NAME, size: 10 };
  addrCell.alignment = LEFT_TOP;
  addrCell.border = BORDER_THIN;
  sheet.getRow(18).height = 20;
  sheet.getRow(19).height = 20;

  /* ============================================================
   *  II. THÔNG TIN HỢP ĐỒNG
   * ============================================================ */
  writeSectionTitle(sheet, 21, "II. THÔNG TIN HỢP ĐỒNG");

  // Hàng 1: Số HĐ | Loại HĐ
  sheet.getCell("A22").value = "11. Số hợp đồng";
  sheet.getCell("A22").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A22").alignment = LEFT;

  sheet.mergeCells("B22:D22");
  const numCell = sheet.getCell("B22");
  numCell.value = safeString(ci?.contractNumber);
  numCell.font = { name: FONT_NAME, size: 10 };
  numCell.alignment = LEFT;
  numCell.border = BORDER_THIN;

  sheet.getCell("E22").value = "12. Loại hợp đồng";
  sheet.getCell("E22").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("E22").alignment = LEFT;

  sheet.mergeCells("F22:K22");
  const typeCell = sheet.getCell("F22");
  typeCell.value = safeString(ci?.contractType);
  typeCell.font = { name: FONT_NAME, size: 10 };
  typeCell.alignment = LEFT_WRAP;
  typeCell.border = BORDER_THIN;

  sheet.getRow(22).height = 28;
  sheet.getRow(23).height = 6;

  // Hàng 2: Ngày bắt đầu | Ngày kết thúc | Ngày nhận việc
  sheet.getCell("A24").value = "13. Ngày bắt đầu";
  sheet.getCell("A24").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A24").alignment = LEFT;

  sheet.mergeCells("B24:D24");
  const startCell = sheet.getCell("B24");
  startCell.value = formatDate(ci?.contractStartDate);
  startCell.font = { name: FONT_NAME, size: 10 };
  startCell.alignment = LEFT;
  startCell.border = BORDER_THIN;

  sheet.getCell("E24").value = "14. Ngày kết thúc";
  sheet.getCell("E24").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("E24").alignment = LEFT;

  sheet.mergeCells("F24:G24");
  const endCell = sheet.getCell("F24");
  endCell.value = formatDate(ci?.contractEndDate);
  endCell.font = { name: FONT_NAME, size: 10 };
  endCell.alignment = LEFT;
  endCell.border = BORDER_THIN;

  sheet.getCell("H24").value = "15. Ngày nhận việc";
  sheet.getCell("H24").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("H24").alignment = LEFT;

  sheet.mergeCells("I24:K24");
  const hireCell = sheet.getCell("I24");
  hireCell.value = formatDate(wi?.startDate);
  hireCell.font = { name: FONT_NAME, size: 10 };
  hireCell.alignment = LEFT;
  hireCell.border = BORDER_THIN;

  sheet.getRow(24).height = 28;
  sheet.getRow(25).height = 6;

  // Hàng 3: Thử việc từ | Thử việc đến
  sheet.getCell("A26").value = "16. Bắt đầu thử việc";
  sheet.getCell("A26").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A26").alignment = LEFT;

  sheet.mergeCells("B26:D26");
  const probStartCell = sheet.getCell("B26");
  probStartCell.value = formatDate(ci?.probationStartDate);
  probStartCell.font = { name: FONT_NAME, size: 10 };
  probStartCell.alignment = LEFT;
  probStartCell.border = BORDER_THIN;

  sheet.getCell("E26").value = "17. Kết thúc thử việc";
  sheet.getCell("E26").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("E26").alignment = LEFT;

  sheet.mergeCells("F26:K26");
  const probEndCell = sheet.getCell("F26");
  probEndCell.value = formatDate(ci?.probationEndDate);
  probEndCell.font = { name: FONT_NAME, size: 10 };
  probEndCell.alignment = LEFT;
  probEndCell.border = BORDER_THIN;

  sheet.getRow(26).height = 28;
  sheet.getRow(27).height = 6;

  /* ============================================================
   *  III. LƯƠNG & BẢO HIỂM
   * ============================================================ */
  writeSectionTitle(sheet, 28, "III. LƯƠNG & BẢO HIỂM");

  // Hàng 1: Lương CB | Lương BH | Tiền ăn
  sheet.getCell("A29").value = "18. Lương cơ bản";
  sheet.getCell("A29").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A29").alignment = LEFT;

  sheet.mergeCells("B29:D29");
  const baseSal = sheet.getCell("B29");
  baseSal.value = formatMoney(sb?.baseSalary) + " VNĐ";
  baseSal.font = { name: FONT_NAME, size: 10 };
  baseSal.alignment = RIGHT;
  baseSal.border = BORDER_THIN;

  sheet.getCell("E29").value = "19. Lương đóng BH";
  sheet.getCell("E29").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("E29").alignment = LEFT;

  sheet.mergeCells("F29:G29");
  const insSal = sheet.getCell("F29");
  insSal.value = formatMoney(sb?.insuranceSalary) + " VNĐ";
  insSal.font = { name: FONT_NAME, size: 10 };
  insSal.alignment = RIGHT;
  insSal.border = BORDER_THIN;

  sheet.getCell("H29").value = "20. Tiền ăn";
  sheet.getCell("H29").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("H29").alignment = LEFT;

  sheet.mergeCells("I29:K29");
  const meal = sheet.getCell("I29");
  meal.value = formatMoney(sb?.mealRate) + " VNĐ";
  meal.font = { name: FONT_NAME, size: 10 };
  meal.alignment = RIGHT;
  meal.border = BORDER_THIN;

  sheet.getRow(29).height = 28;
  sheet.getRow(30).height = 6;

  // Hàng 2: BHXH | MST
  sheet.getCell("A31").value = "21. Số sổ BHXH";
  sheet.getCell("A31").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A31").alignment = LEFT;

  sheet.mergeCells("B31:D31");
  const bhxh = sheet.getCell("B31");
  bhxh.value = safeString(sb?.socialInsuranceNumber);
  bhxh.font = { name: FONT_NAME, size: 10 };
  bhxh.alignment = LEFT;
  bhxh.border = BORDER_THIN;

  sheet.getCell("E31").value = "22. Mã số thuế";
  sheet.getCell("E31").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("E31").alignment = LEFT;

  sheet.mergeCells("F31:K31");
  const tax = sheet.getCell("F31");
  tax.value = safeString(sb?.taxCode);
  tax.font = { name: FONT_NAME, size: 10 };
  tax.alignment = LEFT;
  tax.border = BORDER_THIN;

  sheet.getRow(31).height = 28;
  sheet.getRow(32).height = 6;

  /* ============================================================
   *  IV. GHI CHÚ
   * ============================================================ */
  writeSectionTitle(sheet, 33, "IV. GHI CHÚ");

  sheet.mergeCells("A34:K35");
  const notesCell = sheet.getCell("A34");
  notesCell.value = safeString(ci?.notes);
  notesCell.font = { name: FONT_NAME, size: 10 };
  notesCell.alignment = LEFT_TOP;
  notesCell.border = BORDER_THIN;
  sheet.getRow(34).height = 20;
  sheet.getRow(35).height = 20;

  sheet.getRow(36).height = 8;

  /* ============================================================
   *  V. XÁC NHẬN
   * ============================================================ */
  writeSectionTitle(sheet, 37, "V. XÁC NHẬN CỦA HAI BÊN");

  sheet.mergeCells("A38:K38");
  const dateCell = sheet.getCell("A38");
  const today = new Date();
  dateCell.value = `Ngày ${String(today.getDate()).padStart(2, "0")} tháng ${String(
    today.getMonth() + 1
  ).padStart(2, "0")} năm ${today.getFullYear()}`;
  dateCell.font = { name: FONT_NAME, size: 10, italic: true };
  dateCell.alignment = RIGHT;
  sheet.getRow(38).height = 20;

  sheet.mergeCells("A39:E39");
  const leftLabel = sheet.getCell("A39");
  leftLabel.value = "NGƯỜI LAO ĐỘNG";
  leftLabel.font = { name: FONT_NAME, size: 11, bold: true };
  leftLabel.alignment = CENTER;

  sheet.mergeCells("G39:K39");
  const rightLabel = sheet.getCell("G39");
  rightLabel.value = "ĐẠI DIỆN CÔNG TY";
  rightLabel.font = { name: FONT_NAME, size: 11, bold: true };
  rightLabel.alignment = CENTER;

  sheet.mergeCells("A40:E40");
  const leftHint = sheet.getCell("A40");
  leftHint.value = "(Ký, ghi rõ họ tên)";
  leftHint.font = { name: FONT_NAME, size: 10, italic: true };
  leftHint.alignment = CENTER;

  sheet.mergeCells("G40:K40");
  const rightHint = sheet.getCell("G40");
  rightHint.value = "(Ký, ghi rõ họ tên)";
  rightHint.font = { name: FONT_NAME, size: 10, italic: true };
  rightHint.alignment = CENTER;

  sheet.mergeCells("A41:E44");
  sheet.mergeCells("G41:K44");
  for (let r = 41; r <= 44; r += 1) {
    sheet.getRow(r).height = 20;
  }

  sheet.mergeCells("A45:E45");
  const leftName = sheet.getCell("A45");
  leftName.value = safeString(employee.name);
  leftName.font = { name: FONT_NAME, size: 10, bold: true };
  leftName.alignment = CENTER;

  sheet.mergeCells("G45:K45");
  const rightName = sheet.getCell("G45");
  rightName.value = "";
  rightName.font = { name: FONT_NAME, size: 10, bold: true };
  rightName.alignment = CENTER;

  sheet.getRow(45).height = 20;

  sheet.pageSetup.printTitlesRow = "1:4";

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

  // Cột mới: label rộng hơn
  sheet.columns = [
    { width: 18 }, { width: 12 }, { width: 14 }, { width: 10 },
    { width: 14 }, { width: 10 }, { width: 12 }, { width: 10 },
    { width: 10 }, { width: 10 }, { width: 14 },
  ];

  writeCommonHeader(sheet, "LƯƠNG & BẢO HIỂM");
  writeCommonHeaderBlock(sheet, employee);

  /* I. THÔNG TIN NHÂN VIÊN */
  writeSectionTitle(sheet, 10, "I. THÔNG TIN NHÂN VIÊN");

  // Hàng 1
  sheet.getCell("A11").value = "1. Họ và tên";
  sheet.getCell("A11").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A11").alignment = LEFT;

  sheet.mergeCells("B11:D11");
  const nameCell = sheet.getCell("B11");
  nameCell.value = safeString(employee.name);
  nameCell.font = { name: FONT_NAME, size: 10 };
  nameCell.alignment = LEFT_WRAP;
  nameCell.border = BORDER_THIN;

  sheet.getCell("E11").value = "2. Mã NV";
  sheet.getCell("E11").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("E11").alignment = LEFT;

  sheet.mergeCells("F11:G11");
  const codeCell = sheet.getCell("F11");
  codeCell.value = safeString(wi?.employeeCode);
  codeCell.font = { name: FONT_NAME, size: 10 };
  codeCell.alignment = LEFT;
  codeCell.border = BORDER_THIN;

  sheet.getCell("H11").value = "3. Phòng ban";
  sheet.getCell("H11").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("H11").alignment = LEFT;

  sheet.mergeCells("I11:K11");
  const deptCell = sheet.getCell("I11");
  deptCell.value = safeString(wi?.department);
  deptCell.font = { name: FONT_NAME, size: 10 };
  deptCell.alignment = LEFT_WRAP;
  deptCell.border = BORDER_THIN;

  sheet.getRow(11).height = 28;
  sheet.getRow(12).height = 6;

  // Hàng 2: Chức vụ | Ngày nhận việc | Trạng thái
  sheet.getCell("A13").value = "4. Chức vụ";
  sheet.getCell("A13").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A13").alignment = LEFT;

  sheet.mergeCells("B13:D13");
  const posCell = sheet.getCell("B13");
  posCell.value = safeString(wi?.position);
  posCell.font = { name: FONT_NAME, size: 10 };
  posCell.alignment = LEFT_WRAP;
  posCell.border = BORDER_THIN;

  sheet.getCell("E13").value = "5. Ngày nhận việc";
  sheet.getCell("E13").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("E13").alignment = LEFT;

  sheet.mergeCells("F13:G13");
  const hireCell = sheet.getCell("F13");
  hireCell.value = formatDate(wi?.startDate);
  hireCell.font = { name: FONT_NAME, size: 10 };
  hireCell.alignment = LEFT;
  hireCell.border = BORDER_THIN;

  sheet.getCell("H13").value = "6. Trạng thái";
  sheet.getCell("H13").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("H13").alignment = LEFT;

  sheet.mergeCells("I13:K13");
  const statusCell = sheet.getCell("I13");
  statusCell.value = getStatusLabel(employee.status);
  statusCell.font = { name: FONT_NAME, size: 10 };
  statusCell.alignment = LEFT;
  statusCell.border = BORDER_THIN;

  sheet.getRow(13).height = 28;
  sheet.getRow(14).height = 6;
  sheet.getRow(15).height = 6;

  /* II. LƯƠNG */
  writeSectionTitle(sheet, 16, "II. LƯƠNG");

  // Hàng 1: Lương CB | Lương BH | Tiền ăn
  sheet.getCell("A17").value = "7. Lương cơ bản";
  sheet.getCell("A17").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A17").alignment = LEFT;

  sheet.mergeCells("B17:D17");
  const baseCell = sheet.getCell("B17");
  baseCell.value = formatMoney(sb?.baseSalary) + " VNĐ";
  baseCell.font = { name: FONT_NAME, size: 10 };
  baseCell.alignment = RIGHT;
  baseCell.border = BORDER_THIN;

  sheet.getCell("E17").value = "8. Lương đóng BH";
  sheet.getCell("E17").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("E17").alignment = LEFT;

  sheet.mergeCells("F17:G17");
  const insCell = sheet.getCell("F17");
  insCell.value = formatMoney(sb?.insuranceSalary) + " VNĐ";
  insCell.font = { name: FONT_NAME, size: 10 };
  insCell.alignment = RIGHT;
  insCell.border = BORDER_THIN;

  sheet.getCell("H17").value = "9. Tiền ăn";
  sheet.getCell("H17").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("H17").alignment = LEFT;

  sheet.mergeCells("I17:K17");
  const mealCell = sheet.getCell("I17");
  mealCell.value = formatMoney(sb?.mealRate) + " VNĐ";
  mealCell.font = { name: FONT_NAME, size: 10 };
  mealCell.alignment = RIGHT;
  mealCell.border = BORDER_THIN;

  sheet.getRow(17).height = 28;
  sheet.getRow(18).height = 6;

  // Hàng 2: Người phụ thuộc | Kỳ trả lương
  sheet.getCell("A19").value = "10. Người phụ thuộc";
  sheet.getCell("A19").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A19").alignment = LEFT;

  sheet.mergeCells("B19:D19");
  const depCell = sheet.getCell("B19");
  depCell.value = safeString(sb?.dependents);
  depCell.font = { name: FONT_NAME, size: 10 };
  depCell.alignment = LEFT;
  depCell.border = BORDER_THIN;

  sheet.getCell("E19").value = "11. Kỳ trả lương";
  sheet.getCell("E19").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("E19").alignment = LEFT;

  sheet.mergeCells("F19:K19");
  const periodCell = sheet.getCell("F19");
  periodCell.value = safeString(sb?.paymentPeriod);
  periodCell.font = { name: FONT_NAME, size: 10 };
  periodCell.alignment = LEFT_WRAP;
  periodCell.border = BORDER_THIN;

  sheet.getRow(19).height = 28;
  sheet.getRow(20).height = 6;
  sheet.getRow(21).height = 6;

  /* III. THƯỞNG */
  writeSectionTitle(sheet, 22, "III. THƯỞNG");

  sheet.getCell("A23").value = "12. Thưởng chung";
  sheet.getCell("A23").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A23").alignment = LEFT;

  sheet.mergeCells("B23:D23");
  const bonus1 = sheet.getCell("B23");
  bonus1.value = formatMoney(sb?.bonuses?.general) + " VNĐ";
  bonus1.font = { name: FONT_NAME, size: 10 };
  bonus1.alignment = RIGHT;
  bonus1.border = BORDER_THIN;

  sheet.getCell("E23").value = "13. Thưởng hiệu suất";
  sheet.getCell("E23").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("E23").alignment = LEFT;

  sheet.mergeCells("F23:G23");
  const bonus2 = sheet.getCell("F23");
  bonus2.value = formatMoney(sb?.bonuses?.performance) + " VNĐ";
  bonus2.font = { name: FONT_NAME, size: 10 };
  bonus2.alignment = RIGHT;
  bonus2.border = BORDER_THIN;

  sheet.getCell("H23").value = "14. Thưởng trách nhiệm";
  sheet.getCell("H23").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("H23").alignment = LEFT;

  sheet.mergeCells("I23:K23");
  const bonus3 = sheet.getCell("I23");
  bonus3.value = formatMoney(sb?.bonuses?.responsibility) + " VNĐ";
  bonus3.font = { name: FONT_NAME, size: 10 };
  bonus3.alignment = RIGHT;
  bonus3.border = BORDER_THIN;

  sheet.getRow(23).height = 28;
  sheet.getRow(24).height = 6;
  sheet.getRow(25).height = 6;

  /* IV. BẢO HIỂM & THUẾ */
  writeSectionTitle(sheet, 26, "IV. BẢO HIỂM & THUẾ");

  sheet.getCell("A27").value = "15. Số sổ BHXH";
  sheet.getCell("A27").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A27").alignment = LEFT;

  sheet.mergeCells("B27:D27");
  const bhxhCell = sheet.getCell("B27");
  bhxhCell.value = safeString(sb?.socialInsuranceNumber);
  bhxhCell.font = { name: FONT_NAME, size: 10 };
  bhxhCell.alignment = LEFT;
  bhxhCell.border = BORDER_THIN;

  sheet.getCell("E27").value = "16. Mã số thuế";
  sheet.getCell("E27").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("E27").alignment = LEFT;

  sheet.mergeCells("F27:K27");
  const taxCell = sheet.getCell("F27");
  taxCell.value = safeString(sb?.taxCode);
  taxCell.font = { name: FONT_NAME, size: 10 };
  taxCell.alignment = LEFT;
  taxCell.border = BORDER_THIN;

  sheet.getRow(27).height = 28;
  sheet.getRow(28).height = 6;
  sheet.getRow(29).height = 6;

  /* V. NGÂN HÀNG */
  writeSectionTitle(sheet, 30, "V. THÔNG TIN NGÂN HÀNG");

  sheet.getCell("A31").value = "17. Ngân hàng";
  sheet.getCell("A31").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A31").alignment = LEFT;

  sheet.mergeCells("B31:D31");
  const bankNameCell = sheet.getCell("B31");
  bankNameCell.value = safeString(sb?.bankName);
  bankNameCell.font = { name: FONT_NAME, size: 10 };
  bankNameCell.alignment = LEFT_WRAP;
  bankNameCell.border = BORDER_THIN;

  sheet.getCell("E31").value = "18. Chi nhánh";
  sheet.getCell("E31").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("E31").alignment = LEFT;

  sheet.mergeCells("F31:K31");
  const branchCell = sheet.getCell("F31");
  branchCell.value = safeString(sb?.bankBranch);
  branchCell.font = { name: FONT_NAME, size: 10 };
  branchCell.alignment = LEFT_WRAP;
  branchCell.border = BORDER_THIN;

  sheet.getRow(31).height = 28;
  sheet.getRow(32).height = 6;

  sheet.getCell("A33").value = "19. Số tài khoản";
  sheet.getCell("A33").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("A33").alignment = LEFT;

  sheet.mergeCells("B33:D33");
  const accCell = sheet.getCell("B33");
  accCell.value = safeString(sb?.bankAccountNumber);
  accCell.font = { name: FONT_NAME, size: 10 };
  accCell.alignment = LEFT;
  accCell.border = BORDER_THIN;

  sheet.getCell("E33").value = "20. Phương thức TT";
  sheet.getCell("E33").font = { name: FONT_NAME, size: 10 };
  sheet.getCell("E33").alignment = LEFT;

  sheet.mergeCells("F33:K33");
  const methodCell = sheet.getCell("F33");
  methodCell.value = safeString(sb?.paymentMethod);
  methodCell.font = { name: FONT_NAME, size: 10 };
  methodCell.alignment = LEFT_WRAP;
  methodCell.border = BORDER_THIN;

  sheet.getRow(33).height = 28;
  sheet.getRow(34).height = 6;
  sheet.getRow(35).height = 6;

  /* NGÀY + CHỮ KÝ */
  sheet.mergeCells("G36:K36");
  const dateCell = sheet.getCell("G36");
  const today = new Date();
  dateCell.value = `Ngày ${String(today.getDate()).padStart(2, "0")} tháng ${String(
    today.getMonth() + 1
  ).padStart(2, "0")} năm ${today.getFullYear()}`;
  dateCell.font = { name: FONT_NAME, size: 10, italic: true };
  dateCell.alignment = CENTER;
  sheet.getRow(36).height = 20;

  sheet.mergeCells("G37:K37");
  const sigLabel = sheet.getCell("G37");
  sigLabel.value = "Người lập biểu";
  sigLabel.font = { name: FONT_NAME, size: 10, bold: true };
  sigLabel.alignment = CENTER;

  sheet.mergeCells("G38:K41");
  for (let r = 38; r <= 41; r += 1) {
    sheet.getRow(r).height = 20;
  }

  sheet.pageSetup.printTitlesRow = "1:4";

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
  // Tạo form 02 với tiêu đề tùy chỉnh
  const sheet = await buildPersonalInfoFormSheet(workbook, employee);
  // Đổi tiêu đề
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