import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface ReportPDFData {
  reportDate: string;
  className: string;
  teacherName: string;
  totalLearners: number;
  presentLearners: number;
  absentees: string | null;
  healthIncident: boolean;
  healthDetails: string | null;
  feedingStatus: string | null;
  lessonsCovered: boolean;
  literacyTopic: string | null;
  disciplineIssue: boolean;
  disciplineDetails: string | null;
  parentCommunication: boolean;
  parentDetails: string | null;
  challenges: string | null;
  comments?: Array<{
    author: string;
    comment: string;
    date: string;
  }>;
}

interface WeeklySummaryPDFData {
  startDate: string;
  endDate: string;
  totalReports: number;
  avgAttendance: number;
  healthIncidents: number;
  disciplineIncidents: number;
  parentCommunications: number;
  dailyBreakdown: Array<{
    date: string;
    totalStudents: number;
    presentStudents: number;
    attendanceRate: number;
    reportsCount: number;
  }>;
  classSummaries: Array<{
    className: string;
    reportsSubmitted: number;
    avgAttendance: number;
    healthIssues: number;
    disciplineIssues: number;
  }>;
}

// School logo as base64 (placeholder - can be replaced with actual logo)
const SCHOOL_LOGO_BASE64 =
  "data:image/png;base64,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";

// Premium color palette
const COLORS = {
  primary: [79, 70, 229] as [number, number, number], // Indigo
  primaryLight: [238, 242, 255] as [number, number, number], // Indigo light
  secondary: [16, 185, 129] as [number, number, number], // Emerald
  warning: [245, 158, 11] as [number, number, number], // Amber
  danger: [239, 68, 68] as [number, number, number], // Red
  dangerLight: [254, 226, 226] as [number, number, number], // Red light
  warningLight: [254, 243, 199] as [number, number, number], // Amber light
  dark: [31, 41, 55] as [number, number, number], // Gray-800
  medium: [107, 114, 128] as [number, number, number], // Gray-500
  light: [156, 163, 175] as [number, number, number], // Gray-400
  background: [249, 250, 251] as [number, number, number], // Gray-50
  white: [255, 255, 255] as [number, number, number],
};

// Draw premium header with logo
function drawPremiumHeader(
  doc: jsPDF,
  title: string,
  subtitle?: string,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header background gradient effect (solid for PDF)
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 45, "F");

  // Add decorative accent line
  doc.setFillColor(...COLORS.secondary);
  doc.rect(0, 45, pageWidth, 3, "F");

  // Add logo
  try {
    doc.addImage(SCHOOL_LOGO_BASE64, "PNG", 15, 8, 28, 28);
  } catch (e) {
    // If logo fails, continue without it
  }

  // School name
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Lelani School", 50, 22);

  // Subtitle
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(title, 50, 32);

  if (subtitle) {
    doc.setFontSize(9);
    doc.text(subtitle, 50, 40);
  }

  return 58; // Return Y position after header
}

// Draw section header
function drawSectionHeader(doc: jsPDF, title: string, yPos: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(...COLORS.primaryLight);
  doc.roundedRect(14, yPos - 5, pageWidth - 28, 12, 2, 2, "F");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text(title, 20, yPos + 3);

  return yPos + 14;
}

// Export individual report to PDF - PREMIUM VERSION
export function exportReportToPDF(data: ReportPDFData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Premium Header with Logo
  let yPos = drawPremiumHeader(
    doc,
    "Daily Class Report",
    format(new Date(data.reportDate), "EEEE, MMMM dd, yyyy"),
  );

  // Report Info Box
  doc.setFillColor(...COLORS.background);
  doc.roundedRect(14, yPos, pageWidth - 28, 28, 4, 4, "F");

  // Left side info
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.medium);
  doc.setFont("helvetica", "normal");
  doc.text("CLASS", 22, yPos + 10);
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.dark);
  doc.setFont("helvetica", "bold");
  doc.text(data.className, 22, yPos + 20);

  // Right side info
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.medium);
  doc.setFont("helvetica", "normal");
  doc.text("TEACHER", pageWidth / 2 + 10, yPos + 10);
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.dark);
  doc.setFont("helvetica", "bold");
  doc.text(data.teacherName, pageWidth / 2 + 10, yPos + 20);

  yPos += 38;

  // ATTENDANCE SECTION
  yPos = drawSectionHeader(doc, "ATTENDANCE", yPos);

  const attendanceRate = Math.round(
    (data.presentLearners / data.totalLearners) * 100,
  );

  // Attendance badge
  const badgeColor =
    attendanceRate >= 90
      ? COLORS.secondary
      : attendanceRate >= 75
        ? COLORS.warning
        : COLORS.danger;

  autoTable(doc, {
    startY: yPos,
    head: [["Total Learners", "Present", "Absent", "Attendance Rate"]],
    body: [
      [
        data.totalLearners.toString(),
        data.presentLearners.toString(),
        (data.totalLearners - data.presentLearners).toString(),
        `${attendanceRate}%`,
      ],
    ],
    theme: "grid",
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: {
      halign: "center",
      fontSize: 11,
    },
    columnStyles: {
      3: { textColor: badgeColor, fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 8;

  // Absentees
  if (data.absentees) {
    doc.setFillColor(...COLORS.background);
    doc.roundedRect(14, yPos, pageWidth - 28, 18, 2, 2, "F");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.medium);
    doc.setFont("helvetica", "bold");
    doc.text("ABSENTEES:", 20, yPos + 7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.dark);
    const absenteeLines = doc.splitTextToSize(data.absentees, pageWidth - 50);
    doc.text(absenteeLines, 55, yPos + 7);
    yPos += 22;
  }

  // HEALTH SECTION
  if (data.healthIncident) {
    yPos += 5;
    doc.setFillColor(...COLORS.warningLight);
    doc.roundedRect(14, yPos, pageWidth - 28, 28, 3, 3, "F");

    // Warning icon indicator
    doc.setFillColor(...COLORS.warning);
    doc.roundedRect(14, yPos, 6, 28, 3, 0, "F");

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.warning);
    doc.text("HEALTH INCIDENT REPORTED", 26, yPos + 10);

    if (data.healthDetails) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.dark);
      const healthLines = doc.splitTextToSize(
        data.healthDetails,
        pageWidth - 46,
      );
      doc.text(healthLines, 26, yPos + 18);
    }
    yPos += 33;
  }

  // DISCIPLINE SECTION
  if (data.disciplineIssue) {
    yPos += 2;
    doc.setFillColor(...COLORS.dangerLight);
    doc.roundedRect(14, yPos, pageWidth - 28, 28, 3, 3, "F");

    // Danger icon indicator
    doc.setFillColor(...COLORS.danger);
    doc.roundedRect(14, yPos, 6, 28, 3, 0, "F");

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.danger);
    doc.text("DISCIPLINE ISSUE REPORTED", 26, yPos + 10);

    if (data.disciplineDetails) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.dark);
      const disciplineLines = doc.splitTextToSize(
        data.disciplineDetails,
        pageWidth - 46,
      );
      doc.text(disciplineLines, 26, yPos + 18);
    }
    yPos += 33;
  }

  // ACADEMIC PROGRESS SECTION
  yPos += 5;
  yPos = drawSectionHeader(doc, "ACADEMIC PROGRESS", yPos);

  const academicData: string[][] = [];
  academicData.push(["Lessons Covered", data.lessonsCovered ? "Yes" : "No"]);
  if (data.literacyTopic) {
    academicData.push(["Literacy Topic", data.literacyTopic]);
  }
  if (data.feedingStatus) {
    academicData.push(["Feeding Program", data.feedingStatus]);
  }

  autoTable(doc, {
    startY: yPos,
    body: academicData,
    theme: "plain",
    styles: {
      cellPadding: 4,
      fontSize: 10,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 55, textColor: COLORS.medium },
      1: { textColor: COLORS.dark },
    },
    margin: { left: 14, right: 14 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 8;

  // PARENT COMMUNICATION
  if (data.parentCommunication && data.parentDetails) {
    yPos = drawSectionHeader(doc, "PARENT COMMUNICATION", yPos);

    doc.setFontSize(10);
    doc.setTextColor(...COLORS.dark);
    doc.setFont("helvetica", "normal");
    const parentLines = doc.splitTextToSize(data.parentDetails, pageWidth - 36);
    doc.text(parentLines, 20, yPos + 2);
    yPos += parentLines.length * 5 + 8;
  }

  // CHALLENGES
  if (data.challenges) {
    yPos = drawSectionHeader(doc, "CHALLENGES & NOTES", yPos);

    doc.setFontSize(10);
    doc.setTextColor(...COLORS.dark);
    doc.setFont("helvetica", "normal");
    const challengeLines = doc.splitTextToSize(data.challenges, pageWidth - 36);
    doc.text(challengeLines, 20, yPos + 2);
    yPos += challengeLines.length * 5 + 10;
  }

  // HEADTEACHER COMMENTS
  if (data.comments && data.comments.length > 0) {
    // Check if we need a new page
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }

    yPos = drawSectionHeader(doc, "HEADTEACHER COMMENTS", yPos);

    data.comments.forEach((comment) => {
      doc.setFillColor(...COLORS.background);
      const commentLines = doc.splitTextToSize(comment.comment, pageWidth - 50);
      const boxHeight = commentLines.length * 5 + 18;

      doc.roundedRect(14, yPos, pageWidth - 28, boxHeight, 3, 3, "F");

      // Author badge
      doc.setFillColor(...COLORS.primary);
      doc.roundedRect(20, yPos + 4, 8, 8, 4, 4, "F");
      doc.setTextColor(...COLORS.white);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(comment.author.charAt(0).toUpperCase(), 22.5, yPos + 9.5);

      doc.setFontSize(9);
      doc.setTextColor(...COLORS.medium);
      doc.setFont("helvetica", "bold");
      doc.text(comment.author, 32, yPos + 10);
      doc.setFont("helvetica", "normal");
      doc.text(
        ` - ${format(new Date(comment.date), "MMM dd, yyyy")}`,
        32 + doc.getTextWidth(comment.author),
        yPos + 10,
      );

      doc.setFontSize(10);
      doc.setTextColor(...COLORS.dark);
      doc.text(commentLines, 20, yPos + 20);
      yPos += boxHeight + 6;
    });
  }

  // Premium Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();

    // Footer line
    doc.setDrawColor(...COLORS.light);
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);

    doc.setFontSize(8);
    doc.setTextColor(...COLORS.light);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Generated on ${format(new Date(), "MMMM dd, yyyy 'at' h:mm a")}`,
      14,
      pageHeight - 10,
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 10, {
      align: "right",
    });
  }

  // Save
  doc.save(
    `Lelani_Report_${data.className.replace(/\s/g, "_")}_${data.reportDate}.pdf`,
  );
}

// Export weekly summary to PDF - PREMIUM VERSION
export function exportWeeklySummaryToPDF(data: WeeklySummaryPDFData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Premium Header
  let yPos = drawPremiumHeader(
    doc,
    "Weekly Summary Report",
    `${format(new Date(data.startDate), "MMMM dd")} - ${format(new Date(data.endDate), "MMMM dd, yyyy")}`,
  );

  // Overview Stats Cards
  doc.setFillColor(...COLORS.background);
  doc.roundedRect(14, yPos, pageWidth - 28, 35, 4, 4, "F");

  const statWidth = (pageWidth - 28) / 4;
  const stats = [
    {
      label: "Reports",
      value: data.totalReports.toString(),
      color: COLORS.primary,
    },
    {
      label: "Avg Attendance",
      value: `${data.avgAttendance}%`,
      color: COLORS.secondary,
    },
    {
      label: "Health Issues",
      value: data.healthIncidents.toString(),
      color: COLORS.warning,
    },
    {
      label: "Discipline",
      value: data.disciplineIncidents.toString(),
      color: COLORS.danger,
    },
  ];

  stats.forEach((stat, i) => {
    const x = 14 + i * statWidth + statWidth / 2;
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.medium);
    doc.setFont("helvetica", "normal");
    doc.text(stat.label.toUpperCase(), x, yPos + 12, { align: "center" });
    doc.setFontSize(18);
    doc.setTextColor(...stat.color);
    doc.setFont("helvetica", "bold");
    doc.text(stat.value, x, yPos + 26, { align: "center" });
  });

  yPos += 45;

  // Daily Breakdown
  yPos = drawSectionHeader(doc, "DAILY BREAKDOWN", yPos);

  autoTable(doc, {
    startY: yPos,
    head: [["Day", "Reports", "Students", "Present", "Absent", "Rate"]],
    body: data.dailyBreakdown.map((day) => [
      format(new Date(day.date), "EEE, MMM dd"),
      day.reportsCount.toString(),
      day.totalStudents.toString(),
      day.presentStudents.toString(),
      (day.totalStudents - day.presentStudents).toString(),
      `${day.attendanceRate}%`,
    ]),
    theme: "grid",
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: { halign: "center", fontSize: 10 },
    margin: { left: 14, right: 14 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Class Performance
  yPos = drawSectionHeader(doc, "CLASS PERFORMANCE", yPos);

  autoTable(doc, {
    startY: yPos,
    head: [["Class", "Reports", "Attendance", "Health", "Discipline"]],
    body: data.classSummaries.map((cls) => [
      cls.className,
      cls.reportsSubmitted.toString(),
      `${cls.avgAttendance}%`,
      cls.healthIssues.toString(),
      cls.disciplineIssues.toString(),
    ]),
    theme: "grid",
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: { halign: "center", fontSize: 10 },
    columnStyles: { 0: { halign: "left" } },
    margin: { left: 14, right: 14 },
  });

  // Premium Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setDrawColor(...COLORS.light);
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);

    doc.setFontSize(8);
    doc.setTextColor(...COLORS.light);
    doc.text(
      `Generated on ${format(new Date(), "MMMM dd, yyyy 'at' h:mm a")}`,
      14,
      pageHeight - 10,
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 10, {
      align: "right",
    });
  }

  // Save
  doc.save(`Lelani_Weekly_Summary_${data.startDate}_to_${data.endDate}.pdf`);
}

// Monthly Summary PDF Export - PREMIUM VERSION
interface MonthlySummaryPDFData {
  month: string;
  year: string;
  totalReports: number;
  avgAttendance: number;
  healthIncidents: number;
  disciplineIncidents: number;
  criticalIncidents: number;
  lessonsNotCovered: number;
  weeklyBreakdown: Array<{
    weekStart: string;
    weekEnd: string;
    reports: number;
    avgAttendance: number;
    incidents: number;
  }>;
  classPerformance: Array<{
    className: string;
    totalReports: number;
    avgAttendance: number;
    incidents: number;
  }>;
}

export function exportMonthlySummaryToPDF(data: MonthlySummaryPDFData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Premium Header
  let yPos = drawPremiumHeader(
    doc,
    "Monthly Summary Report",
    `${data.month} ${data.year}`,
  );

  // Overview Stats Cards - 2 rows
  doc.setFillColor(...COLORS.background);
  doc.roundedRect(14, yPos, pageWidth - 28, 60, 4, 4, "F");

  const statWidth = (pageWidth - 28) / 3;
  const statsRow1 = [
    {
      label: "Total Reports",
      value: data.totalReports.toString(),
      color: COLORS.primary,
    },
    {
      label: "Avg Attendance",
      value: `${data.avgAttendance}%`,
      color: COLORS.secondary,
    },
    {
      label: "Health Incidents",
      value: data.healthIncidents.toString(),
      color: COLORS.warning,
    },
  ];
  const statsRow2 = [
    {
      label: "Discipline Issues",
      value: data.disciplineIncidents.toString(),
      color: COLORS.danger,
    },
    {
      label: "Critical/High",
      value: data.criticalIncidents.toString(),
      color: COLORS.danger,
    },
    {
      label: "Lessons Missed",
      value: data.lessonsNotCovered.toString(),
      color: COLORS.medium,
    },
  ];

  statsRow1.forEach((stat, i) => {
    const x = 14 + i * statWidth + statWidth / 2;
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.medium);
    doc.setFont("helvetica", "normal");
    doc.text(stat.label.toUpperCase(), x, yPos + 10, { align: "center" });
    doc.setFontSize(16);
    doc.setTextColor(...stat.color);
    doc.setFont("helvetica", "bold");
    doc.text(stat.value, x, yPos + 22, { align: "center" });
  });

  statsRow2.forEach((stat, i) => {
    const x = 14 + i * statWidth + statWidth / 2;
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.medium);
    doc.setFont("helvetica", "normal");
    doc.text(stat.label.toUpperCase(), x, yPos + 38, { align: "center" });
    doc.setFontSize(16);
    doc.setTextColor(...stat.color);
    doc.setFont("helvetica", "bold");
    doc.text(stat.value, x, yPos + 50, { align: "center" });
  });

  yPos += 70;

  // Weekly Breakdown
  yPos = drawSectionHeader(doc, "WEEKLY BREAKDOWN", yPos);

  autoTable(doc, {
    startY: yPos,
    head: [["Week", "Reports", "Avg Attendance", "Incidents"]],
    body: data.weeklyBreakdown.map((week) => [
      `${week.weekStart} - ${week.weekEnd}`,
      week.reports.toString(),
      `${week.avgAttendance}%`,
      week.incidents.toString(),
    ]),
    theme: "grid",
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: { halign: "center", fontSize: 10 },
    columnStyles: { 0: { halign: "left" } },
    margin: { left: 14, right: 14 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Class Performance
  yPos = drawSectionHeader(doc, "CLASS PERFORMANCE", yPos);

  autoTable(doc, {
    startY: yPos,
    head: [["Class", "Reports", "Avg Attendance", "Incidents"]],
    body: data.classPerformance.map((cls) => [
      cls.className,
      cls.totalReports.toString(),
      `${cls.avgAttendance}%`,
      cls.incidents.toString(),
    ]),
    theme: "grid",
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: { halign: "center", fontSize: 10 },
    columnStyles: { 0: { halign: "left" } },
    margin: { left: 14, right: 14 },
  });

  // Premium Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setDrawColor(...COLORS.light);
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);

    doc.setFontSize(8);
    doc.setTextColor(...COLORS.light);
    doc.text(
      `Generated on ${format(new Date(), "MMMM dd, yyyy 'at' h:mm a")}`,
      14,
      pageHeight - 10,
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 10, {
      align: "right",
    });
  }

  // Save
  doc.save(`Lelani_Monthly_Summary_${data.month}_${data.year}.pdf`);
}
