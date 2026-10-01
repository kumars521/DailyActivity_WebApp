import { activities, currentUser, dashboardEntries } from './mockData'

export const mockClient = {
  async getCurrentUser() {
    return currentUser
  },

  async getActivities() {
    return activities
  },

  async getActivitySummary() {
    const totalMinutes = dashboardEntries.reduce((sum, item) => sum + item.durationMinutes, 0)
    const activeDays = new Set(dashboardEntries.map((item) => item.date)).size
    const recentCategories = dashboardEntries.slice(0, 3).map((item) => item.category)

    return {
      totalMinutes,
      activeDays,
      recentCategories,
      entries: dashboardEntries,
    }
  },

  async createActivity(payload) {
    const newActivity = {
      id: `a_${Date.now()}`,
      user: currentUser.name,
      topic: payload.description || payload.category,
      duration: Number(payload.durationMinutes || 0),
      category: payload.category,
      status: 'Draft',
      date: payload.date,
    }

    activities.unshift(newActivity)
    dashboardEntries.unshift({
      id: newActivity.id,
      date: payload.date,
      category: payload.category,
      durationMinutes: Number(payload.durationMinutes || 0),
      notes: payload.description,
    })

    return newActivity
  },
}

export default mockClient
