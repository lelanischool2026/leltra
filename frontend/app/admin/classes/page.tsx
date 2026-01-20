"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Class } from "@/lib/types";

interface ClassWithTeacher extends Class {
  teacher?: {
    full_name: string;
  };
}

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<ClassWithTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ grade: "", stream: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    setLoading(true);

    // Load classes with teacher assignments
    const { data: classesData } = await supabase
      .from("classes")
      .select("*")
      .order("grade")
      .order("stream");

    // Load teacher assignments
    const { data: assignments } = await supabase
      .from("teacher_classes")
      .select("class_id, profiles(full_name)");

    // Merge data
    const classesWithTeachers =
      classesData?.map((cls) => {
        const assignment = assignments?.find((a) => a.class_id === cls.id);
        return {
          ...cls,
          teacher: assignment?.profiles as { full_name: string } | undefined,
        };
      }) || [];

    setClasses(classesWithTeachers);
    setLoading(false);
  };

  const handleAddClass = async () => {
    if (!formData.grade || !formData.stream) {
      setMessage({ type: "error", text: "Please fill in all fields" });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase.from("classes").insert({
        grade: formData.grade,
        stream: formData.stream,
      });

      if (error) throw error;

      setMessage({ type: "success", text: "Class added successfully!" });
      setShowModal(false);
      setFormData({ grade: "", stream: "" });
      loadClasses();
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm("Are you sure you want to delete this class?")) return;

    try {
      const { error } = await supabase
        .from("classes")
        .delete()
        .eq("id", classId);

      if (error) throw error;

      setMessage({ type: "success", text: "Class deleted successfully!" });
      loadClasses();
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  // Group classes by grade
  const groupedClasses = classes.reduce(
    (acc, cls) => {
      if (!acc[cls.grade]) acc[cls.grade] = [];
      acc[cls.grade].push(cls);
      return acc;
    },
    {} as Record<string, ClassWithTeacher[]>,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Class Management
          </h1>
          <p className="mt-1 text-gray-600">
            Manage grades, streams, and class assignments
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-dark font-medium transition-colors shadow-lg"
        >
          + Add Class
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Classes Grid */}
      <div className="space-y-6">
        {Object.entries(groupedClasses).map(([grade, gradeClasses]) => (
          <div key={grade}>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              {grade}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {gradeClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-primary">
                        {cls.stream}
                      </h3>
                      <p className="text-gray-500 text-sm mt-1">
                        {cls.grade} • {cls.stream}
                      </p>
                      {cls.teacher ? (
                        <p className="text-green-600 text-sm mt-2 flex items-center">
                          <span className="mr-1">👤</span>
                          {cls.teacher.full_name}
                        </p>
                      ) : (
                        <p className="text-yellow-600 text-sm mt-2 flex items-center">
                          <span className="mr-1">⚠️</span>
                          No teacher assigned
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteClass(cls.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Delete class"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add Class Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowModal(false)}
            ></div>

            <div className="relative inline-block w-full max-w-md p-6 my-8 text-left align-middle bg-white shadow-xl rounded-2xl transform transition-all">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Add New Class
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grade
                  </label>
                  <select
                    value={formData.grade}
                    onChange={(e) =>
                      setFormData({ ...formData, grade: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  >
                    <option value="">Select grade...</option>
                    <option value="Grade 1">Grade 1</option>
                    <option value="Grade 2">Grade 2</option>
                    <option value="Grade 3">Grade 3</option>
                    <option value="Grade 4">Grade 4</option>
                    <option value="Grade 5">Grade 5</option>
                    <option value="Grade 6">Grade 6</option>
                    <option value="Grade 7">Grade 7</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stream Name
                  </label>
                  <input
                    type="text"
                    value={formData.stream}
                    onChange={(e) =>
                      setFormData({ ...formData, stream: e.target.value })
                    }
                    placeholder="e.g., Tulip, Orchid, Lotus"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full sm:w-auto px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddClass}
                  disabled={saving}
                  className="w-full sm:w-auto px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-dark font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? "Adding..." : "Add Class"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
