"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Class, TeacherClass, DailyReport } from "@/lib/types";

export default function TeacherDashboard() {
  const [myClass, setMyClass] = useState<Class | null>(null);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadTeacherData();
  }, []);

  const loadTeacherData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Get teacher's assigned class
    const { data: teacherClass } = await supabase
      .from("teacher_classes")
      .select("class_id, classes(*)")
      .eq("teacher_id", user.id)
      .single();

    if (teacherClass) {
      setMyClass(teacherClass.classes as unknown as Class);

      // Get recent reports
      const { data: reportsData } = await supabase
        .from("daily_reports")
        .select("*")
        .eq("class_id", teacherClass.class_id)
        .order("report_date", { ascending: false })
        .limit(10);

      if (reportsData) {
        setReports(reportsData);
      }
    }

    setLoading(false);
  };

  const getTodayDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  const hasTodayReport = () => {
    const today = getTodayDate();
    return reports.some((report) => report.report_date === today);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!myClass) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">No Class Assigned</h2>
        <p className="mt-2 text-gray-600">
          Please contact the administrator to assign you to a class.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
        <p className="mt-2 text-base sm:text-lg text-gray-600">
          {myClass.grade} - {myClass.stream}
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Daily Report</h2>
          {!hasTodayReport() ? (
            <button
              onClick={() => router.push("/reports/new")}
              className="bg-accent hover:bg-accent-dark text-white px-4 sm:px-6 py-2.5 sm:py-2 rounded font-medium text-sm sm:text-base w-full sm:w-auto"
            >
              Submit Today's Report
            </button>
          ) : (
            <span className="text-green-600 font-medium text-sm sm:text-base">
              ✓ Today's report submitted
            </span>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
          Recent Reports
        </h2>
        {reports.length === 0 ? (
          <p className="text-gray-600">No reports submitted yet.</p>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="border rounded-lg p-3 sm:p-4 hover:bg-gray-50 active:bg-gray-100 cursor-pointer"
                onClick={() => router.push(`/reports/${report.id}`)}
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm sm:text-base">
                      {new Date(report.report_date).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        },
                      )}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      Attendance: {report.present_learners}/
                      {report.total_learners}
                    </p>
                  </div>
                  <span className="text-xs sm:text-sm text-gray-500 self-end sm:self-auto">
                    {new Date(report.created_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
