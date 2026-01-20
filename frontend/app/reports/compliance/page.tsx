"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isWeekend,
  parseISO,
  subDays,
} from "date-fns";

interface ClassCompliance {
  classId: string;
  grade: string;
  stream: string;
  teacherName: string;
  teacherId: string;
  totalExpected: number;
  totalSubmitted: number;
  complianceRate: number;
  missingDates: string[];
}

interface DailyCompliance {
  date: string;
  displayDate: string;
  totalClasses: number;
  submitted: number;
  missing: number;
  complianceRate: number;
}

export default function CompliancePage() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"week" | "month">("week");
  const [classCompliance, setClassCompliance] = useState<ClassCompliance[]>([]);
  const [dailyCompliance, setDailyCompliance] = useState<DailyCompliance[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalExpected: 0,
    totalSubmitted: 0,
    complianceRate: 0,
    perfectClasses: 0,
    missingClasses: 0,
  });
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  
  const router = useRouter();

  useEffect(() => {
    checkAuthAndLoad();
  }, [timeRange]);

  async function checkAuthAndLoad() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/auth/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (!profile || !["headteacher", "director", "admin"].includes(profile.role)) {
      router.push("/dashboard/teacher");
      return;
    }

    await loadComplianceData();
  }

  async function loadComplianceData() {
    setLoading(true);

    // Calculate date range (excluding weekends)
    let startDate: Date;
    let endDate = new Date();

    if (timeRange === "week") {
      startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
      endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
    } else {
      startDate = startOfMonth(new Date());
      endDate = endOfMonth(new Date());
    }

    // Don't include future dates
    if (endDate > new Date()) {
      endDate = new Date();
    }

    // Get all school days (Mon-Fri) in range
    const allDays = eachDayOfInterval({ start: startDate, end: endDate })
      .filter((day) => !isWeekend(day))
      .map((day) => format(day, "yyyy-MM-dd"));

    // Fetch all active classes with their assigned teachers
    const { data: classes } = await supabase
      .from("classes")
      .select(`
        id,
        grade,
        stream,
        teacher_classes(
          teacher_id,
          profiles(full_name)
        )
      `)
      .eq("active", true);

    if (!classes) {
      setLoading(false);
      return;
    }

    // Fetch all reports in the date range
    const { data: reports } = await supabase
      .from("daily_reports")
      .select("class_id, report_date, teacher_id")
      .gte("report_date", format(startDate, "yyyy-MM-dd"))
      .lte("report_date", format(endDate, "yyyy-MM-dd"));

    // Build a set of submitted reports (class_id + date)
    const submittedSet = new Set<string>();
    reports?.forEach((r) => {
      submittedSet.add(`${r.class_id}-${r.report_date}`);
    });

    // Calculate compliance per class
    const classData: ClassCompliance[] = classes.map((cls: any) => {
      const teacherAssignment = cls.teacher_classes?.[0];
      const teacherName = teacherAssignment?.profiles?.full_name || "Unassigned";
      const teacherId = teacherAssignment?.teacher_id || "";

      const missingDates: string[] = [];
      let submitted = 0;

      allDays.forEach((date) => {
        if (submittedSet.has(`${cls.id}-${date}`)) {
          submitted++;
        } else {
          missingDates.push(date);
        }
      });

      return {
        classId: cls.id,
        grade: cls.grade,
        stream: cls.stream,
        teacherName,
        teacherId,
        totalExpected: allDays.length,
        totalSubmitted: submitted,
        complianceRate: allDays.length > 0 ? Math.round((submitted / allDays.length) * 100) : 0,
        missingDates,
      };
    }).sort((a, b) => a.complianceRate - b.complianceRate);

    setClassCompliance(classData);

    // Calculate daily compliance
    const dailyData: DailyCompliance[] = allDays.map((date) => {
      const totalClasses = classes.length;
      let submitted = 0;

      classes.forEach((cls: any) => {
        if (submittedSet.has(`${cls.id}-${date}`)) {
          submitted++;
        }
      });

      return {
        date,
        displayDate: format(parseISO(date), "EEE, MMM d"),
        totalClasses,
        submitted,
        missing: totalClasses - submitted,
        complianceRate: totalClasses > 0 ? Math.round((submitted / totalClasses) * 100) : 0,
      };
    }).reverse(); // Most recent first

    setDailyCompliance(dailyData);

    // Calculate overall stats
    const totalExpected = classes.length * allDays.length;
    const totalSubmitted = classData.reduce((sum, c) => sum + c.totalSubmitted, 0);
    const perfectClasses = classData.filter((c) => c.complianceRate === 100).length;
    const missingClasses = classData.filter((c) => c.complianceRate < 100).length;

    setOverallStats({
      totalExpected,
      totalSubmitted,
      complianceRate: totalExpected > 0 ? Math.round((totalSubmitted / totalExpected) * 100) : 0,
      perfectClasses,
      missingClasses,
    });

    setLoading(false);
  }

  function handleExportCSV() {
    let csv = "Report Submission Compliance\n";
    csv += `Period: ${timeRange === "week" ? "This Week" : "This Month"}\n`;
    csv += `Overall Compliance: ${overallStats.complianceRate}%\n\n`;

    csv += "CLASS COMPLIANCE\n";
    csv += "Class,Teacher,Expected,Submitted,Rate,Missing Dates\n";
    classCompliance.forEach((c) => {
      csv += `"${c.grade} - ${c.stream}","${c.teacherName}",${c.totalExpected},${c.totalSubmitted},${c.complianceRate}%,"${c.missingDates.join("; ")}"\n`;
    });

    csv += "\nDAILY COMPLIANCE\n";
    csv += "Date,Total Classes,Submitted,Missing,Rate\n";
    dailyCompliance.forEach((d) => {
      csv += `${d.date},${d.totalClasses},${d.submitted},${d.missing},${d.complianceRate}%\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance_report_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Report Submission Compliance</h1>
              <p className="text-gray-600 mt-1">Track which teachers have submitted their daily reports</p>
            </div>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Time Range Toggle */}
        <div className="flex gap-2 mb-6">
          {[
            { value: "week", label: "This Week" },
            { value: "month", label: "This Month" },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeRange(option.value as typeof timeRange)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === option.value
                  ? "bg-red-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-md p-5">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                overallStats.complianceRate >= 90 ? 'bg-green-100' : 
                overallStats.complianceRate >= 75 ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Overall Compliance</p>
                <p className={`text-2xl font-bold ${
                  overallStats.complianceRate >= 90 ? 'text-green-600' : 
                  overallStats.complianceRate >= 75 ? 'text-yellow-600' : 'text-red-600'
                }`}>{overallStats.complianceRate}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📋</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Reports Submitted</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overallStats.totalSubmitted}/{overallStats.totalExpected}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">100% Compliance</p>
                <p className="text-2xl font-bold text-green-600">{overallStats.perfectClasses}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-5">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                overallStats.missingClasses === 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <span className="text-2xl">{overallStats.missingClasses === 0 ? '🎉' : '⚠️'}</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Missing Reports</p>
                <p className={`text-2xl font-bold ${
                  overallStats.missingClasses === 0 ? 'text-green-600' : 'text-red-600'
                }`}>{overallStats.totalExpected - overallStats.totalSubmitted}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Class Compliance Table */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Compliance by Class</h2>
              <p className="text-sm text-gray-500 mt-1">Sorted by lowest compliance first</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Class</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Teacher</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Submitted</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {classCompliance.map((cls) => (
                    <tr key={cls.classId} className={`hover:bg-gray-50 ${cls.complianceRate < 100 ? 'bg-red-50' : ''}`}>
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900">{cls.grade} - {cls.stream}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{cls.teacherName}</td>
                      <td className="py-3 px-4 text-center text-sm text-gray-600">
                        {cls.totalSubmitted}/{cls.totalExpected}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          cls.complianceRate === 100
                            ? 'bg-green-100 text-green-800'
                            : cls.complianceRate >= 75
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}>
                          {cls.complianceRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Daily Compliance Table */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Daily Breakdown</h2>
              <p className="text-sm text-gray-500 mt-1">Report submission by date</p>
            </div>
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Submitted</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Missing</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dailyCompliance.map((day) => (
                    <tr key={day.date} className={`hover:bg-gray-50 ${day.missing > 0 ? 'bg-red-50' : ''}`}>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">{day.displayDate}</td>
                      <td className="py-3 px-4 text-center text-sm text-gray-600">
                        {day.submitted}/{day.totalClasses}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {day.missing > 0 ? (
                          <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {day.missing}
                          </span>
                        ) : (
                          <span className="text-green-600">✓</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          day.complianceRate === 100
                            ? 'bg-green-100 text-green-800'
                            : day.complianceRate >= 75
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}>
                          {day.complianceRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Missing Reports Detail */}
        {classCompliance.some((c) => c.missingDates.length > 0) && (
          <div className="mt-8 bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">⚠️ Missing Reports Detail</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classCompliance
                .filter((c) => c.missingDates.length > 0)
                .map((cls) => (
                  <div key={cls.classId} className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{cls.grade} - {cls.stream}</span>
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                        {cls.missingDates.length} missing
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{cls.teacherName}</p>
                    <div className="flex flex-wrap gap-1">
                      {cls.missingDates.slice(0, 5).map((date) => (
                        <span
                          key={date}
                          className="px-2 py-0.5 bg-white text-gray-600 rounded text-xs border"
                        >
                          {format(parseISO(date), "MMM d")}
                        </span>
                      ))}
                      {cls.missingDates.length > 5 && (
                        <span className="px-2 py-0.5 text-gray-500 text-xs">
                          +{cls.missingDates.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/dashboard/headteacher"
            className="text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
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
