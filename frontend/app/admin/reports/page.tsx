"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DailyReport } from "@/lib/types";

interface ReportWithDetails extends DailyReport {
  classes: { grade: string; stream: string };
  profiles: { full_name: string };
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] =
    useState<ReportWithDetails | null>(null);
  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  useEffect(() => {
    loadReports();
  }, [filterDate]);

  const loadReports = async () => {
    setLoading(true);

    const { data } = await supabase
      .from("daily_reports")
      .select(
        `
        *,
        classes(grade, stream),
        profiles(full_name)
      `,
      )
      .eq("report_date", filterDate)
      .order("created_at", { ascending: false });

    setReports((data as ReportWithDetails[]) || []);
    setLoading(false);
  };

  const getStatusBadge = (report: ReportWithDetails) => {
    const hasIssues =
      report.health_incident ||
      report.discipline_issue ||
      report.parent_communication;
    if (hasIssues) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
          Needs Attention
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
        Normal
      </span>
    );
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
            All Reports
          </h1>
          <p className="mt-1 text-gray-600">
            View daily reports from all classes
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">Date:</label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-4">
          <p className="text-sm text-gray-500">Total Reports</p>
          <p className="text-2xl font-bold text-primary">{reports.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4">
          <p className="text-sm text-gray-500">Total Students</p>
          <p className="text-2xl font-bold text-primary">
            {reports.reduce((sum, r) => sum + r.total_learners, 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4">
          <p className="text-sm text-gray-500">Present</p>
          <p className="text-2xl font-bold text-green-600">
            {reports.reduce((sum, r) => sum + r.present_learners, 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4">
          <p className="text-sm text-gray-500">Absent</p>
          <p className="text-2xl font-bold text-red-600">
            {reports.reduce(
              (sum, r) => sum + (r.total_learners - r.present_learners),
              0,
            )}
          </p>
        </div>
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <p className="text-gray-500 text-lg">
            No reports submitted for {filterDate}
          </p>
        </div>
      ) : (
        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          {/* Mobile View */}
          <div className="sm:hidden">
            {reports.map((report) => (
              <div
                key={report.id}
                className="p-4 border-b border-gray-200 last:border-0"
                onClick={() => setSelectedReport(report)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {report.classes.grade} - {report.classes.stream}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {report.profiles.full_name}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {report.present_learners}/{report.total_learners} present
                    </p>
                  </div>
                  {getStatusBadge(report)}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Teacher
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Attendance
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr
                    key={report.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {report.classes.grade} - {report.classes.stream}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {report.profiles.full_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <span className="text-green-600 font-medium">
                          {report.present_learners}
                        </span>
                        <span className="text-gray-400"> / </span>
                        <span className="text-gray-600">
                          {report.total_learners}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(report)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedReport(report)}
                        className="text-accent hover:text-accent-dark font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedReport.classes.grade} -{" "}
                    {selectedReport.classes.stream}
                  </h3>
                  <p className="text-gray-500">
                    {selectedReport.profiles.full_name} •{" "}
                    {selectedReport.report_date}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* Attendance */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-2">Attendance</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        {selectedReport.total_learners}
                      </p>
                      <p className="text-xs text-gray-500">Total</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        {selectedReport.present_learners}
                      </p>
                      <p className="text-xs text-gray-500">Present</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">
                        {selectedReport.total_learners -
                          selectedReport.present_learners}
                      </p>
                      <p className="text-xs text-gray-500">Absent</p>
                    </div>
                  </div>
                </div>

                {/* Absentees */}
                {selectedReport.absentees && (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-1">
                      Absentees
                    </h4>
                    <p className="text-gray-600">{selectedReport.absentees}</p>
                  </div>
                )}

                {/* Literacy Topic */}
                {selectedReport.literacy_topic && (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-1">
                      Literacy Topic
                    </h4>
                    <p className="text-gray-600">
                      {selectedReport.literacy_topic}
                    </p>
                  </div>
                )}

                {/* Health Issues */}
                {selectedReport.health_incident && (
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-800 mb-1">
                      ⚠️ Health Issues
                    </h4>
                    <p className="text-yellow-700">
                      {selectedReport.health_details || "No details provided"}
                    </p>
                  </div>
                )}

                {/* Discipline Incidents */}
                {selectedReport.discipline_issue && (
                  <div className="bg-red-50 rounded-lg p-4">
                    <h4 className="font-medium text-red-800 mb-1">
                      ⚠️ Discipline Incidents
                    </h4>
                    <p className="text-red-700">
                      {selectedReport.discipline_details ||
                        "No details provided"}
                    </p>
                  </div>
                )}

                {/* Feeding Status */}
                {selectedReport.feeding_status && (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-1">
                      Feeding Program Status
                    </h4>
                    <p className="text-gray-600">
                      {selectedReport.feeding_status}
                    </p>
                  </div>
                )}

                {/* Challenges */}
                {selectedReport.challenges && (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-1">
                      Challenges
                    </h4>
                    <p className="text-gray-600">{selectedReport.challenges}</p>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setSelectedReport(null)}
                  className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
