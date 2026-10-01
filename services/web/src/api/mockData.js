export const currentUser = {
  id: 'u_1001',
  name: 'Alex Morgan',
  email: 'alex@dailyactivity.app',
  role: 'Product Lead',
};

export const dashboardEntries = [
  { id: '1', date: '2026-10-01', category: 'Deep Work', durationMinutes: 90, notes: 'Roadmap review and sprint planning.' },
  { id: '2', date: '2026-10-02', category: 'Team Sync', durationMinutes: 30, notes: 'Cross-functional status check.' },
  { id: '3', date: '2026-10-03', category: 'Learning', durationMinutes: 45, notes: 'Reviewed onboarding guide and learning plan.' },
  { id: '4', date: '2026-10-04', category: 'Review', durationMinutes: 60, notes: 'QA follow-up and edge cases review.' },
];

export const activities = [
  { id: 'a1', user: 'Alex Morgan', topic: 'Product planning', duration: 75, category: 'Planning', status: 'Approved' },
  { id: 'a2', user: 'Alex Morgan', topic: 'QA review', duration: 45, category: 'Review', status: 'Draft' },
  { id: 'a3', user: 'Alex Morgan', topic: 'Sprint demo', duration: 60, category: 'Meeting', status: 'Submitted' },
  { id: 'a4', user: 'Alex Morgan', topic: 'Documentation cleanup', duration: 35, category: 'Operations', status: 'Approved' },
];
