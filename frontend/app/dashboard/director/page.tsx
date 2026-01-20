"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface WeeklyStats {
  date: string;
  totalStudents: number;
  presentStudents: number;
  reportsCount: number;
}

interface ClassStats {
  grade: string;
  stream: string;
  totalReports: number;
  avgAttendance: number;
  healthIssues: number;
  disciplineIssues: number;
}

export default function DirectorDashboard() {
  const [loading, setLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<WeeklyStats[]>([]);
  const [classStats, setClassStats] = useState<ClassStats[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalTeachers: 0,
    totalClasses: 0,
    avgAttendance: 0,
    totalReportsThisWeek: 0,
  });
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const loadDashboardData = async () => {
    setLoading(true);

    // Get teachers count
    const { count: teachersCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "teacher");

    // Get classes count
    const { count: classesCount } = await supabase
      .from("classes")
      .select("*", { count: "exact", head: true })
      .eq("active", true);

    // Get reports for date range
    const { data: reports } = await supabase
      .from("daily_reports")
      .select(`
        *,
        classes(grade, stream)
      `)
      .gte("report_date", dateRange.start)
      .lte("report_date", dateRange.end);

    // Process weekly data
    const dailyMap = new Map<string, WeeklyStats>();
    reports?.forEach((report) => {
      const date = report.report_date;
      const existing = dailyMap.get(date) || {
        date,
        totalStudents: 0,
        presentStudents: 0,
        reportsCount: 0,
      };
      existing.totalStudents += report.total_learners;
      existing.presentStudents += report.present_learners;
      existing.reportsCount += 1;
      dailyMap.set(date, existing);
    });
    setWeeklyData(Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)));

    // Process class stats
    const classMap = new Map<string, ClassStats>();
    reports?.forEach((report: any) => {
      const key = `${report.classes.grade}-${report.classes.stream}`;
      const existing = classMap.get(key) || {
        grade: report.classes.grade,
        stream: report.classes.stream,
        totalReports: 0,
        avgAttendance: 0,
        healthIssues: 0,
        disciplineIssues: 0,
      };
      existing.totalReports += 1;
      existing.avgAttendance =
        (existing.avgAttendance * (existing.totalReports - 1) +
          (report.present_learners / report.total_learners) * 100) /
        existing.totalReports;
      if (report.health_incident) existing.healthIssues += 1;
      if (report.discipline_issue) existing.disciplineIssues += 1;
      classMap.set(key, existing);
    });
    setClassStats(Array.from(classMap.values()).sort((a, b) => a.grade.localeCompare(b.grade)));

    // Calculate overall stats
    const totalStudents = reports?.reduce((sum, r) => sum + r.total_learners, 0) || 0;
    const presentStudents = reports?.reduce((sum, r) => sum + r.present_learners, 0) || 0;
    const avgAttendance = totalStudents > 0 ? Math.round((presentStudents / totalStudents) * 100) : 0;

    setOverallStats({
      totalTeachers: teachersCount || 0,
      totalClasses: classesCount || 0,
      avgAttendance,
      totalReportsThisWeek: reports?.length || 0,
    });

    setLoading(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Director Dashboard
          </h1>
          <p className="mt-1 text-gray-600">
            School-wide analytics and insights
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent text-sm"
          />
          <span className="self-center text-gray-500">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent text-sm"
          />
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-5 text-white">
          <p className="text-blue-100 text-sm font-medium">Total Teachers</p>
          <p className="text-3xl font-bold mt-1">{overallStats.totalTeachers}</p>
          <p className="text-blue-100 text-xs mt-2">Active in system</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-5 text-white">
          <p className="text-purple-100 text-sm font-medium">Total Classes</p>
          <p className="text-3xl font-bold mt-1">{overallStats.totalClasses}</p>
          <p className="text-purple-100 text-xs mt-2">Across all grades</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-5 text-white">
          <p className="text-green-100 text-sm font-medium">Avg Attendance</p>
          <p className="text-3xl font-bold mt-1">{overallStats.avgAttendance}%</p>
          <p className="text-green-100 text-xs mt-2">This period</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-5 text-white">
          <p className="text-orange-100 text-sm font-medium">Reports Filed</p>
          <p className="text-3xl font-bold mt-1">{overallStats.totalReportsThisWeek}</p>
          <p className="text-orange-100 text-xs mt-2">In selected period</p>
        </div>
      </div>

      {/* Attendance Trend Chart */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📈 Daily Attendance Trend</h2>
        {weeklyData.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No data for selected period</p>
        ) : (
          <div className="space-y-3">
            {weeklyData.map((day) => {
              const percentage = day.totalStudents > 0
                ? Math.round((day.presentStudents / day.totalStudents) * 100)
                : 0;
              return (
                <div key={day.date} className="flex items-center gap-4">
                  <div className="w-24 text-sm text-gray-600">
                    {new Date(day.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        percentage >= 90
                          ? "bg-green-500"
                          : percentage >= 75
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-800">
                      {percentage}% ({day.presentStudents}/{day.totalStudents})
                    </span>
                  </div>
                  <div className="w-20 text-right text-sm text-gray-500">
                    {day.reportsCount} reports
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Class Performance Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">🏫 Class Performance Summary</h2>
        </div>

        {classStats.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No class data for selected period</p>
        ) : (
          <>
            {/* Mobile View */}
            <div className="sm:hidden">
              {classStats.map((cls) => (
                <div key={`${cls.grade}-${cls.stream}`} className="p-4 border-b border-gray-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{cls.grade} - {cls.stream}</h3>
                      <p className="text-sm text-gray-500">{cls.totalReports} reports</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${cls.avgAttendance >= 90 ? "text-green-600" : cls.avgAttendance >= 75 ? "text-yellow-600" : "text-red-600"}`}>
                        {Math.round(cls.avgAttendance)}%
                      </p>
                      <p className="text-xs text-gray-500">attendance</p>
                    </div>
                  </div>
                  {(cls.healthIssues > 0 || cls.disciplineIssues > 0) && (
                    <div className="flex gap-2 mt-2">
                      {cls.healthIssues > 0 && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                          {cls.healthIssues} health
                        </span>
                      )}
                      {cls.disciplineIssues > 0 && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                          {cls.disciplineIssues} discipline
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Class</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reports</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Avg Attendance</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Health Issues</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Discipline Issues</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {classStats.map((cls) => (
                    <tr key={`${cls.grade}-${cls.stream}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {cls.grade} - {cls.stream}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{cls.totalReports}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                cls.avgAttendance >= 90
                                  ? "bg-green-500"
                                  : cls.avgAttendance >= 75
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                              }`}
                              style={{ width: `${Math.min(cls.avgAttendance, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{Math.round(cls.avgAttendance)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {cls.healthIssues > 0 ? (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                            {cls.healthIssues}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {cls.disciplineIssues > 0 ? (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                            {cls.disciplineIssues}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/reports/history"
          className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow flex items-center gap-4"
        >
          <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <span className="text-2xl">📚</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">View All Reports</h3>
            <p className="text-sm text-gray-500">Browse and search report history</p>
          </div>
        </Link>

        <Link
          href="/admin/users"
          className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow flex items-center gap-4"
        >
          <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <span className="text-2xl">👥</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Manage Staff</h3>
            <p className="text-sm text-gray-500">View and manage teachers</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
