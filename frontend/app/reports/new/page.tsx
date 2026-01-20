'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Class } from '@/lib/types'

export default function NewReportPage() {
  const [myClass, setMyClass] = useState<Class | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const [formData, setFormData] = useState({
    report_date: new Date().toISOString().split('T')[0],
    total_learners: 0,
    present_learners: 0,
    absentees: '',
    health_incident: false,
    health_details: '',
    feeding_status: '',
    lessons_covered: true,
    literacy_topic: '',
    discipline_issue: false,
    discipline_details: '',
    parent_communication: false,
    parent_details: '',
    challenges: '',
  })

  useEffect(() => {
    loadTeacherClass()
  }, [])

  const loadTeacherClass = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    const { data: teacherClass } = await supabase
      .from('teacher_classes')
      .select('class_id, classes(*)')
      .eq('teacher_id', user.id)
      .single()

    if (teacherClass) {
      setMyClass(teacherClass.classes as unknown as Class)
    }

    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !myClass) return

    try {
      const { error } = await supabase.from('daily_reports').insert({
        teacher_id: user.id,
        class_id: myClass.id,
        ...formData,
      })

      if (error) throw error

      router.push('/dashboard/teacher')
    } catch (error: any) {
      setError(error.message || 'Failed to submit report')
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!myClass) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">No Class Assigned</h2>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Daily Class Report
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          {myClass.grade} - {myClass.stream}
        </p>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent focus:border-accent"
            />
          </div>

          {/* Attendance */}
          <div className="grid grid-cols-2 gap-4">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent focus:border-accent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent focus:border-accent"
              />
            </div>
          </div>

          {/* Absentees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Absentees (names)
            </label>
            <textarea
              rows={2}
              value={formData.absentees}
              onChange={(e) =>
                setFormData({ ...formData, absentees: e.target.value })
              }
              placeholder="List names of absent learners"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent focus:border-accent"
            />
          </div>

          {/* Health Incident */}
          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.health_incident}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    health_incident: e.target.checked,
                  })
                }
                className="w-4 h-4 text-accent focus:ring-accent border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Health/Safety Incident Occurred
              </span>
            </label>
            {formData.health_incident && (
              <textarea
                rows={3}
                value={formData.health_details}
                onChange={(e) =>
                  setFormData({ ...formData, health_details: e.target.value })
                }
                placeholder="Describe the incident..."
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent focus:border-accent"
              />
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent focus:border-accent"
            />
          </div>

          {/* Lessons Covered */}
          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.lessons_covered}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    lessons_covered: e.target.checked,
                  })
                }
                className="w-4 h-4 text-accent focus:ring-accent border-gray-300 rounded"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent focus:border-accent"
            />
          </div>

          {/* Discipline Issue */}
          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.discipline_issue}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discipline_issue: e.target.checked,
                  })
                }
                className="w-4 h-4 text-accent focus:ring-accent border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Discipline Issue Occurred
              </span>
            </label>
            {formData.discipline_issue && (
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
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent focus:border-accent"
              />
            )}
          </div>

          {/* Parent Communication */}
          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.parent_communication}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    parent_communication: e.target.checked,
                  })
                }
                className="w-4 h-4 text-accent focus:ring-accent border-gray-300 rounded"
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
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent focus:border-accent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent focus:border-accent"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-accent hover:bg-accent-dark text-white font-medium py-3 px-4 rounded-md disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
