"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getCachedSession, getCachedData } from "@/lib/session-cache";
import { useRouter } from "next/navigation";
import { Class } from "@/lib/types";
import { FormSkeleton } from "@/components/loading";

export default function NewReportPage() {
  const [myClass, setMyClass] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [formData, setFormData] = useState({
    report_date: new Date().toISOString().split("T")[0],
    total_learners: 0,
    present_learners: 0,
    absentees: "",
    health_incident: false,
    health_details: "",
    health_severity: "" as string,
    feeding_status: "",
    lessons_covered: true,
    literacy_topic: "",
    discipline_issue: false,
    discipline_details: "",
    discipline_severity: "" as string,
    parent_communication: false,
    parent_details: "",
    challenges: "",
  });

  const loadTeacherClass = useCallback(async () => {
    try {
      const session = await getCachedSession();
      if (!session.user) {
        router.push("/auth/login");
        return;
      }

      // Use cached class data
      const teacherClass = await getCachedData(
        `teacher_class_${session.user.id}`,
        async () => {
          const { data } = await supabase
            .from("teacher_classes")
            .select("class_id, classes(*)")
            .eq("teacher_id", session.user!.id)
            .single();
          return data;
        },
      );

      if (teacherClass) {
        setMyClass(teacherClass.classes as unknown as Class);
      }
    } catch (err) {
      console.error("Error loading class:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadTeacherClass();
  }, [loadTeacherClass]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const session = await getCachedSession();
    if (!session.user || !myClass) return;

    try {
      // Create the daily report
      const { data: report, error } = await supabase
        .from("daily_reports")
        .insert({
          teacher_id: session.user.id,
          class_id: myClass.id,
          ...formData,
          health_severity: formData.health_incident
            ? formData.health_severity || "low"
            : null,
          discipline_severity: formData.discipline_issue
            ? formData.discipline_severity || "low"
            : null,
        })
        .select()
        .single();

      if (error) throw error;

      // Create incident records for health/safety issues
      if (formData.health_incident && formData.health_details) {
        await supabase.from("incidents").insert({
          report_id: report.id,
          class_id: myClass.id,
          teacher_id: session.user.id,
          incident_date: formData.report_date,
          incident_type: "health",
          severity: formData.health_severity || "low",
          description: formData.health_details,
          alert_sent:
            formData.health_severity === "critical" ||
            formData.health_severity === "high",
        });
      }

      // Create incident records for discipline issues
      if (formData.discipline_issue && formData.discipline_details) {
        await supabase.from("incidents").insert({
          report_id: report.id,
          class_id: myClass.id,
          teacher_id: session.user.id,
          incident_date: formData.report_date,
          incident_type: "discipline",
          severity: formData.discipline_severity || "low",
          description: formData.discipline_details,
          alert_sent:
            formData.discipline_severity === "critical" ||
            formData.discipline_severity === "high",
        });
      }

      router.push("/dashboard/teacher");
    } catch (error: any) {
      setError(error.message || "Failed to submit report");
      setSubmitting(false);
    }
  };

  if (loading) {
    return <FormSkeleton />;
  }

  if (!myClass) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">No Class Assigned</h2>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Daily Class Report
        </h1>
        <p className="text-base sm:text-lg text-gray-600 mb-4 sm:mb-6">
          {myClass.grade} - {myClass.stream}
        </p>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              required
              value={formData.report_date}
              onChange={(e) =>
                setFormData({ ...formData, report_date: e.target.value })
              }
              className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent focus:border-accent text-base"
            />
          </div>

          {/* Attendance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Learners <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.total_learners}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    total_learners: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent focus:border-accent text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Learners Present <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.present_learners}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    present_learners: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent focus:border-accent text-base"
              />
            </div>
          </div>

          {/* Absentees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Absentees (names)
            </label>
            <textarea
              rows={3}
              value={formData.absentees}
              onChange={(e) =>
                setFormData({ ...formData, absentees: e.target.value })
              }
              placeholder="List names of absent learners"
              className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent focus:border-accent text-base resize-none"
            />
          </div>

          {/* Health Incident */}
          <div>
            <label className="flex items-start sm:items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.health_incident}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    health_incident: e.target.checked,
                  })
                }
                className="w-5 h-5 sm:w-4 sm:h-4 mt-0.5 sm:mt-0 text-accent focus:ring-accent border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Health/Safety Incident Occurred
              </span>
            </label>
            {formData.health_incident && (
              <>
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Severity Level <span className="text-red-600">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      {
                        value: "low",
                        label: "Low",
                        color: "bg-green-100 text-green-800 border-green-300",
                      },
                      {
                        value: "medium",
                        label: "Medium",
                        color:
                          "bg-yellow-100 text-yellow-800 border-yellow-300",
                      },
                      {
                        value: "high",
                        label: "High",
                        color:
                          "bg-orange-100 text-orange-800 border-orange-300",
                      },
                      {
                        value: "critical",
                        label: "Critical",
                        color: "bg-red-100 text-red-800 border-red-300",
                      },
                    ].map((level) => (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            health_severity: level.value,
                          })
                        }
                        className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
                          formData.health_severity === level.value
                            ? level.color +
                              " ring-2 ring-offset-1 ring-gray-400"
                            : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                  {(formData.health_severity === "high" ||
                    formData.health_severity === "critical") && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
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
                      Administration will be alerted about this incident
                    </p>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={formData.health_details}
                  onChange={(e) =>
                    setFormData({ ...formData, health_details: e.target.value })
                  }
                  placeholder="Describe the incident..."
                  className="mt-2 w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent focus:border-accent text-base resize-none"
                />
              </>
            )}
          </div>

          {/* Feeding Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Feeding Status
            </label>
            <input
              type="text"
              value={formData.feeding_status}
              onChange={(e) =>
                setFormData({ ...formData, feeding_status: e.target.value })
              }
              placeholder="e.g., All learners fed, 5 learners missed meal"
              className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent focus:border-accent text-base"
            />
          </div>

          {/* Lessons Covered */}
          <div>
            <label className="flex items-start sm:items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.lessons_covered}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    lessons_covered: e.target.checked,
                  })
                }
                className="w-5 h-5 sm:w-4 sm:h-4 mt-0.5 sm:mt-0 text-accent focus:ring-accent border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                All Lessons Covered
              </span>
            </label>
          </div>

          {/* Literacy Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Literacy Topic Covered
            </label>
            <input
              type="text"
              value={formData.literacy_topic}
              onChange={(e) =>
                setFormData({ ...formData, literacy_topic: e.target.value })
              }
              placeholder="e.g., Reading comprehension, Phonics"
              className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent focus:border-accent text-base"
            />
          </div>

          {/* Discipline Issue */}
          <div>
            <label className="flex items-start sm:items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.discipline_issue}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discipline_issue: e.target.checked,
                  })
                }
                className="w-5 h-5 sm:w-4 sm:h-4 mt-0.5 sm:mt-0 text-accent focus:ring-accent border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Discipline Issue Occurred
              </span>
            </label>
            {formData.discipline_issue && (
              <>
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Severity Level <span className="text-red-600">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      {
                        value: "low",
                        label: "Low",
                        color: "bg-green-100 text-green-800 border-green-300",
                      },
                      {
                        value: "medium",
                        label: "Medium",
                        color:
                          "bg-yellow-100 text-yellow-800 border-yellow-300",
                      },
                      {
                        value: "high",
                        label: "High",
                        color:
                          "bg-orange-100 text-orange-800 border-orange-300",
                      },
                      {
                        value: "critical",
                        label: "Critical",
                        color: "bg-red-100 text-red-800 border-red-300",
                      },
                    ].map((level) => (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            discipline_severity: level.value,
                          })
                        }
                        className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
                          formData.discipline_severity === level.value
                            ? level.color +
                              " ring-2 ring-offset-1 ring-gray-400"
                            : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                  {(formData.discipline_severity === "high" ||
                    formData.discipline_severity === "critical") && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
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
                      Administration will be alerted about this incident
                    </p>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={formData.discipline_details}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discipline_details: e.target.value,
                    })
                  }
                  placeholder="Describe the issue..."
                  className="mt-2 w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent focus:border-accent text-base resize-none"
                />
              </>
            )}
          </div>

          {/* Parent Communication */}
          <div>
            <label className="flex items-start sm:items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.parent_communication}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    parent_communication: e.target.checked,
                  })
                }
                className="w-5 h-5 sm:w-4 sm:h-4 mt-0.5 sm:mt-0 text-accent focus:ring-accent border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Parent Communication Made
              </span>
            </label>
            {formData.parent_communication && (
              <textarea
                rows={3}
                value={formData.parent_details}
                onChange={(e) =>
                  setFormData({ ...formData, parent_details: e.target.value })
                }
                placeholder="Describe the communication..."
                className="mt-2 w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent focus:border-accent text-base resize-none"
              />
            )}
          </div>

          {/* Challenges */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Challenges / Support Needed
            </label>
            <textarea
              rows={4}
              value={formData.challenges}
              onChange={(e) =>
                setFormData({ ...formData, challenges: e.target.value })
              }
              placeholder="Any challenges faced or support required..."
              className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent focus:border-accent text-base resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-800 font-medium py-3.5 sm:py-3 px-4 rounded-md text-base"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-accent hover:bg-accent-dark active:bg-accent-dark text-white font-medium py-3.5 sm:py-3 px-4 rounded-md disabled:opacity-50 text-base"
            >
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
