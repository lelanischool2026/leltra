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

// Export individual report to PDF
export function exportReportToPDF(data: ReportPDFData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(20);
  doc.setTextColor(31, 41, 55); // gray-800
  doc.text("Lelani School", pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(14);
  doc.setTextColor(107, 114, 128); // gray-500
  doc.text("Daily Class Report", pageWidth / 2, 28, { align: "center" });

  // Report Info Box
  doc.setFillColor(249, 250, 251); // gray-50
  doc.roundedRect(14, 35, pageWidth - 28, 25, 3, 3, "F");

  doc.setFontSize(11);
  doc.setTextColor(31, 41, 55);
  doc.text(
    `Date: ${format(new Date(data.reportDate), "MMMM dd, yyyy")}`,
    20,
    45,
  );
  doc.text(`Class: ${data.className}`, 20, 52);
  doc.text(`Teacher: ${data.teacherName}`, pageWidth / 2, 45);

  let yPos = 70;

  // Attendance Section
  doc.setFontSize(12);
  doc.setTextColor(31, 41, 55);
  doc.text("📊 Attendance", 14, yPos);
  yPos += 8;

  const attendanceRate = Math.round(
    (data.presentLearners / data.totalLearners) * 100,
  );

  autoTable(doc, {
    startY: yPos,
    head: [["Total Learners", "Present", "Absent", "Attendance Rate"]],
    body: [
      [
        data.totalLearners,
        data.presentLearners,
        data.totalLearners - data.presentLearners,
        `${attendanceRate}%`,
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [79, 70, 229] }, // accent color
    margin: { left: 14, right: 14 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Absentees
  if (data.absentees) {
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text("Absentees:", 14, yPos);
    yPos += 5;
    doc.setTextColor(31, 41, 55);
    const absenteeLines = doc.splitTextToSize(data.absentees, pageWidth - 28);
    doc.text(absenteeLines, 14, yPos);
    yPos += absenteeLines.length * 5 + 5;
  }

  // Health Section
  if (data.healthIncident) {
    doc.setFillColor(254, 243, 199); // yellow-100
    doc.roundedRect(14, yPos, pageWidth - 28, 20, 2, 2, "F");
    doc.setFontSize(11);
    doc.setTextColor(146, 64, 14); // yellow-800
    doc.text("⚠️ Health Incident Reported", 20, yPos + 8);
    if (data.healthDetails) {
      doc.setFontSize(10);
      doc.text(data.healthDetails.substring(0, 100), 20, yPos + 15);
    }
    yPos += 25;
  }

  // Discipline Section
  if (data.disciplineIssue) {
    doc.setFillColor(254, 226, 226); // red-100
    doc.roundedRect(14, yPos, pageWidth - 28, 20, 2, 2, "F");
    doc.setFontSize(11);
    doc.setTextColor(153, 27, 27); // red-800
    doc.text("⚠️ Discipline Issue Reported", 20, yPos + 8);
    if (data.disciplineDetails) {
      doc.setFontSize(10);
      doc.text(data.disciplineDetails.substring(0, 100), 20, yPos + 15);
    }
    yPos += 25;
  }

  // Academic Section
  yPos += 5;
  doc.setFontSize(12);
  doc.setTextColor(31, 41, 55);
  doc.text("📚 Academic Progress", 14, yPos);
  yPos += 8;

  const academicData: string[][] = [];
  academicData.push(["Lessons Covered", data.lessonsCovered ? "Yes" : "No"]);
  if (data.literacyTopic) {
    academicData.push(["Literacy Topic", data.literacyTopic]);
  }
  if (data.feedingStatus) {
    academicData.push(["Feeding Status", data.feedingStatus]);
  }

  autoTable(doc, {
    startY: yPos,
    body: academicData,
    theme: "plain",
    styles: { cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 50 },
    },
    margin: { left: 14, right: 14 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Parent Communication
  if (data.parentCommunication && data.parentDetails) {
    doc.setFontSize(12);
    doc.text("👥 Parent Communication", 14, yPos);
    yPos += 6;
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    const parentLines = doc.splitTextToSize(data.parentDetails, pageWidth - 28);
    doc.text(parentLines, 14, yPos);
    yPos += parentLines.length * 5 + 5;
  }

  // Challenges
  if (data.challenges) {
    doc.setFontSize(12);
    doc.setTextColor(31, 41, 55);
    doc.text("📝 Challenges", 14, yPos);
    yPos += 6;
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    const challengeLines = doc.splitTextToSize(data.challenges, pageWidth - 28);
    doc.text(challengeLines, 14, yPos);
    yPos += challengeLines.length * 5 + 10;
  }

  // Comments Section
  if (data.comments && data.comments.length > 0) {
    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(31, 41, 55);
    doc.text("💬 Headteacher Comments", 14, yPos);
    yPos += 8;

    data.comments.forEach((comment) => {
      doc.setFillColor(243, 244, 246); // gray-100
      const commentLines = doc.splitTextToSize(comment.comment, pageWidth - 40);
      const boxHeight = commentLines.length * 5 + 15;

      doc.roundedRect(14, yPos, pageWidth - 28, boxHeight, 2, 2, "F");
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(
        `${comment.author} - ${format(new Date(comment.date), "MMM dd, yyyy")}`,
        20,
        yPos + 6,
      );
      doc.setFontSize(10);
      doc.setTextColor(31, 41, 55);
      doc.text(commentLines, 20, yPos + 13);
      yPos += boxHeight + 5;
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175); // gray-400
    doc.text(
      `Generated on ${format(new Date(), "MMMM dd, yyyy 'at' h:mm a")} | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" },
    );
  }

  // Save
  doc.save(
    `report_${data.className.replace(/\s/g, "_")}_${data.reportDate}.pdf`,
  );
}

// Export weekly summary to PDF
export function exportWeeklySummaryToPDF(data: WeeklySummaryPDFData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(20);
  doc.setTextColor(31, 41, 55);
  doc.text("Lelani School", pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(14);
  doc.setTextColor(107, 114, 128);
  doc.text("Weekly Summary Report", pageWidth / 2, 28, { align: "center" });

  doc.setFontSize(11);
  doc.text(
    `Week of ${format(new Date(data.startDate), "MMMM dd")} - ${format(new Date(data.endDate), "MMMM dd, yyyy")}`,
    pageWidth / 2,
    36,
    { align: "center" },
  );

  let yPos = 50;

  // Overview Stats
  doc.setFontSize(12);
  doc.setTextColor(31, 41, 55);
  doc.text("📊 Weekly Overview", 14, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [["Metric", "Value"]],
    body: [
      ["Total Reports", data.totalReports.toString()],
      ["Average Attendance", `${data.avgAttendance}%`],
      ["Health Incidents", data.healthIncidents.toString()],
      ["Discipline Incidents", data.disciplineIncidents.toString()],
      ["Parent Communications", data.parentCommunications.toString()],
    ],
    theme: "striped",
    headStyles: { fillColor: [79, 70, 229] },
    margin: { left: 14, right: 14 },
    tableWidth: 100,
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Daily Breakdown
  doc.setFontSize(12);
  doc.text("📅 Daily Breakdown", 14, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [["Day", "Reports", "Students", "Present", "Absent", "Rate"]],
    body: data.dailyBreakdown.map((day) => [
      format(new Date(day.date), "EEE, MMM dd"),
      day.reportsCount,
      day.totalStudents,
      day.presentStudents,
      day.totalStudents - day.presentStudents,
      `${day.attendanceRate}%`,
    ]),
    theme: "grid",
    headStyles: { fillColor: [79, 70, 229] },
    margin: { left: 14, right: 14 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Class Performance
  doc.setFontSize(12);
  doc.text("🏫 Class Performance", 14, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [["Class", "Reports", "Attendance", "Health", "Discipline"]],
    body: data.classSummaries.map((cls) => [
      cls.className,
      cls.reportsSubmitted,
      `${cls.avgAttendance}%`,
      cls.healthIssues,
      cls.disciplineIssues,
    ]),
    theme: "grid",
    headStyles: { fillColor: [79, 70, 229] },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(
      `Generated on ${format(new Date(), "MMMM dd, yyyy 'at' h:mm a")} | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" },
    );
  }

  // Save
  doc.save(`weekly_summary_${data.startDate}_to_${data.endDate}.pdf`);
}

// Monthly Summary PDF Export
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

  // Header
  doc.setFillColor(220, 38, 38);
  doc.rect(0, 0, pageWidth, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text("Lelani School", pageWidth / 2, 15, { align: "center" });
  doc.setFontSize(12);
  doc.text("Monthly Summary Report", pageWidth / 2, 25, { align: "center" });

  // Month/Year
  doc.setTextColor(55, 65, 81);
  doc.setFontSize(16);
  doc.text(`${data.month} ${data.year}`, pageWidth / 2, 50, {
    align: "center",
  });

  let yPos = 65;

  // Overview Stats
  doc.setFontSize(12);
  doc.setTextColor(55, 65, 81);
  doc.text("📊 Monthly Overview", 14, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [["Metric", "Value"]],
    body: [
      ["Total Reports", data.totalReports.toString()],
      ["Average Attendance Rate", `${data.avgAttendance}%`],
      ["Health Incidents", data.healthIncidents.toString()],
      ["Discipline Incidents", data.disciplineIncidents.toString()],
      ["Critical/High Severity", data.criticalIncidents.toString()],
      ["Lessons Not Covered", data.lessonsNotCovered.toString()],
    ],
    theme: "striped",
    headStyles: { fillColor: [220, 38, 38] },
    margin: { left: 14, right: 14 },
    tableWidth: 100,
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Weekly Breakdown
  doc.setFontSize(12);
  doc.text("📅 Weekly Breakdown", 14, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [["Week", "Reports", "Avg Attendance", "Incidents"]],
    body: data.weeklyBreakdown.map((week) => [
      `${week.weekStart} - ${week.weekEnd}`,
      week.reports,
      `${week.avgAttendance}%`,
      week.incidents,
    ]),
    theme: "grid",
    headStyles: { fillColor: [79, 70, 229] },
    margin: { left: 14, right: 14 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Class Performance
  doc.setFontSize(12);
  doc.text("🏫 Class Performance", 14, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [["Class", "Reports", "Avg Attendance", "Incidents"]],
    body: data.classPerformance.map((cls) => [
      cls.className,
      cls.totalReports,
      `${cls.avgAttendance}%`,
      cls.incidents,
    ]),
    theme: "grid",
    headStyles: { fillColor: [79, 70, 229] },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(
      `Generated on ${format(new Date(), "MMMM dd, yyyy 'at' h:mm a")} | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" },
    );
  }

  // Save
  doc.save(`monthly_summary_${data.month}_${data.year}.pdf`);
}
