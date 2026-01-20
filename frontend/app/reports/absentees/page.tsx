"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";

interface AbsenteeRecord {
  studentName: string;
  absenceCount: number;
  lastAbsence: string;
  classes: string[];
  dates: string[];
}

interface AbsenteeAlert {
  studentName: string;
  absenceCount: number;
  className: string;
  alertLevel: "warning" | "critical";
  dates: string[];
}

export default function AbsenteesPage() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "term">("week");
  const [absenteeRecords, setAbsenteeRecords] = useState<AbsenteeRecord[]>([]);
  const [alerts, setAlerts] = useState<AbsenteeAlert[]>([]);
  const [threshold, setThreshold] = useState(2); // Alert threshold
  const [searchQuery, setSearchQuery] = useState("");

  const router = useRouter();

  useEffect(() => {
    checkAuthAndLoad();
  }, [timeRange, threshold]);

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

    await loadAbsenteeData();
  }

  async function loadAbsenteeData() {
    setLoading(true);

    // Calculate date range
    let startDate: string;
    const endDate = format(new Date(), "yyyy-MM-dd");

    switch (timeRange) {
      case "week":
        startDate = format(
          startOfWeek(new Date(), { weekStartsOn: 1 }),
          "yyyy-MM-dd",
        );
        break;
      case "month":
        startDate = format(startOfMonth(new Date()), "yyyy-MM-dd");
        break;
      case "term":
        startDate = format(subDays(new Date(), 90), "yyyy-MM-dd"); // Approx 3 months
        break;
      default:
        startDate = format(subDays(new Date(), 7), "yyyy-MM-dd");
    }

    // Fetch all reports with absentees
    const { data: reports } = await supabase
      .from("daily_reports")
      .select(
        `
        report_date,
        absentees,
        classes(grade, stream)
      `,
      )
      .gte("report_date", startDate)
      .lte("report_date", endDate)
      .not("absentees", "is", null)
      .not("absentees", "eq", "");

    if (!reports) {
      setLoading(false);
      return;
    }

    // Parse absentee names and count occurrences
    const absenteeMap = new Map<
      string,
      {
        count: number;
        lastAbsence: string;
        classes: Set<string>;
        dates: string[];
      }
    >();

    reports.forEach((report: any) => {
      if (!report.absentees) return;

      // Split by common delimiters (comma, newline, semicolon)
      const names = report.absentees
        .split(/[,;\n]+/)
        .map((name: string) => name.trim().toLowerCase())
        .filter((name: string) => name.length > 0);

      const className = report.classes
        ? `${report.classes.grade} - ${report.classes.stream}`
        : "Unknown";

      names.forEach((name: string) => {
        // Normalize the name for better matching
        const normalizedName = name
          .replace(/\s+/g, " ")
          .trim()
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        if (!absenteeMap.has(normalizedName)) {
          absenteeMap.set(normalizedName, {
            count: 0,
            lastAbsence: report.report_date,
            classes: new Set(),
            dates: [],
          });
        }

        const record = absenteeMap.get(normalizedName)!;
        record.count++;
        record.classes.add(className);
        record.dates.push(report.report_date);
        if (report.report_date > record.lastAbsence) {
          record.lastAbsence = report.report_date;
        }
      });
    });

    // Convert to array and sort by absence count
    const records: AbsenteeRecord[] = Array.from(absenteeMap.entries())
      .map(([name, data]) => ({
        studentName: name,
        absenceCount: data.count,
        lastAbsence: data.lastAbsence,
        classes: Array.from(data.classes),
        dates: data.dates.sort(),
      }))
      .sort((a, b) => b.absenceCount - a.absenceCount);

    setAbsenteeRecords(records);

    // Generate alerts for students exceeding threshold
    const alertRecords: AbsenteeAlert[] = records
      .filter((r) => r.absenceCount >= threshold)
      .map((r) => ({
        studentName: r.studentName,
        absenceCount: r.absenceCount,
        className: r.classes[0] || "Unknown",
        alertLevel: r.absenceCount >= threshold * 2 ? "critical" : "warning",
        dates: r.dates,
      }));

    setAlerts(alertRecords);
    setLoading(false);
  }

  // Filter records by search query
  const filteredRecords = absenteeRecords.filter((r) =>
    r.studentName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  function handleExportCSV() {
    let csv = "Frequent Absentee Report\n";
    csv += `Period: ${timeRange === "week" ? "This Week" : timeRange === "month" ? "This Month" : "This Term"}\n`;
    csv += `Threshold: ${threshold}+ absences\n\n`;

    csv += "Student Name,Absence Count,Last Absence,Classes,Dates\n";
    absenteeRecords.forEach((r) => {
      csv += `"${r.studentName}",${r.absenceCount},${r.lastAbsence},"${r.classes.join("; ")}","${r.dates.join("; ")}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `absentee_report_${format(new Date(), "yyyy-MM-dd")}.csv`;
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
              <h1 className="text-2xl font-bold text-gray-900">
                Frequent Absentees
              </h1>
              <p className="text-gray-600 mt-1">
                Track and monitor student attendance patterns
              </p>
            </div>
            <button
              onClick={handleExportCSV}
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
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export CSV
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerts Banner */}
        {alerts.length > 0 && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-red-600 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <h3 className="font-semibold text-red-800">
                  ⚠️ {alerts.length} Student{alerts.length > 1 ? "s" : ""}{" "}
                  Exceeding Absence Threshold
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  {alerts.filter((a) => a.alertLevel === "critical").length}{" "}
                  critical,{" "}
                  {alerts.filter((a) => a.alertLevel === "warning").length}{" "}
                  warning
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Time Range */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Period
              </label>
              <div className="flex gap-2">
                {[
                  { value: "week", label: "This Week" },
                  { value: "month", label: "This Month" },
                  { value: "term", label: "This Term" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() =>
                      setTimeRange(option.value as typeof timeRange)
                    }
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      timeRange === option.value
                        ? "bg-red-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alert Threshold
              </label>
              <select
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value={2}>2+ absences</option>
                <option value={3}>3+ absences</option>
                <option value={4}>4+ absences</option>
                <option value={5}>5+ absences</option>
              </select>
            </div>

            {/* Search */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Student
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter student name..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-4">
            <p className="text-sm text-gray-500">Total Absentees Tracked</p>
            <p className="text-2xl font-bold text-gray-900">
              {absenteeRecords.length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <p className="text-sm text-gray-500">Above Threshold</p>
            <p className="text-2xl font-bold text-red-600">{alerts.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <p className="text-sm text-gray-500">Critical Alerts</p>
            <p className="text-2xl font-bold text-red-600">
              {alerts.filter((a) => a.alertLevel === "critical").length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <p className="text-sm text-gray-500">Avg Absences</p>
            <p className="text-2xl font-bold text-gray-900">
              {absenteeRecords.length > 0
                ? (
                    absenteeRecords.reduce(
                      (sum, r) => sum + r.absenceCount,
                      0,
                    ) / absenteeRecords.length
                  ).toFixed(1)
                : 0}
            </p>
          </div>
        </div>

        {/* Absentee Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Absentee Records ({filteredRecords.length})
            </h2>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <svg
                className="w-12 h-12 mx-auto text-gray-300 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p>No absentee records found for this period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                      Student
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                      Absences
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                      Class
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                      Last Absence
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRecords.map((record, index) => {
                    const alert = alerts.find(
                      (a) => a.studentName === record.studentName,
                    );
                    return (
                      <tr
                        key={index}
                        className={`hover:bg-gray-50 ${alert ? "bg-red-50" : ""}`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {alert && (
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  alert.alertLevel === "critical"
                                    ? "bg-red-500"
                                    : "bg-yellow-500"
                                }`}
                              ></span>
                            )}
                            <span className="font-medium text-gray-900">
                              {record.studentName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-sm font-medium ${
                              record.absenceCount >= threshold * 2
                                ? "bg-red-100 text-red-800"
                                : record.absenceCount >= threshold
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-green-100 text-green-800"
                            }`}
                          >
                            {record.absenceCount}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {record.classes.join(", ")}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {format(new Date(record.lastAbsence), "MMM d, yyyy")}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {alert ? (
                            <span
                              className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                                alert.alertLevel === "critical"
                                  ? "bg-red-600 text-white"
                                  : "bg-yellow-500 text-white"
                              }`}
                            >
                              {alert.alertLevel.toUpperCase()}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">
                              Normal
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/dashboard/headteacher"
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
