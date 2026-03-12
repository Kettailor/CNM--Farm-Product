import PageShell from '../components/PageShell';

const users = [
  ['Admin', 'Manage users and projects'],
  ['Project Manager', 'Create projects, assign tasks, track progress'],
  ['Supervisor', 'Update progress and manage workers'],
  ['Worker', 'View and complete assigned tasks'],
  ['Architect', 'Planning and design approvals'],
];

export default function UsersPage() {
  return <PageShell>
    <h1 className="text-2xl font-semibold mb-4">Users & Roles</h1>
    <ul className="space-y-2">{users.map(([role, desc]) => <li key={role} className="border rounded p-3"><b>{role}</b>: {desc}</li>)}</ul>
  </PageShell>;
}
