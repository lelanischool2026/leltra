"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { exportReportToPDF } from "@/lib/pdf-export";

interface ReportDetails {
  id: string;
  report_date: string;
  total_learners: number;
  present_learners: number;
  absentees: string | null;
  health_incident: boolean;
  health_details: string | null;
  feeding_status: string | null;
  lessons_covered: boolean;
  literacy_topic: string | null;
  discipline_issue: boolean;
  discipline_details: string | null;
  parent_communication: boolean;
  parent_details: string | null;
  challenges: string | null;
  created_at: string;
  teacher_id: string;
  classes: { grade: string; stream: string };
  profiles: { full_name: string };
}

interface HeadComment {
  id: string;
  comment: string;
  created_at: string;
  profiles: { full_name: string };
}

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;

  const [report, setReport] = useState<ReportDetails | null>(null);
  const [comments, setComments] = useState<HeadComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<ReportDetails>>({});
  const [saving, setSaving] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const handleExportPDF = () => {
    if (!report) return;

    exportReportToPDF({
      reportDate: report.report_date,
      className: `${report.classes.grade} - ${report.classes.stream}`,
      teacherName: report.profiles.full_name,
      totalLearners: report.total_learners,
      presentLearners: report.present_learners,
      absentees: report.absentees,
      healthIncident: report.health_incident,
      healthDetails: report.health_details,
      feedingStatus: report.feeding_status,
      lessonsCovered: report.lessons_covered,
      literacyTopic: report.literacy_topic,
      disciplineIssue: report.discipline_issue,
      disciplineDetails: report.discipline_details,
      parentCommunication: report.parent_communication,
      parentDetails: report.parent_details,
      challenges: report.challenges,
      comments: comments.map((c) => ({
        author: c.profiles.full_name,
        comment: c.comment,
        date: c.created_at,
      })),
    });
  };

  useEffect(() => {
    loadReportDetails();
  }, [reportId]);

  const loadReportDetails = async () => {
    setLoading(true);

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setUserRole(profile?.role || "");
    }

    // Get report details
    const { data: reportData } = await supabase
      .from("daily_reports")
      .select(
        `
        *,
        classes(grade, stream),
        profiles(full_name)
      `,
      )
      .eq("id", reportId)
      .single();

    if (reportData) {
      setReport(reportData as ReportDetails);
      setEditData(reportData);
    }

    // Get comments
    const { data: commentsData } = await supabase
      .from("head_comments")
      .select(
        `
        id,
        comment,
        created_at,
        profiles(full_name)
      `,
      )
      .eq("report_id", reportId)
      .order("created_at", { ascending: true });

    // Map the comments data to match our interface
    const mappedComments: HeadComment[] = (commentsData || []).map(
      (c: any) => ({
        id: c.id,
        comment: c.comment,
        created_at: c.created_at,
        profiles: c.profiles,
      }),
    );
    setComments(mappedComments);
    setLoading(false);
  };

  const handleSaveEdit = async () => {
    if (!report) return;
    setSaving(true);

    const { error } = await supabase
      .from("daily_reports")
      .update({
        total_learners: editData.total_learners,
        present_learners: editData.present_learners,
        absentees: editData.absentees,
        health_incident: editData.health_incident,
        health_details: editData.health_details,
        feeding_status: editData.feeding_status,
        lessons_covered: editData.lessons_covered,
        literacy_topic: editData.literacy_topic,
        discipline_issue: editData.discipline_issue,
        discipline_details: editData.discipline_details,
        parent_communication: editData.parent_communication,
        parent_details: editData.parent_details,
        challenges: editData.challenges,
      })
      .eq("id", reportId);

    if (!error) {
      setIsEditing(false);
      loadReportDetails();
    }

    setSaving(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmittingComment(true);

    const { error } = await supabase.from("head_comments").insert({
      report_id: reportId,
      headteacher_id: userId,
      comment: newComment.trim(),
    });

    if (!error) {
      setNewComment("");
      loadReportDetails();
    }

    setSubmittingComment(false);
  };

  const canEdit =
    report &&
    ((userRole === "teacher" && report.teacher_id === userId) ||
      userRole === "admin");

  const canComment = userRole === "headteacher" || userRole === "admin";

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
        <p className="text-gray-500 text-lg mb-4">Report not found</p>
        <Link href="/reports/history" className="text-accent hover:underline">
          Back to Report History
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link
              href="/reports/history"
              className="text-accent hover:underline text-sm mb-2 inline-block"
            >
              ← Back to Report History
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {report.classes.grade} - {report.classes.stream}
            </h1>
            <p className="text-gray-500">
              {new Date(report.report_date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportPDF}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm flex items-center gap-2"
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
              PDF
            </button>
            {canEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors font-medium"
              >
                ✏️ Edit Report
              </button>
            )}
          </div>
        </div>

        {/* Report Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Teacher Info */}
          <div className="bg-gradient-to-r from-primary to-gray-800 p-4 sm:p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center text-xl">
                👤
              </div>
              <div>
                <p className="font-semibold text-lg">
                  {report.profiles.full_name}
                </p>
                <p className="text-white/80 text-sm">Class Teacher</p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-6">
            {/* Attendance Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                📊 Attendance
              </h3>
              {isEditing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Learners
                    </label>
                    <input
                      type="number"
                      value={editData.total_learners || 0}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          total_learners: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Present
                    </label>
                    <input
                      type="number"
                      value={editData.present_learners || 0}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          present_learners: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-3xl font-bold text-primary">
                      {report.total_learners}
                    </p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-green-600">
                      {report.present_learners}
                    </p>
                    <p className="text-xs text-gray-500">Present</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-red-600">
                      {report.total_learners - report.present_learners}
                    </p>
                    <p className="text-xs text-gray-500">Absent</p>
                  </div>
                </div>
              )}
              {report.absentees && !isEditing && (
                <p className="mt-3 text-sm text-gray-600">
                  <strong>Absentees:</strong> {report.absentees}
                </p>
              )}
              {isEditing && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Absentees Names
                  </label>
                  <textarea
                    value={editData.absentees || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, absentees: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={2}
                  />
                </div>
              )}
            </div>

            {/* Health Section */}
            <div
              className={`rounded-xl p-4 sm:p-5 ${report.health_incident ? "bg-yellow-50 border border-yellow-200" : "bg-gray-50"}`}
            >
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                🏥 Health Status
              </h3>
              {isEditing ? (
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editData.health_incident || false}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          health_incident: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-accent"
                    />
                    <span>Health incident reported</span>
                  </label>
                  {editData.health_incident && (
                    <textarea
                      value={editData.health_details || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          health_details: e.target.value,
                        })
                      }
                      placeholder="Describe the health incident..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={2}
                    />
                  )}
                </div>
              ) : report.health_incident ? (
                <div>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-sm rounded-full">
                    ⚠️ Issue Reported
                  </span>
                  {report.health_details && (
                    <p className="mt-2 text-gray-700">
                      {report.health_details}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-green-600">✓ No health issues reported</p>
              )}
            </div>

            {/* Discipline Section */}
            <div
              className={`rounded-xl p-4 sm:p-5 ${report.discipline_issue ? "bg-red-50 border border-red-200" : "bg-gray-50"}`}
            >
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                📋 Discipline
              </h3>
              {isEditing ? (
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editData.discipline_issue || false}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          discipline_issue: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-accent"
                    />
                    <span>Discipline issue reported</span>
                  </label>
                  {editData.discipline_issue && (
                    <textarea
                      value={editData.discipline_details || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          discipline_details: e.target.value,
                        })
                      }
                      placeholder="Describe the discipline issue..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={2}
                    />
                  )}
                </div>
              ) : report.discipline_issue ? (
                <div>
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-sm rounded-full">
                    🚨 Issue Reported
                  </span>
                  {report.discipline_details && (
                    <p className="mt-2 text-gray-700">
                      {report.discipline_details}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-green-600">✓ No discipline issues</p>
              )}
            </div>

            {/* Learning Section */}
            <div className="bg-gray-50 rounded-xl p-4 sm:p-5">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                📚 Learning
              </h3>
              {isEditing ? (
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editData.lessons_covered || false}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          lessons_covered: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-accent"
                    />
                    <span>All lessons covered</span>
                  </label>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Literacy Topic
                    </label>
                    <input
                      type="text"
                      value={editData.literacy_topic || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          literacy_topic: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p
                    className={
                      report.lessons_covered
                        ? "text-green-600"
                        : "text-yellow-600"
                    }
                  >
                    {report.lessons_covered
                      ? "✓ All lessons covered"
                      : "⚠️ Some lessons not covered"}
                  </p>
                  {report.literacy_topic && (
                    <p className="text-gray-600">
                      <strong>Literacy Topic:</strong> {report.literacy_topic}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Challenges */}
            <div className="bg-gray-50 rounded-xl p-4 sm:p-5">
              <h3 className="font-semibold text-gray-800 mb-3">
                💭 Challenges
              </h3>
              {isEditing ? (
                <textarea
                  value={editData.challenges || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, challenges: e.target.value })
                  }
                  placeholder="Any challenges faced today..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              ) : (
                <p className="text-gray-600">
                  {report.challenges || "No challenges reported"}
                </p>
              )}
            </div>

            {/* Edit Actions */}
            {isEditing && (
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditData(report);
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-accent text-white rounded-lg hover:bg-accent-dark font-medium disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              💬 Headteacher Comments ({comments.length})
            </h3>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            {comments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No comments yet</p>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className="bg-green-50 border border-green-200 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-green-800">
                      {comment.profiles?.full_name || "Headteacher"}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-700">{comment.comment}</p>
                </div>
              ))
            )}

            {canComment && (
              <div className="pt-4 border-t border-gray-200">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment or feedback..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent resize-none"
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || submittingComment}
                    className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark font-medium disabled:opacity-50"
                  >
                    {submittingComment ? "Submitting..." : "Add Comment"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="text-center text-sm text-gray-400">
          Report submitted on {new Date(report.created_at).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
