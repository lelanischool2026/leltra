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
  health_details: string | null;
  discipline_issue: boolean;
  discipline_details: string | null;
  parent_communication: boolean;
  challenges: string | null;
  classes: { grade: string; stream: string };
  profiles: { full_name: string };
  head_comments: { id: string; comment: string }[];
  flagged?: boolean;
}

interface DailyStats {
  totalReports: number;
  totalStudents: number;
  presentStudents: number;
  absentStudents: number;
  healthIssues: number;
  disciplineIssues: number;
  classesReported: number;
  totalClasses: number;
}

export default function HeadteacherDashboard() {
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportWithDetails | null>(null);
  const [comment, setComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "issues" | "pending">("all");

  useEffect(() => {
    loadDashboardData();
  }, [selectedDate]);

  const loadDashboardData = async () => {
    setLoading(true);

    // Get total classes count
    const { count: totalClasses } = await supabase
      .from("classes")
      .select("*", { count: "exact", head: true })
      .eq("active", true);

    // Get reports for selected date with all related data
    const { data: reportsData } = await supabase
      .from("daily_reports")
      .select(`
        *,
        classes(grade, stream),
        profiles(full_name),
        head_comments(id, comment)
      `)
      .eq("report_date", selectedDate)
      .order("created_at", { ascending: false });

    const reports = (reportsData as ReportWithDetails[]) || [];

    // Calculate stats
    const totalStudents = reports.reduce((sum, r) => sum + r.total_learners, 0);
    const presentStudents = reports.reduce((sum, r) => sum + r.present_learners, 0);
    const healthIssues = reports.filter((r) => r.health_incident).length;
    const disciplineIssues = reports.filter((r) => r.discipline_issue).length;

    setStats({
      totalReports: reports.length,
      totalStudents,
      presentStudents,
      absentStudents: totalStudents - presentStudents,
      healthIssues,
      disciplineIssues,
      classesReported: reports.length,
      totalClasses: totalClasses || 0,
    });

    setReports(reports);
    setLoading(false);
  };

  const handleAddComment = async () => {
    if (!selectedReport || !comment.trim()) return;
    setSubmittingComment(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("head_comments").insert({
      report_id: selectedReport.id,
      headteacher_id: user?.id,
      comment: comment.trim(),
    });

    if (!error) {
      setComment("");
      loadDashboardData();
      // Update local state
      setSelectedReport({
        ...selectedReport,
        head_comments: [
          ...selectedReport.head_comments,
          { id: "new", comment: comment.trim() },
        ],
      });
    }

    setSubmittingComment(false);
  };

  const filteredReports = reports.filter((report) => {
    if (filterStatus === "issues") {
      return report.health_incident || report.discipline_issue;
    }
    if (filterStatus === "pending") {
      return report.head_comments.length === 0;
    }
    return true;
  });

  const getAttendancePercentage = () => {
    if (!stats || stats.totalStudents === 0) return 0;
    return Math.round((stats.presentStudents / stats.totalStudents) * 100);
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
            Headteacher Dashboard
          </h1>
          <p className="mt-1 text-gray-600">
            Monitor daily reports and provide feedback
          </p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500 font-medium">Reports Submitted</p>
              <p className="text-2xl sm:text-3xl font-bold text-primary mt-1">
                {stats?.classesReported}/{stats?.totalClasses}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📋</span>
            </div>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{
                  width: `${stats?.totalClasses ? (stats.classesReported / stats.totalClasses) * 100 : 0}%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500 font-medium">Attendance Rate</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1">
                {getAttendancePercentage()}%
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {stats?.presentStudents} of {stats?.totalStudents} present
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500 font-medium">Health Issues</p>
              <p className={`text-2xl sm:text-3xl font-bold mt-1 ${stats?.healthIssues ? "text-yellow-600" : "text-green-600"}`}>
                {stats?.healthIssues || 0}
              </p>
            </div>
            <div className={`h-12 w-12 ${stats?.healthIssues ? "bg-yellow-100" : "bg-green-100"} rounded-full flex items-center justify-center`}>
              <span className="text-2xl">{stats?.healthIssues ? "⚠️" : "💚"}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Classes with health incidents</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500 font-medium">Discipline Issues</p>
              <p className={`text-2xl sm:text-3xl font-bold mt-1 ${stats?.disciplineIssues ? "text-red-600" : "text-green-600"}`}>
                {stats?.disciplineIssues || 0}
              </p>
            </div>
            <div className={`h-12 w-12 ${stats?.disciplineIssues ? "bg-red-100" : "bg-green-100"} rounded-full flex items-center justify-center`}>
              <span className="text-2xl">{stats?.disciplineIssues ? "🚨" : "😊"}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Classes with discipline issues</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {[
          { key: "all", label: "All Reports", count: reports.length },
          { key: "issues", label: "⚠️ Issues", count: reports.filter(r => r.health_incident || r.discipline_issue).length },
          { key: "pending", label: "📝 Needs Review", count: reports.filter(r => r.head_comments.length === 0).length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key as any)}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
              filterStatus === tab.key
                ? "bg-accent text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <p className="text-gray-500 text-lg">
            {reports.length === 0
              ? `No reports submitted for ${selectedDate}`
              : "No reports match the selected filter"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className={`bg-white rounded-xl shadow-md overflow-hidden transition-all hover:shadow-lg ${
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
                      {report.head_comments.length > 0 && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          ✓ Reviewed
                        </span>
                      )}
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
                    <p className="text-sm text-gray-500 mt-1">
                      Teacher: {report.profiles.full_name}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">
                        {report.present_learners}/{report.total_learners}
                      </p>
                      <p className="text-xs text-gray-500">Present</p>
                    </div>
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors text-sm font-medium"
                    >
                      View & Comment
                    </button>
                  </div>
                </div>

                {/* Quick Preview of Issues */}
                {(report.health_incident || report.discipline_issue || report.challenges) && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                    {report.health_incident && report.health_details && (
                      <p className="text-sm text-yellow-700 bg-yellow-50 px-3 py-2 rounded-lg">
                        <strong>Health:</strong> {report.health_details}
                      </p>
                    )}
                    {report.discipline_issue && report.discipline_details && (
                      <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">
                        <strong>Discipline:</strong> {report.discipline_details}
                      </p>
                    )}
                    {report.challenges && (
                      <p className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                        <strong>Challenges:</strong> {report.challenges}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setSelectedReport(null)}
            ></div>

            <div className="relative inline-block w-full max-w-2xl p-6 my-8 text-left align-middle bg-white shadow-xl rounded-2xl transform transition-all max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedReport.classes.grade} - {selectedReport.classes.stream}
                  </h3>
                  <p className="text-gray-500">
                    {selectedReport.profiles.full_name} • {selectedReport.report_date}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Attendance Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4">
                <h4 className="font-semibold text-gray-800 mb-3">📊 Attendance</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-3xl font-bold text-primary">{selectedReport.total_learners}</p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-green-600">{selectedReport.present_learners}</p>
                    <p className="text-xs text-gray-500">Present</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-red-600">
                      {selectedReport.total_learners - selectedReport.present_learners}
                    </p>
                    <p className="text-xs text-gray-500">Absent</p>
                  </div>
                </div>
              </div>

              {/* Issues Section */}
              <div className="space-y-3 mb-4">
                {selectedReport.health_incident && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <h4 className="font-semibold text-yellow-800 flex items-center gap-2">
                      ⚠️ Health Issue Reported
                    </h4>
                    <p className="text-yellow-700 mt-1">
                      {selectedReport.health_details || "No details provided"}
                    </p>
                  </div>
                )}

                {selectedReport.discipline_issue && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <h4 className="font-semibold text-red-800 flex items-center gap-2">
                      🚨 Discipline Issue Reported
                    </h4>
                    <p className="text-red-700 mt-1">
                      {selectedReport.discipline_details || "No details provided"}
                    </p>
                  </div>
                )}

                {selectedReport.parent_communication && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h4 className="font-semibold text-blue-800 flex items-center gap-2">
                      📞 Parent Communication
                    </h4>
                    <p className="text-blue-700 mt-1">
                      {(selectedReport as any).parent_details || "Parent was contacted"}
                    </p>
                  </div>
                )}

                {selectedReport.challenges && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-800">💭 Challenges</h4>
                    <p className="text-gray-600 mt-1">{selectedReport.challenges}</p>
                  </div>
                )}
              </div>

              {/* Previous Comments */}
              {selectedReport.head_comments.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Previous Comments</h4>
                  <div className="space-y-2">
                    {selectedReport.head_comments.map((c, index) => (
                      <div key={c.id || index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-green-800 text-sm">{c.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Comment Section */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-semibold text-gray-800 mb-2">Add Comment / Feedback</h4>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Write your feedback or instructions for the teacher..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent resize-none"
                />
                <div className="flex justify-end gap-3 mt-3">
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleAddComment}
                    disabled={!comment.trim() || submittingComment}
                    className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark font-medium transition-colors disabled:opacity-50"
                  >
                    {submittingComment ? "Submitting..." : "Submit Comment"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
