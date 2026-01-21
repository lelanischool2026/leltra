"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getCachedSession, getCachedData } from "@/lib/session-cache";
import { useRouter } from "next/navigation";
import { Class, DailyReport } from "@/lib/types";
import { DashboardSkeleton } from "@/components/loading";

interface TeacherProfile {
  full_name: string;
  role: string;
}

interface HeadComment {
  id: string;
  comment: string;
  created_at: string;
  report_date: string;
  author_name: string;
}

export default function TeacherDashboard() {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [myClass, setMyClass] = useState<Class | null>(null);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [headComments, setHeadComments] = useState<HeadComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReports: 0,
    avgAttendance: 0,
    healthIncidents: 0,
    disciplineIncidents: 0,
  });
  const router = useRouter();

  const loadTeacherData = useCallback(async () => {
    try {
      // Use cached session for faster auth check
      const session = await getCachedSession();
      if (!session.user) {
        router.push("/auth/login");
        return;
      }

      // Set profile immediately from cache
      if (session.profile) {
        setProfile({
          full_name: session.profile.full_name,
          role: session.profile.role,
        });
      }
      setLoading(false);

      // Load class data (can be cached)
      const teacherClass = await getCachedData(
        `teacher_class_${session.user.id}`,
        async () => {
          const { data } = await supabase
            .from("teacher_classes")
            .select("class_id, classes(*)")
            .eq("teacher_id", session.user!.id)
            .single();
          return data;
        }
      );

      if (teacherClass) {
        setMyClass(teacherClass.classes as unknown as Class);

        // Load reports and stats in parallel
        const [allReports, recentReports] = await Promise.all([
          supabase
            .from("daily_reports")
            .select("*")
            .eq("class_id", teacherClass.class_id),
          supabase
            .from("daily_reports")
            .select("*")
            .eq("class_id", teacherClass.class_id)
            .order("report_date", { ascending: false })
            .limit(7),
        ]);

        if (allReports.data && allReports.data.length > 0) {
          const totalPresent = allReports.data.reduce(
            (sum, r) => sum + (r.present_learners || 0),
            0,
          );
          const totalLearners = allReports.data.reduce(
            (sum, r) => sum + (r.total_learners || 0),
            0,
          );
          const healthCount = allReports.data.filter(
            (r) => r.health_incident
          ).length;
          const disciplineCount = allReports.data.filter(
            (r) => r.discipline_issue
          ).length;

          setStats({
            totalReports: allReports.data.length,
            avgAttendance:
              totalLearners > 0
                ? Math.round((totalPresent / totalLearners) * 100)
                : 0,
            healthIncidents: healthCount,
            disciplineIncidents: disciplineCount,
          });
        }

        if (recentReports.data) {
          setReports(recentReports.data);

          // Get headteacher comments for these reports
          const reportIds = recentReports.data.map((r) => r.id);
          if (reportIds.length > 0) {
            const { data: commentsData } = await supabase
              .from("head_comments")
              .select(
                `
              id,
              comment,
              created_at,
              daily_reports!inner(report_date),
              profiles!head_comments_author_id_fkey(full_name)
            `,
              )
              .in("report_id", reportIds)
              .order("created_at", { ascending: false })
              .limit(5);

            if (commentsData) {
              const formattedComments: HeadComment[] = commentsData.map(
                (c: any) => ({
                  id: c.id,
                  comment: c.comment,
                  created_at: c.created_at,
                  report_date: c.daily_reports?.report_date || "",
                  author_name: c.profiles?.full_name || "Headteacher",
                }),
              );
              setHeadComments(formattedComments);
            }
          }
        }
      }
      setDataLoading(false);
    } catch (error) {
      console.error("Error loading teacher data:", error);
      setLoading(false);
      setDataLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadTeacherData();
  }, [loadTeacherData]);

  const getTodayDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  const hasTodayReport = () => {
    const today = getTodayDate();
    return reports.some((report) => report.report_date === today);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!myClass) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-yellow-600"
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
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No Class Assigned
          </h2>
          <p className="text-gray-600 mb-6">
            You haven't been assigned to a class yet. Please contact the school
            administrator.
          </p>
          <button
            onClick={() =>
              supabase.auth.signOut().then(() => router.push("/auth/login"))
            }
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-600 to-red-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-red-200 text-sm font-medium">
                {getGreeting()}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold mt-1">
                {profile?.full_name || "Teacher"}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 backdrop-blur-sm">
                  📚 {myClass.grade} - {myClass.stream}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/reports/history")}
                className="px-4 py-2.5 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 font-medium transition-all border border-white/20"
              >
                📋 View History
              </button>
              <button
                onClick={() =>
                  supabase.auth.signOut().then(() => router.push("/auth/login"))
                }
                className="px-4 py-2.5 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 font-medium transition-all border border-white/20"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Today's Report Card */}
        <div
          className={`rounded-2xl shadow-lg p-6 sm:p-8 mb-6 ${
            hasTodayReport()
              ? "bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200"
              : "bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                  hasTodayReport() ? "bg-green-500" : "bg-amber-500"
                }`}
              >
                {hasTodayReport() ? (
                  <svg
                    className="w-7 h-7 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-7 h-7 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
              </div>
              <div>
                <h2
                  className={`text-xl font-bold ${hasTodayReport() ? "text-green-800" : "text-amber-800"}`}
                >
                  {hasTodayReport()
                    ? "Today's Report Submitted! ✓"
                    : "Daily Report Pending"}
                </h2>
                <p
                  className={`mt-1 ${hasTodayReport() ? "text-green-600" : "text-amber-600"}`}
                >
                  {hasTodayReport()
                    ? "Great job! You've submitted your daily report for today."
                    : "Don't forget to submit your daily report before the end of the day."}
                </p>
              </div>
            </div>
            {!hasTodayReport() && (
              <button
                onClick={() => router.push("/reports/new")}
                className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 font-semibold transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Submit Today's Report
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Total Reports
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                  {stats.totalReports}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">All time submissions</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Avg Attendance
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                  {stats.avgAttendance}%
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Class average</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Health Reports
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                  {stats.healthIncidents}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Incidents reported</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Discipline</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                  {stats.disciplineIncidents}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-amber-600"
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
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Issues noted</p>
          </div>
        </div>

        {/* Recent Reports */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Recent Reports
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Your last 7 submissions
              </p>
            </div>
            <button
              onClick={() => router.push("/reports/history")}
              className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
            >
              View All
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          {reports.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                No Reports Yet
              </h3>
              <p className="text-gray-500 mb-6">
                Start by submitting your first daily report
              </p>
              <button
                onClick={() => router.push("/reports/new")}
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
              >
                Submit First Report
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {reports.map((report) => {
                const attendanceRate =
                  report.total_learners > 0
                    ? Math.round(
                        (report.present_learners / report.total_learners) * 100,
                      )
                    : 0;
                const isToday = report.report_date === getTodayDate();

                return (
                  <div
                    key={report.id}
                    className="p-4 sm:p-5 hover:bg-gray-50 cursor-pointer transition-colors group"
                    onClick={() => router.push(`/reports/${report.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isToday
                            ? "bg-green-100 text-green-600"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <span className="text-sm font-bold">
                          {new Date(report.report_date).getDate()}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">
                            {new Date(report.report_date).toLocaleDateString(
                              "en-US",
                              {
                                weekday: "long",
                                month: "short",
                                day: "numeric",
                              },
                            )}
                          </p>
                          {isToday && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              Today
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
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
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            {report.present_learners}/{report.total_learners}{" "}
                            present
                          </span>
                          {report.health_incident && (
                            <span className="flex items-center gap-1 text-red-500">
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
                                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                />
                              </svg>
                              Health
                            </span>
                          )}
                          {report.discipline_issue && (
                            <span className="flex items-center gap-1 text-amber-500">
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
                                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                              </svg>
                              Discipline
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p
                            className={`text-lg font-bold ${
                              attendanceRate >= 90
                                ? "text-green-600"
                                : attendanceRate >= 75
                                  ? "text-amber-600"
                                  : "text-red-600"
                            }`}
                          >
                            {attendanceRate}%
                          </p>
                          <p className="text-xs text-gray-400">attendance</p>
                        </div>
                        <svg
                          className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors"
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
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Headteacher Comments Section */}
        <div className="mt-6 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Headteacher Feedback
                </h2>
                <p className="text-sm text-gray-500">
                  Recent comments on your reports
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {headComments.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium">No comments yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Headteacher feedback will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {headComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">
                          {comment.author_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900">
                            {comment.author_name}
                          </p>
                          <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                            {new Date(comment.report_date).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                              },
                            )}{" "}
                            Report
                          </span>
                        </div>
                        <p className="text-gray-700 mt-2 leading-relaxed">
                          {comment.comment}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(comment.created_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            },
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => router.push("/reports/new")}
            className="p-5 bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl hover:border-red-200 transition-all group text-left"
          >
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-red-200 transition-colors">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">New Report</h3>
            <p className="text-sm text-gray-500 mt-1">Submit a daily report</p>
          </button>

          <button
            onClick={() => router.push("/reports/history")}
            className="p-5 bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all group text-left"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">Report History</h3>
            <p className="text-sm text-gray-500 mt-1">View past submissions</p>
          </button>

          <button
            onClick={() => router.push("/reports/weekly-summary")}
            className="p-5 bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl hover:border-purple-200 transition-all group text-left"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-purple-200 transition-colors">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">Weekly Summary</h3>
            <p className="text-sm text-gray-500 mt-1">View analytics</p>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            Lelani School • Daily Reporting System • {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
