"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Profile, Class } from "@/lib/types";

interface UserWithClass extends Profile {
  assigned_class?: {
    grade: string;
    stream: string;
  };
}

interface ActivityLog {
  id: string;
  user_name: string;
  action: string;
  details: string;
  timestamp: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserWithClass[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithClass | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    role: "teacher",
    class_id: "",
  });
  const [createFormData, setCreateFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "teacher",
    class_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [activeTab, setActiveTab] = useState<"users" | "activity">("users");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    // Load all users
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name");

    // Load all classes
    const { data: classesData } = await supabase
      .from("classes")
      .select("*")
      .order("grade")
      .order("stream");

    // Load teacher assignments
    const { data: assignments } = await supabase
      .from("teacher_classes")
      .select("teacher_id, class_id, classes(grade, stream)");

    // Merge assignment data with users
    const usersWithClasses =
      profiles?.map((user) => {
        const assignment = assignments?.find((a) => a.teacher_id === user.id);
        return {
          ...user,
          assigned_class: assignment?.classes as
            | { grade: string; stream: string }
            | undefined,
        };
      }) || [];

    setUsers(usersWithClasses);
    setClasses(classesData || []);

    // Generate activity log from recent reports
    const { data: recentReports } = await supabase
      .from("daily_reports")
      .select("created_at, profiles(full_name), classes(grade, stream)")
      .order("created_at", { ascending: false })
      .limit(10);

    const activity: ActivityLog[] = (recentReports || []).map((r: any, i) => ({
      id: `report-${i}`,
      user_name: r.profiles?.full_name || "Unknown",
      action: "Submitted Report",
      details: `${r.classes?.grade} - ${r.classes?.stream}`,
      timestamp: r.created_at,
    }));

    // Add user creation activity
    const recentUsers = profiles?.slice(0, 5).map((p, i) => ({
      id: `user-${i}`,
      user_name: "System",
      action: "User Registered",
      details: p.full_name,
      timestamp: p.created_at,
    })) || [];

    setRecentActivity([...activity, ...recentUsers].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ).slice(0, 15));

    setLoading(false);
  };

  const handleEdit = (user: UserWithClass) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name,
      role: user.role,
      class_id: "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setSaving(true);
    setMessage(null);

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          role: formData.role,
        })
        .eq("id", editingUser.id);

      if (profileError) throw profileError;

      // If teacher and class selected, update assignment
      if (formData.role === "teacher" && formData.class_id) {
        // Remove existing assignment
        await supabase
          .from("teacher_classes")
          .delete()
          .eq("teacher_id", editingUser.id);

        // Add new assignment
        const { error: assignError } = await supabase
          .from("teacher_classes")
          .insert({
            teacher_id: editingUser.id,
            class_id: formData.class_id,
          });

        if (assignError) throw assignError;
      }

      setMessage({ type: "success", text: "User updated successfully!" });
      setShowModal(false);
      loadData();
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!createFormData.email || !createFormData.password || !createFormData.full_name) {
      setMessage({ type: "error", text: "Please fill in all required fields" });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      // Note: In production, you would use Supabase Admin API or Edge Functions
      // For now, we'll show instructions to create users via Supabase Dashboard
      setMessage({
        type: "error",
        text: "To create new users, please use Supabase Dashboard → Authentication → Add User. Then add them to profiles table with the SQL shown in the setup guide.",
      });
      
      // The code below would work with Supabase Admin API (server-side)
      // const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      //   email: createFormData.email,
      //   password: createFormData.password,
      //   email_confirm: true,
      // });
      
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800";
      case "director":
        return "bg-blue-100 text-blue-800";
      case "headteacher":
        return "bg-green-100 text-green-800";
      case "teacher":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
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
            User Management
          </h1>
          <p className="mt-1 text-gray-600">
            Manage teachers, headteachers, and administrators
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-dark font-medium transition-colors shadow-lg"
        >
          + Add New User
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === "users"
              ? "border-accent text-accent"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          👥 Users ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === "activity"
              ? "border-accent text-accent"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          📊 Activity Log
        </button>
      </div>

      {/* Success/Error Message */}
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

      {/* Activity Log Tab */}
      {activeTab === "activity" && (
        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Recent System Activity</h2>
          </div>
          {recentActivity.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No recent activity
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                        activity.action.includes("Report") ? "bg-blue-500" : "bg-green-500"
                      }`}>
                        {activity.action.includes("Report") ? "📋" : "👤"}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{activity.action}</p>
                        <p className="text-sm text-gray-500">
                          {activity.user_name} • {activity.details}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(activity.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Users Table */}
      {activeTab === "users" && (
      <div className="bg-white shadow-lg rounded-xl overflow-hidden">
        {/* Mobile View */}
        <div className="sm:hidden">
          {users.map((user) => (
            <div
              key={user.id}
              className="p-4 border-b border-gray-200 last:border-0"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {user.full_name}
                  </h3>
                  <span
                    className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(
                      user.role,
                    )}`}
                  >
                    {user.role}
                  </span>
                  {user.assigned_class && (
                    <p className="mt-1 text-sm text-gray-500">
                      📚 {user.assigned_class.grade} -{" "}
                      {user.assigned_class.stream}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleEdit(user)}
                  className="text-accent hover:text-accent-dark font-medium text-sm"
                >
                  Edit
                </button>
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
                  Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Assigned Class
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold">
                          {user.full_name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.full_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(
                        user.role,
                      )}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.assigned_class
                      ? `${user.assigned_class.grade} - ${user.assigned_class.stream}`
                      : "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-accent hover:text-accent-dark font-medium transition-colors"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Edit Modal */}
      {showModal && editingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowModal(false)}
            ></div>

            <div className="relative inline-block w-full max-w-md p-6 my-8 text-left align-middle bg-white shadow-xl rounded-2xl transform transition-all">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Edit User
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  >
                    <option value="teacher">Teacher</option>
                    <option value="headteacher">Headteacher</option>
                    <option value="director">Director</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {formData.role === "teacher" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assign to Class
                    </label>
                    <select
                      value={formData.class_id}
                      onChange={(e) =>
                        setFormData({ ...formData, class_id: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                    >
                      <option value="">Select a class...</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.grade} - {cls.stream}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full sm:w-auto px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full sm:w-auto px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-dark font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowCreateModal(false)}
            ></div>

            <div className="relative inline-block w-full max-w-lg p-6 my-8 text-left align-middle bg-white shadow-xl rounded-2xl transform transition-all">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Add New User
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Create a new teacher, headteacher, or administrator account
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-blue-800 mb-2">📋 Instructions</h4>
                <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
                  <li>Go to <strong>Supabase Dashboard</strong> → <strong>Authentication</strong> → <strong>Users</strong></li>
                  <li>Click <strong>"Add user"</strong> → <strong>"Create new user"</strong></li>
                  <li>Enter email, password, and check <strong>"Auto Confirm User"</strong></li>
                  <li>Copy the new <strong>User ID</strong></li>
                  <li>Go to <strong>SQL Editor</strong> and run:</li>
                </ol>
                <pre className="mt-3 bg-blue-100 p-3 rounded text-xs overflow-x-auto">
{`INSERT INTO profiles (id, full_name, role)
VALUES (
  'paste-user-id-here',
  'Teacher Name',
  'teacher'  -- or 'headteacher', 'director', 'admin'
);`}
                </pre>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  <strong>💡 Tip:</strong> For teachers, also assign them to a class:
                </p>
                <pre className="mt-2 bg-yellow-100 p-3 rounded text-xs overflow-x-auto">
{`INSERT INTO teacher_classes (teacher_id, class_id)
VALUES ('teacher-id', 'class-id');`}
                </pre>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
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
