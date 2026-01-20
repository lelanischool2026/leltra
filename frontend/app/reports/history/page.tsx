"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface ReportWithDetails {
  id: string;
  report_date: string;
  total_learners: number;
  present_learners: number;
  health_incident: boolean;
  discipline_issue: boolean;
  challenges: string | null;
  created_at: string;
  classes: { grade: string; stream: string };
  profiles: { full_name: string };
}

export default function ReportHistoryPage() {
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [filters, setFilters] = useState({
    search: "",
    grade: "",
    dateFrom: "",
    dateTo: "",
    hasIssues: false,
  });
  const [grades, setGrades] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    loadUserAndReports();
  }, []);

  useEffect(() => {
    if (userRole) {
      loadReports();
    }
  }, [filters, page, userRole]);

  const loadUserAndReports = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setUserRole(profile?.role || "");
    }

    // Load available grades for filter
    const { data: classes } = await supabase
      .from("classes")
      .select("grade")
      .order("grade");
    const uniqueGrades = Array.from(new Set(classes?.map((c) => c.grade) || []));
    setGrades(uniqueGrades);
  };

  const loadReports = async () => {
    setLoading(true);

    let query = supabase
      .from("daily_reports")
      .select(`
        id,
        report_date,
        total_learners,
        present_learners,
        health_incident,
        discipline_issue,
        challenges,
        created_at,
        classes(grade, stream),
        profiles(full_name)
      `)
      .order("report_date", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    // Apply filters
    if (filters.dateFrom) {
      query = query.gte("report_date", filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte("report_date", filters.dateTo);
    }
    if (filters.hasIssues) {
      query = query.or("health_incident.eq.true,discipline_issue.eq.true");
    }

    const { data } = await query;

    // Map the data to match our interface (Supabase may return nested as objects/arrays)
    let filteredData: ReportWithDetails[] = (data || []).map((r: any) => ({
      id: r.id,
      report_date: r.report_date,
      total_learners: r.total_learners,
      present_learners: r.present_learners,
      health_incident: r.health_incident,
      discipline_issue: r.discipline_issue,
      challenges: r.challenges,
      created_at: r.created_at,
      classes: r.classes,
      profiles: r.profiles
    }));

    // Client-side filtering for grade and search
    if (filters.grade) {
      filteredData = filteredData.filter((r) => r.classes.grade === filters.grade);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredData = filteredData.filter(
        (r) =>
          r.profiles.full_name.toLowerCase().includes(searchLower) ||
          r.classes.stream.toLowerCase().includes(searchLower) ||
          r.classes.grade.toLowerCase().includes(searchLower)
      );
    }

    setReports(filteredData);
    setLoading(false);
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      grade: "",
      dateFrom: "",
      dateTo: "",
      hasIssues: false,
    });
    setPage(1);
  };

  const getAttendanceColor = (present: number, total: number) => {
    const percentage = (present / total) * 100;
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 75) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Report History
            </h1>
            <p className="mt-1 text-gray-600">
              Search and filter through all submitted reports
            </p>
          </div>
          <Link
            href={userRole === "teacher" ? "/dashboard/teacher" : userRole === "headteacher" ? "/dashboard/headteacher" : "/dashboard/director"}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                placeholder="Teacher name, grade, or stream..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
              />
            </div>

            {/* Grade Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grade
              </label>
              <select
                value={filters.grade}
                onChange={(e) => setFilters({ ...filters, grade: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
              >
                <option value="">All Grades</option>
                {grades.map((grade) => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasIssues}
                onChange={(e) => setFilters({ ...filters, hasIssues: e.target.checked })}
                className="w-4 h-4 text-accent focus:ring-accent border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Only show reports with issues</span>
            </label>

            <button
              onClick={clearFilters}
              className="ml-auto px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              Clear Filters
            </button>

            <button
              onClick={() => { setPage(1); loadReports(); }}
              className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors text-sm font-medium"
            >
              Apply Filters
            </button>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <p className="text-gray-500 text-lg">No reports found matching your filters</p>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <p className="text-sm text-gray-500">
              Showing {reports.length} reports
            </p>

            {/* Reports Grid */}
            <div className="grid gap-4">
              {reports.map((report) => (
                <Link
                  key={report.id}
                  href={`/reports/${report.id}`}
                  className={`bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all ${
                    report.health_incident || report.discipline_issue
                      ? "border-l-4 border-yellow-500"
                      : ""
                  }`}
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {report.classes.grade} - {report.classes.stream}
                          </h3>
                          {report.health_incident && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                              Health Issue
                            </span>
                          )}
                          {report.discipline_issue && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                              Discipline Issue
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                          <p className="text-sm text-gray-500">
                            👤 {report.profiles.full_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            📅 {new Date(report.report_date).toLocaleDateString("en-US", {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className={`text-2xl font-bold ${getAttendanceColor(report.present_learners, report.total_learners)}`}>
                            {Math.round((report.present_learners / report.total_learners) * 100)}%
                          </p>
                          <p className="text-xs text-gray-500">
                            {report.present_learners}/{report.total_learners}
                          </p>
                        </div>
                        <div className="text-accent">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 bg-gray-100 rounded-lg">
                Page {page}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={reports.length < pageSize}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
