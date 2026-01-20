"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  eachWeekOfInterval,
  startOfWeek,
  endOfWeek,
  parseISO,
} from "date-fns";

interface MonthlyStats {
  totalReports: number;
  totalStudents: number;
  totalPresent: number;
  avgAttendanceRate: number;
  healthIncidents: number;
  disciplineIncidents: number;
  criticalIncidents: number;
  lessonsNotCovered: number;
}

interface WeeklyBreakdown {
  weekStart: string;
  weekEnd: string;
  reports: number;
  avgAttendance: number;
  incidents: number;
}

interface ClassPerformance {
  className: string;
  grade: string;
  stream: string;
  totalReports: number;
  avgAttendance: number;
  incidents: number;
}

export default function MonthlySummaryPage() {
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [weeklyBreakdown, setWeeklyBreakdown] = useState<WeeklyBreakdown[]>([]);
  const [classPerformance, setClassPerformance] = useState<ClassPerformance[]>(
    [],
  );
  const [userRole, setUserRole] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    checkAuthAndLoad();
  }, [currentMonth]);

  async function checkAuthAndLoad() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      router.push("/auth/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (
      !profile ||
      !["headteacher", "director", "admin"].includes(profile.role)
    ) {
      router.push("/dashboard/teacher");
      return;
    }

    setUserRole(profile.role);
    await loadMonthlyData();
  }

  async function loadMonthlyData() {
    setLoading(true);

    const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    // Fetch all reports for the month
    const { data: reports } = await supabase
      .from("daily_reports")
      .select(
        `
        *,
        classes(id, grade, stream)
      `,
      )
      .gte("report_date", monthStart)
      .lte("report_date", monthEnd);

    // Fetch incidents for the month
    const { data: incidents } = await supabase
      .from("incidents")
      .select("*")
      .gte("incident_date", monthStart)
      .lte("incident_date", monthEnd);

    if (!reports) {
      setLoading(false);
      return;
    }

    // Calculate monthly stats
    const totalStudents = reports.reduce((sum, r) => sum + r.total_learners, 0);
    const totalPresent = reports.reduce(
      (sum, r) => sum + r.present_learners,
      0,
    );
    const healthIncidents = reports.filter((r) => r.health_incident).length;
    const disciplineIncidents = reports.filter(
      (r) => r.discipline_issue,
    ).length;
    const criticalIncidents =
      incidents?.filter(
        (i) => i.severity === "critical" || i.severity === "high",
      ).length || 0;
    const lessonsNotCovered = reports.filter((r) => !r.lessons_covered).length;

    setStats({
      totalReports: reports.length,
      totalStudents,
      totalPresent,
      avgAttendanceRate:
        totalStudents > 0
          ? Math.round((totalPresent / totalStudents) * 100)
          : 0,
      healthIncidents,
      disciplineIncidents,
      criticalIncidents,
      lessonsNotCovered,
    });

    // Calculate weekly breakdown
    const weeks = eachWeekOfInterval(
      { start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) },
      { weekStartsOn: 1 },
    );

    const weeklyData = weeks.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekStartStr = format(weekStart, "yyyy-MM-dd");
      const weekEndStr = format(weekEnd, "yyyy-MM-dd");

      const weekReports = reports.filter((r) => {
        const reportDate = r.report_date;
        return reportDate >= weekStartStr && reportDate <= weekEndStr;
      });

      const weekTotalStudents = weekReports.reduce(
        (sum, r) => sum + r.total_learners,
        0,
      );
      const weekPresent = weekReports.reduce(
        (sum, r) => sum + r.present_learners,
        0,
      );
      const weekIncidents = weekReports.filter(
        (r) => r.health_incident || r.discipline_issue,
      ).length;

      return {
        weekStart: format(weekStart, "MMM d"),
        weekEnd: format(weekEnd, "MMM d"),
        reports: weekReports.length,
        avgAttendance:
          weekTotalStudents > 0
            ? Math.round((weekPresent / weekTotalStudents) * 100)
            : 0,
        incidents: weekIncidents,
      };
    });

    setWeeklyBreakdown(weeklyData);

    // Calculate class performance
    const classMap = new Map<
      string,
      { grade: string; stream: string; reports: any[] }
    >();
    reports.forEach((report) => {
      if (report.classes) {
        const key = `${report.classes.grade}-${report.classes.stream}`;
        if (!classMap.has(key)) {
          classMap.set(key, {
            grade: report.classes.grade,
            stream: report.classes.stream,
            reports: [],
          });
        }
        classMap.get(key)!.reports.push(report);
      }
    });

    const classData: ClassPerformance[] = Array.from(classMap.entries())
      .map(([key, data]) => {
        const totalStudents = data.reports.reduce(
          (sum, r) => sum + r.total_learners,
          0,
        );
        const totalPresent = data.reports.reduce(
          (sum, r) => sum + r.present_learners,
          0,
        );
        const incidents = data.reports.filter(
          (r) => r.health_incident || r.discipline_issue,
        ).length;

        return {
          className: key,
          grade: data.grade,
          stream: data.stream,
          totalReports: data.reports.length,
          avgAttendance:
            totalStudents > 0
              ? Math.round((totalPresent / totalStudents) * 100)
              : 0,
          incidents,
        };
      })
      .sort((a, b) => b.avgAttendance - a.avgAttendance);

    setClassPerformance(classData);
    setLoading(false);
  }

  function handlePrevMonth() {
    setCurrentMonth(subMonths(currentMonth, 1));
  }

  function handleNextMonth() {
    setCurrentMonth(addMonths(currentMonth, 1));
  }

  function handleExportCSV() {
    if (!stats || !weeklyBreakdown.length) return;

    let csv = "Monthly Summary Report\n";
    csv += `Month: ${format(currentMonth, "MMMM yyyy")}\n\n`;

    csv += "OVERVIEW\n";
    csv += `Total Reports,${stats.totalReports}\n`;
    csv += `Average Attendance Rate,${stats.avgAttendanceRate}%\n`;
    csv += `Health Incidents,${stats.healthIncidents}\n`;
    csv += `Discipline Incidents,${stats.disciplineIncidents}\n`;
    csv += `Critical/High Severity,${stats.criticalIncidents}\n`;
    csv += `Lessons Not Covered,${stats.lessonsNotCovered}\n\n`;

    csv += "WEEKLY BREAKDOWN\n";
    csv += "Week,Reports,Avg Attendance,Incidents\n";
    weeklyBreakdown.forEach((week) => {
      csv += `${week.weekStart} - ${week.weekEnd},${week.reports},${week.avgAttendance}%,${week.incidents}\n`;
    });

    csv += "\nCLASS PERFORMANCE\n";
    csv += "Class,Reports,Avg Attendance,Incidents\n";
    classPerformance.forEach((cls) => {
      csv += `${cls.grade} - ${cls.stream},${cls.totalReports},${cls.avgAttendance}%,${cls.incidents}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monthly-summary-${format(currentMonth, "yyyy-MM")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Monthly Summary
              </h1>
              <p className="text-gray-600 mt-1">
                School performance overview for the month
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/reports/weekly-summary"
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Weekly View
              </Link>
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Export CSV
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                Print
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Print Header */}
      <div className="hidden print:block text-center py-4 border-b">
        <h1 className="text-2xl font-bold">Lelani School - Monthly Summary</h1>
        <p className="text-gray-600">{format(currentMonth, "MMMM yyyy")}</p>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Month Navigation */}
        <div className="flex items-center justify-center gap-4 mb-8 print:hidden">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h2 className="text-xl font-semibold text-gray-900 min-w-[200px] text-center">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={endOfMonth(currentMonth) > new Date()}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-md p-5 print:shadow-none print:border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Reports</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalReports || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-5 print:shadow-none print:border">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  (stats?.avgAttendanceRate || 0) >= 90
                    ? "bg-green-100"
                    : (stats?.avgAttendanceRate || 0) >= 75
                      ? "bg-yellow-100"
                      : "bg-red-100"
                }`}
              >
                <span className="text-2xl">📈</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Attendance</p>
                <p
                  className={`text-2xl font-bold ${
                    (stats?.avgAttendanceRate || 0) >= 90
                      ? "text-green-600"
                      : (stats?.avgAttendanceRate || 0) >= 75
                        ? "text-yellow-600"
                        : "text-red-600"
                  }`}
                >
                  {stats?.avgAttendanceRate || 0}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-5 print:shadow-none print:border">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  (stats?.healthIncidents || 0) +
                    (stats?.disciplineIncidents || 0) ===
                  0
                    ? "bg-green-100"
                    : "bg-yellow-100"
                }`}
              >
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Incidents</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(stats?.healthIncidents || 0) +
                    (stats?.disciplineIncidents || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-5 print:shadow-none print:border">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  (stats?.criticalIncidents || 0) === 0
                    ? "bg-green-100"
                    : "bg-red-100"
                }`}
              >
                <span className="text-2xl">🚨</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Critical/High</p>
                <p
                  className={`text-2xl font-bold ${
                    (stats?.criticalIncidents || 0) === 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {stats?.criticalIncidents || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Weekly Breakdown */}
          <div className="bg-white rounded-xl shadow-md p-6 print:shadow-none print:border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Weekly Breakdown
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">
                      Week
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-gray-500">
                      Reports
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-gray-500">
                      Attendance
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-gray-500">
                      Incidents
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyBreakdown.map((week, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-2 text-sm text-gray-900">
                        {week.weekStart} - {week.weekEnd}
                      </td>
                      <td className="py-3 px-2 text-sm text-center text-gray-600">
                        {week.reports}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            week.avgAttendance >= 90
                              ? "bg-green-100 text-green-800"
                              : week.avgAttendance >= 75
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {week.avgAttendance}%
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            week.incidents === 0
                              ? "bg-green-100 text-green-800"
                              : week.incidents <= 2
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {week.incidents}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Class Performance */}
          <div className="bg-white rounded-xl shadow-md p-6 print:shadow-none print:border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Class Performance
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">
                      Class
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-gray-500">
                      Reports
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-gray-500">
                      Attendance
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-gray-500">
                      Incidents
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {classPerformance.map((cls, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-2 text-sm font-medium text-gray-900">
                        {cls.grade} - {cls.stream}
                      </td>
                      <td className="py-3 px-2 text-sm text-center text-gray-600">
                        {cls.totalReports}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            cls.avgAttendance >= 90
                              ? "bg-green-100 text-green-800"
                              : cls.avgAttendance >= 75
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {cls.avgAttendance}%
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            cls.incidents === 0
                              ? "bg-green-100 text-green-800"
                              : cls.incidents <= 3
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {cls.incidents}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Month Comparison */}
        <div className="mt-8 bg-white rounded-xl shadow-md p-6 print:shadow-none print:border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Key Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">
                📊 Report Coverage
              </h4>
              <p className="text-sm text-blue-700">
                {stats?.totalReports || 0} reports submitted this month
                {weeklyBreakdown.length > 0 && (
                  <>
                    , averaging{" "}
                    {Math.round(
                      (stats?.totalReports || 0) / weeklyBreakdown.length,
                    )}{" "}
                    per week
                  </>
                )}
              </p>
            </div>

            <div
              className={`p-4 rounded-lg ${
                (stats?.avgAttendanceRate || 0) >= 90
                  ? "bg-green-50"
                  : (stats?.avgAttendanceRate || 0) >= 75
                    ? "bg-yellow-50"
                    : "bg-red-50"
              }`}
            >
              <h4
                className={`font-medium mb-2 ${
                  (stats?.avgAttendanceRate || 0) >= 90
                    ? "text-green-900"
                    : (stats?.avgAttendanceRate || 0) >= 75
                      ? "text-yellow-900"
                      : "text-red-900"
                }`}
              >
                📈 Attendance Trend
              </h4>
              <p
                className={`text-sm ${
                  (stats?.avgAttendanceRate || 0) >= 90
                    ? "text-green-700"
                    : (stats?.avgAttendanceRate || 0) >= 75
                      ? "text-yellow-700"
                      : "text-red-700"
                }`}
              >
                Monthly average: {stats?.avgAttendanceRate || 0}%
                {(stats?.avgAttendanceRate || 0) >= 90
                  ? " - Excellent attendance!"
                  : (stats?.avgAttendanceRate || 0) >= 75
                    ? " - Good, but room for improvement"
                    : " - Needs attention"}
              </p>
            </div>

            <div
              className={`p-4 rounded-lg ${
                (stats?.criticalIncidents || 0) === 0
                  ? "bg-green-50"
                  : "bg-red-50"
              }`}
            >
              <h4
                className={`font-medium mb-2 ${
                  (stats?.criticalIncidents || 0) === 0
                    ? "text-green-900"
                    : "text-red-900"
                }`}
              >
                🔒 Safety Status
              </h4>
              <p
                className={`text-sm ${
                  (stats?.criticalIncidents || 0) === 0
                    ? "text-green-700"
                    : "text-red-700"
                }`}
              >
                {(stats?.criticalIncidents || 0) === 0
                  ? "No critical incidents this month"
                  : `${stats?.criticalIncidents} critical/high severity incident${(stats?.criticalIncidents || 0) > 1 ? "s" : ""} recorded`}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="mt-8 flex flex-wrap gap-4 print:hidden">
          <Link
            href="/dashboard/director"
            className="text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Dashboard
          </Link>
          <Link
            href="/reports/history"
            className="text-gray-600 hover:text-gray-700 font-medium"
          >
            View All Reports →
          </Link>
        </div>
      </main>
    </div>
  );
}
