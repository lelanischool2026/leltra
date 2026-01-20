"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks } from "date-fns";
import Link from "next/link";

interface WeeklySummary {
  startDate: string;
  endDate: string;
  totalReports: number;
  totalStudents: number;
  avgAttendance: number;
  totalPresent: number;
  totalAbsent: number;
  healthIncidents: number;
  disciplineIncidents: number;
  parentCommunications: number;
  classSummaries: ClassSummary[];
  dailyBreakdown: DailyBreakdown[];
}

interface ClassSummary {
  className: string;
  grade: string;
  stream: string;
  reportsSubmitted: number;
  avgAttendance: number;
  healthIssues: number;
  disciplineIssues: number;
}

interface DailyBreakdown {
  date: string;
  displayDate: string;
  totalStudents: number;
  presentStudents: number;
  attendanceRate: number;
  reportsCount: number;
}

export default function WeeklySummaryPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadWeeklySummary();
  }, [currentWeekStart]);

  const loadWeeklySummary = async () => {
    setLoading(true);
    
    const weekStart = format(currentWeekStart, "yyyy-MM-dd");
    const weekEnd = format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), "yyyy-MM-dd");

    try {
      // Get reports for the week
      const { data: reports } = await supabase
        .from("daily_reports")
        .select(`
          *,
          classes(grade, stream)
        `)
        .gte("report_date", weekStart)
        .lte("report_date", weekEnd)
        .order("report_date", { ascending: true });

      if (reports) {
        // Process daily breakdown
        const dailyMap = new Map<string, DailyBreakdown>();
        reports.forEach((report: any) => {
          const date = report.report_date;
          const existing = dailyMap.get(date) || {
            date,
            displayDate: format(new Date(date), "EEE, MMM dd"),
            totalStudents: 0,
            presentStudents: 0,
            attendanceRate: 0,
            reportsCount: 0,
          };
          existing.totalStudents += report.total_learners;
          existing.presentStudents += report.present_learners;
          existing.reportsCount += 1;
          dailyMap.set(date, existing);
        });

        const dailyBreakdown = Array.from(dailyMap.values()).map(day => ({
          ...day,
          attendanceRate: day.totalStudents > 0 ? Math.round((day.presentStudents / day.totalStudents) * 100) : 0
        }));

        // Process class summaries
        const classMap = new Map<string, ClassSummary>();
        reports.forEach((report: any) => {
          const key = `${report.classes.grade}-${report.classes.stream}`;
          const existing = classMap.get(key) || {
            className: `${report.classes.grade} - ${report.classes.stream}`,
            grade: report.classes.grade,
            stream: report.classes.stream,
            reportsSubmitted: 0,
            avgAttendance: 0,
            healthIssues: 0,
            disciplineIssues: 0,
          };
          existing.reportsSubmitted += 1;
          existing.avgAttendance += (report.present_learners / report.total_learners) * 100;
          if (report.health_incident) existing.healthIssues += 1;
          if (report.discipline_issue) existing.disciplineIssues += 1;
          classMap.set(key, existing);
        });

        const classSummaries = Array.from(classMap.values()).map(cls => ({
          ...cls,
          avgAttendance: cls.reportsSubmitted > 0 ? Math.round(cls.avgAttendance / cls.reportsSubmitted) : 0
        })).sort((a, b) => a.className.localeCompare(b.className));

        // Calculate totals
        const totalStudents = reports.reduce((sum: number, r: any) => sum + r.total_learners, 0);
        const totalPresent = reports.reduce((sum: number, r: any) => sum + r.present_learners, 0);

        setSummary({
          startDate: weekStart,
          endDate: weekEnd,
          totalReports: reports.length,
          totalStudents: Math.round(totalStudents / (dailyBreakdown.length || 1)),
          avgAttendance: totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0,
          totalPresent,
          totalAbsent: totalStudents - totalPresent,
          healthIncidents: reports.filter((r: any) => r.health_incident).length,
          disciplineIncidents: reports.filter((r: any) => r.discipline_issue).length,
          parentCommunications: reports.filter((r: any) => r.parent_communication).length,
          classSummaries,
          dailyBreakdown,
        });
      } else {
        setSummary(null);
      }
    } catch (error) {
      console.error("Error loading summary:", error);
    }

    setLoading(false);
  };

  const navigateWeek = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setCurrentWeekStart(subWeeks(currentWeekStart, 1));
    } else {
      setCurrentWeekStart(addWeeks(currentWeekStart, 1));
    }
  };

  const exportToCSV = () => {
    if (!summary) return;

    // Daily breakdown CSV
    const headers = ["Date", "Total Students", "Present", "Absent", "Attendance Rate %", "Reports Count"];
    const rows = summary.dailyBreakdown.map(day => [
      day.date,
      day.totalStudents,
      day.presentStudents,
      day.totalStudents - day.presentStudents,
      day.attendanceRate,
      day.reportsCount
    ]);

    // Add summary row
    rows.push([]);
    rows.push(["WEEKLY SUMMARY"]);
    rows.push(["Total Reports", summary.totalReports]);
    rows.push(["Average Daily Students", summary.totalStudents]);
    rows.push(["Overall Attendance Rate", `${summary.avgAttendance}%`]);
    rows.push(["Health Incidents", summary.healthIncidents]);
    rows.push(["Discipline Incidents", summary.disciplineIncidents]);
    rows.push([]);
    rows.push(["CLASS BREAKDOWN"]);
    rows.push(["Class", "Reports", "Avg Attendance", "Health Issues", "Discipline Issues"]);
    summary.classSummaries.forEach(cls => {
      rows.push([cls.className, cls.reportsSubmitted, `${cls.avgAttendance}%`, cls.healthIssues, cls.disciplineIssues]);
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => Array.isArray(row) ? row.join(",") : row)
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `weekly_summary_${summary.startDate}_to_${summary.endDate}.csv`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 print:hidden">
        <div>
          <Link href="/dashboard/director" className="text-accent hover:text-accent-dark text-sm mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Weekly Summary Report
          </h1>
          <p className="mt-1 text-gray-600">
            School performance overview for the week
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Report
          </button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-center gap-4 print:hidden">
        <button
          onClick={() => navigateWeek("prev")}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">
            {format(currentWeekStart, "MMM dd")} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), "MMM dd, yyyy")}
          </p>
        </div>
        <button
          onClick={() => navigateWeek("next")}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
          disabled={currentWeekStart >= startOfWeek(new Date(), { weekStartsOn: 1 })}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Printable Content */}
      <div ref={printRef} className="print:p-8">
        {/* Print Header */}
        <div className="hidden print:block mb-8 text-center">
          <h1 className="text-2xl font-bold">Lelani School - Weekly Summary Report</h1>
          <p className="text-gray-600">
            Week of {format(currentWeekStart, "MMMM dd")} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), "MMMM dd, yyyy")}
          </p>
          <p className="text-sm text-gray-500 mt-1">Generated on {format(new Date(), "MMMM dd, yyyy 'at' h:mm a")}</p>
        </div>

        {!summary || summary.totalReports === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <span className="text-4xl mb-4 block">📋</span>
            <p className="text-gray-500 text-lg">No reports submitted for this week</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white print:bg-blue-100 print:text-blue-800">
                <p className="text-blue-100 text-sm print:text-blue-600">Total Reports</p>
                <p className="text-3xl font-bold mt-1">{summary.totalReports}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white print:bg-green-100 print:text-green-800">
                <p className="text-green-100 text-sm print:text-green-600">Avg Attendance</p>
                <p className="text-3xl font-bold mt-1">{summary.avgAttendance}%</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-5 text-white print:bg-yellow-100 print:text-yellow-800">
                <p className="text-yellow-100 text-sm print:text-yellow-600">Health Incidents</p>
                <p className="text-3xl font-bold mt-1">{summary.healthIncidents}</p>
              </div>
              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 text-white print:bg-red-100 print:text-red-800">
                <p className="text-red-100 text-sm print:text-red-600">Discipline Issues</p>
                <p className="text-3xl font-bold mt-1">{summary.disciplineIncidents}</p>
              </div>
            </div>

            {/* Attendance Summary */}
            <div className="bg-white rounded-xl shadow-md p-6 print:shadow-none print:border print:border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Attendance Summary</h3>
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-4xl font-bold text-gray-900">{summary.totalStudents}</p>
                  <p className="text-sm text-gray-500 mt-1">Avg Daily Students</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-green-600">{summary.avgAttendance}%</p>
                  <p className="text-sm text-gray-500 mt-1">Attendance Rate</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-blue-600">{summary.parentCommunications}</p>
                  <p className="text-sm text-gray-500 mt-1">Parent Communications</p>
                </div>
              </div>
            </div>

            {/* Daily Breakdown */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden print:shadow-none print:border print:border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">📅 Daily Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Day</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reports</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total Students</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Present</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Absent</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {summary.dailyBreakdown.map((day) => (
                      <tr key={day.date} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{day.displayDate}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{day.reportsCount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{day.totalStudents}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-green-600 font-medium">{day.presentStudents}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-red-600 font-medium">{day.totalStudents - day.presentStudents}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            day.attendanceRate >= 90 ? "bg-green-100 text-green-800" :
                            day.attendanceRate >= 75 ? "bg-yellow-100 text-yellow-800" :
                            "bg-red-100 text-red-800"
                          }`}>
                            {day.attendanceRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Class Performance */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden print:shadow-none print:border print:border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">🏫 Class Performance</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Class</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reports</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Avg Attendance</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Health Issues</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Discipline</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {summary.classSummaries.map((cls, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{cls.className}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{cls.reportsSubmitted}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2 print:hidden">
                              <div 
                                className={`h-2 rounded-full ${
                                  cls.avgAttendance >= 90 ? "bg-green-500" : 
                                  cls.avgAttendance >= 75 ? "bg-yellow-500" : "bg-red-500"
                                }`}
                                style={{ width: `${cls.avgAttendance}%` }}
                              />
                            </div>
                            <span className="font-medium">{cls.avgAttendance}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {cls.healthIssues > 0 ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                              {cls.healthIssues}
                            </span>
                          ) : <span className="text-gray-400">0</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {cls.disciplineIssues > 0 ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                              {cls.disciplineIssues}
                            </span>
                          ) : <span className="text-gray-400">0</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            cls.avgAttendance >= 90 ? "bg-green-100 text-green-800" :
                            cls.avgAttendance >= 75 ? "bg-yellow-100 text-yellow-800" :
                            "bg-red-100 text-red-800"
                          }`}>
                            {cls.avgAttendance >= 90 ? "Excellent" : cls.avgAttendance >= 75 ? "Good" : "Needs Attention"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Key Insights */}
            <div className="bg-white rounded-xl shadow-md p-6 print:shadow-none print:border print:border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Key Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Best Performing Class */}
                {summary.classSummaries.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-600 font-medium">Best Performing Class</p>
                    <p className="text-lg font-bold text-green-800 mt-1">
                      {summary.classSummaries.reduce((a, b) => a.avgAttendance > b.avgAttendance ? a : b).className}
                    </p>
                    <p className="text-sm text-green-700">
                      {summary.classSummaries.reduce((a, b) => a.avgAttendance > b.avgAttendance ? a : b).avgAttendance}% attendance
                    </p>
                  </div>
                )}

                {/* Needs Attention */}
                {summary.classSummaries.filter(c => c.avgAttendance < 75).length > 0 ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-600 font-medium">Classes Needing Attention</p>
                    <p className="text-lg font-bold text-red-800 mt-1">
                      {summary.classSummaries.filter(c => c.avgAttendance < 75).length} class(es)
                    </p>
                    <p className="text-sm text-red-700">
                      Below 75% attendance rate
                    </p>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-600 font-medium">Attendance Status</p>
                    <p className="text-lg font-bold text-blue-800 mt-1">All classes on track!</p>
                    <p className="text-sm text-blue-700">
                      All classes above 75% attendance
                    </p>
                  </div>
                )}

                {/* Incident Summary */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-600 font-medium">Incident Summary</p>
                  <p className="text-lg font-bold text-yellow-800 mt-1">
                    {summary.healthIncidents + summary.disciplineIncidents} total incidents
                  </p>
                  <p className="text-sm text-yellow-700">
                    {summary.healthIncidents} health, {summary.disciplineIncidents} discipline
                  </p>
                </div>

                {/* Report Completion */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-sm text-purple-600 font-medium">Parent Engagement</p>
                  <p className="text-lg font-bold text-purple-800 mt-1">
                    {summary.parentCommunications} communications
                  </p>
                  <p className="text-sm text-purple-700">
                    Logged this week
                  </p>
                </div>
              </div>
            </div>

            {/* Print Footer */}
            <div className="hidden print:block mt-8 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
              <p>Lelani School Daily Reporting & Analytics System (LSDRAS)</p>
              <p>This report was automatically generated. For questions, contact the administration.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
