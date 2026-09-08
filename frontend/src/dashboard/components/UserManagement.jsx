export default function UserManagement({ users, visible }) {
  if (!visible) return null;

  return (
    <div className="result-box">
      <h3>User Management</h3>
      <ul>
        {users.map((user) => (
          <li key={user.email}>{user.name || 'Unnamed user'} - {user.email} ({user.role})</li>
        ))}
      </ul>
    </div>
  );
}
