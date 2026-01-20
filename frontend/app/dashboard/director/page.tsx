"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

interface DailyStats {
  date: string;
  displayDate: string;
  totalStudents: number;
  presentStudents: number;
  absentStudents: number;
  attendanceRate: number;
  reportsCount: number;
  healthIssues: number;
  disciplineIssues: number;
}

interface ClassStats {
  id: string;
  name: string;
  grade: string;
  stream: string;
  totalReports: number;
  avgAttendance: number;
  healthIssues: number;
  disciplineIssues: number;
  totalStudents: number;
}

interface IncidentData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

type TimeRange = "week" | "month" | "custom";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

export default function DirectorDashboard() {
  const [loading, setLoading] = useState(true);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [classStats, setClassStats] = useState<ClassStats[]>([]);
  const [incidentData, setIncidentData] = useState<IncidentData[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [overallStats, setOverallStats] = useState({
    totalTeachers: 0,
    totalClasses: 0,
    totalStudents: 0,
    avgAttendance: 0,
    totalReports: 0,
    healthIncidents: 0,
    disciplineIncidents: 0,
    parentCommunications: 0,
  });
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 7), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
  });
  const [activeTab, setActiveTab] = useState<"overview" | "attendance" | "incidents" | "classes">("overview");

  useEffect(() => {
    updateDateRange(timeRange);
  }, [timeRange]);

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const updateDateRange = (range: TimeRange) => {
    const today = new Date();
    let start: Date, end: Date;

    switch (range) {
      case "week":
        start = startOfWeek(today, { weekStartsOn: 1 });
        end = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case "month":
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      default:
        return;
    }

    setDateRange({
      start: format(start, "yyyy-MM-dd"),
      end: format(end, "yyyy-MM-dd"),
    });
  };

  const loadDashboardData = async () => {
    setLoading(true);

    try {
      // Get teachers count
      const { count: teachersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "teacher");

      // Get active classes count
      const { count: classesCount } = await supabase
        .from("classes")
        .select("*", { count: "exact", head: true })
        .eq("active", true);

      // Get reports for date range
      const { data: reports } = await supabase
        .from("daily_reports")
        .select(`
          *,
          classes(id, grade, stream)
        `)
        .gte("report_date", dateRange.start)
        .lte("report_date", dateRange.end)
        .order("report_date", { ascending: true });

      if (reports) {
        // Process daily stats for charts
        const dailyMap = new Map<string, DailyStats>();
        
        reports.forEach((report: any) => {
          const date = report.report_date;
          const existing = dailyMap.get(date) || {
            date,
            displayDate: format(new Date(date), "MMM dd"),
            totalStudents: 0,
            presentStudents: 0,
            absentStudents: 0,
            attendanceRate: 0,
            reportsCount: 0,
            healthIssues: 0,
            disciplineIssues: 0,
          };
          
          existing.totalStudents += report.total_learners;
          existing.presentStudents += report.present_learners;
          existing.absentStudents += (report.total_learners - report.present_learners);
          existing.reportsCount += 1;
          if (report.health_incident) existing.healthIssues += 1;
          if (report.discipline_issue) existing.disciplineIssues += 1;
          
          dailyMap.set(date, existing);
        });

        // Calculate attendance rates
        const dailyStatsArray = Array.from(dailyMap.values()).map(day => ({
          ...day,
          attendanceRate: day.totalStudents > 0 
            ? Math.round((day.presentStudents / day.totalStudents) * 100) 
            : 0
        }));
        setDailyStats(dailyStatsArray);

        // Process class stats
        const classMap = new Map<string, ClassStats>();
        
        reports.forEach((report: any) => {
          const classId = report.classes.id;
          const existing = classMap.get(classId) || {
            id: classId,
            name: `${report.classes.grade} - ${report.classes.stream}`,
            grade: report.classes.grade,
            stream: report.classes.stream,
            totalReports: 0,
            avgAttendance: 0,
            healthIssues: 0,
            disciplineIssues: 0,
            totalStudents: 0,
          };
          
          existing.totalReports += 1;
          existing.totalStudents += report.total_learners;
          existing.avgAttendance += (report.present_learners / report.total_learners) * 100;
          if (report.health_incident) existing.healthIssues += 1;
          if (report.discipline_issue) existing.disciplineIssues += 1;
          
          classMap.set(classId, existing);
        });

        // Calculate averages for classes
        const classStatsArray = Array.from(classMap.values()).map(cls => ({
          ...cls,
          avgAttendance: cls.totalReports > 0 
            ? Math.round(cls.avgAttendance / cls.totalReports) 
            : 0
        })).sort((a, b) => a.name.localeCompare(b.name));
        setClassStats(classStatsArray);

        // Calculate incident data for pie chart
        const totalHealth = reports.filter((r: any) => r.health_incident).length;
        const totalDiscipline = reports.filter((r: any) => r.discipline_issue).length;
        const totalParent = reports.filter((r: any) => r.parent_communication).length;
        
        setIncidentData([
          { name: "Health Issues", value: totalHealth, color: "#FFBB28" },
          { name: "Discipline Issues", value: totalDiscipline, color: "#FF8042" },
          { name: "Parent Communications", value: totalParent, color: "#00C49F" },
        ]);

        // Calculate overall stats
        const totalStudents = reports.reduce((sum: number, r: any) => sum + r.total_learners, 0);
        const totalPresent = reports.reduce((sum: number, r: any) => sum + r.present_learners, 0);
        
        setOverallStats({
          totalTeachers: teachersCount || 0,
          totalClasses: classesCount || 0,
          totalStudents: Math.round(totalStudents / (reports.length || 1)),
          avgAttendance: totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0,
          totalReports: reports.length,
          healthIncidents: totalHealth,
          disciplineIncidents: totalDiscipline,
          parentCommunications: totalParent,
        });
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }

    setLoading(false);
  };

  const exportToCSV = () => {
    const headers = ["Date", "Total Students", "Present", "Absent", "Attendance Rate", "Health Issues", "Discipline Issues"];
    const rows = dailyStats.map(day => [
      day.date,
      day.totalStudents,
      day.presentStudents,
      day.absentStudents,
      `${day.attendanceRate}%`,
      day.healthIssues,
      day.disciplineIssues,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_report_${dateRange.start}_to_${dateRange.end}.csv`;
    link.click();
  };

  const exportClassStatsToCSV = () => {
    const headers = ["Class", "Total Reports", "Avg Attendance %", "Health Issues", "Discipline Issues"];
    const rows = classStats.map(cls => [
      cls.name,
      cls.totalReports,
      `${cls.avgAttendance}%`,
      cls.healthIssues,
      cls.disciplineIssues,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `class_performance_${dateRange.start}_to_${dateRange.end}.csv`;
    link.click();
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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Director Analytics Dashboard
          </h1>
          <p className="mt-1 text-gray-600">
            School-wide performance insights and trends
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex rounded-lg bg-gray-100 p-1">
            {(["week", "month", "custom"] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  timeRange === range
                    ? "bg-white text-accent shadow"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
          {timeRange === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          )}

          {/* Export Button */}
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {[
          { id: "overview", label: "Overview" },
          { id: "attendance", label: "Attendance" },
          { id: "incidents", label: "Incidents" },
          { id: "classes", label: "Classes" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-white text-accent shadow"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
              <p className="text-blue-100 text-sm">Total Teachers</p>
              <p className="text-3xl font-bold mt-1">{overallStats.totalTeachers}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
              <p className="text-purple-100 text-sm">Active Classes</p>
              <p className="text-3xl font-bold mt-1">{overallStats.totalClasses}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
              <p className="text-green-100 text-sm">Avg Attendance</p>
              <p className="text-3xl font-bold mt-1">{overallStats.avgAttendance}%</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white">
              <p className="text-amber-100 text-sm">Reports This Period</p>
              <p className="text-3xl font-bold mt-1">{overallStats.totalReports}</p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-md p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Health Incidents</p>
                  <p className="text-2xl font-bold text-yellow-600">{overallStats.healthIncidents}</p>
                </div>
                <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🏥</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Discipline Issues</p>
                  <p className="text-2xl font-bold text-red-600">{overallStats.disciplineIncidents}</p>
                </div>
                <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">⚠️</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Parent Communications</p>
                  <p className="text-2xl font-bold text-green-600">{overallStats.parentCommunications}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">👥</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mini Attendance Chart */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Overview</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyStats}>
                  <defs>
                    <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="displayDate" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, "Attendance Rate"]}
                    contentStyle={{ borderRadius: "8px" }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="attendanceRate" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    fill="url(#colorAttendance)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Trends Tab */}
      {activeTab === "attendance" && (
        <div className="space-y-6">
          {/* Attendance Rate Chart */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Attendance Rate</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="displayDate" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === "attendanceRate") return [`${value}%`, "Attendance Rate"];
                      return [value, name];
                    }}
                    contentStyle={{ borderRadius: "8px" }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="attendanceRate" 
                    name="Attendance Rate"
                    stroke="#10B981" 
                    strokeWidth={3}
                    dot={{ fill: "#10B981", strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Present vs Absent Chart */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Present vs Absent Students</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="displayDate" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: "8px" }} />
                  <Legend />
                  <Bar dataKey="presentStudents" name="Present" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absentStudents" name="Absent" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Reports Submitted Chart */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Reports Submitted</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="displayDate" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: "8px" }} />
                  <Bar dataKey="reportsCount" name="Reports" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Incidents Tab */}
      {activeTab === "incidents" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Incident Distribution Pie Chart */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Incident Distribution</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={incidentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {incidentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Incident Summary Cards */}
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-yellow-800">Health Incidents</h4>
                    <p className="text-3xl font-bold text-yellow-600 mt-2">{overallStats.healthIncidents}</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      {overallStats.totalReports > 0 
                        ? `${(overallStats.healthIncidents / overallStats.totalReports * 100).toFixed(1)}% of reports`
                        : "No data"}
                    </p>
                  </div>
                  <span className="text-4xl">🏥</span>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-red-800">Discipline Issues</h4>
                    <p className="text-3xl font-bold text-red-600 mt-2">{overallStats.disciplineIncidents}</p>
                    <p className="text-sm text-red-700 mt-1">
                      {overallStats.totalReports > 0 
                        ? `${(overallStats.disciplineIncidents / overallStats.totalReports * 100).toFixed(1)}% of reports`
                        : "No data"}
                    </p>
                  </div>
                  <span className="text-4xl">⚠️</span>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-green-800">Parent Communications</h4>
                    <p className="text-3xl font-bold text-green-600 mt-2">{overallStats.parentCommunications}</p>
                    <p className="text-sm text-green-700 mt-1">
                      {overallStats.totalReports > 0 
                        ? `${(overallStats.parentCommunications / overallStats.totalReports * 100).toFixed(1)}% of reports`
                        : "No data"}
                    </p>
                  </div>
                  <span className="text-4xl">👥</span>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Incidents Chart */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Incidents Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="displayDate" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: "8px" }} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="healthIssues" 
                    name="Health Issues"
                    stroke="#FFBB28" 
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="disciplineIssues" 
                    name="Discipline Issues"
                    stroke="#FF8042" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Class Performance Tab */}
      {activeTab === "classes" && (
        <div className="space-y-6">
          {/* Export Button */}
          <div className="flex justify-end">
            <button
              onClick={exportClassStatsToCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Class Data
            </button>
          </div>

          {/* Class Attendance Comparison */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Class Attendance Comparison</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, "Avg Attendance"]}
                    contentStyle={{ borderRadius: "8px" }}
                  />
                  <Bar dataKey="avgAttendance" fill="#10B981" radius={[0, 4, 4, 0]}>
                    {classStats.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.avgAttendance >= 90 ? "#10B981" : entry.avgAttendance >= 75 ? "#FBBF24" : "#EF4444"} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Class Performance Table */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Class Performance Details</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Class</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reports</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Attendance</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Health</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Discipline</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {classStats.map((cls) => (
                    <tr key={cls.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{cls.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{cls.totalReports}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className={`h-2 rounded-full ${
                                cls.avgAttendance >= 90 ? "bg-green-500" : 
                                cls.avgAttendance >= 75 ? "bg-yellow-500" : "bg-red-500"
                              }`}
                              style={{ width: `${cls.avgAttendance}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{cls.avgAttendance}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {cls.healthIssues > 0 ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                            {cls.healthIssues}
                          </span>
                        ) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {cls.disciplineIssues > 0 ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            {cls.disciplineIssues}
                          </span>
                        ) : <span className="text-gray-400">-</span>}
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
        </div>
      )}

      {/* Quick Links */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/reports/history" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center">
            <span className="text-2xl mb-2 block">📋</span>
            <span className="text-sm font-medium text-gray-700">View All Reports</span>
          </Link>
          <Link href="/admin/users" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center">
            <span className="text-2xl mb-2 block">👥</span>
            <span className="text-sm font-medium text-gray-700">Manage Users</span>
          </Link>
          <Link href="/admin/classes" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center">
            <span className="text-2xl mb-2 block">🏫</span>
            <span className="text-sm font-medium text-gray-700">Manage Classes</span>
          </Link>
          <Link href="/reports/weekly-summary" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center">
            <span className="text-2xl mb-2 block">📊</span>
            <span className="text-sm font-medium text-gray-700">Weekly Summary</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
