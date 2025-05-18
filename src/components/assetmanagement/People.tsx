import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import "../../assets/people.css";

type Unit = 'IT Personnel' | 'Supply Unit' | '';

type User = {
  id: number;
  name: string;
  unit: Unit;
  email: string;
  status: 'approved' | 'pending' | 'rejected';
  role?: string;
};

const seedUsers: User[] = [
  { id: 1,  name: 'Donna Cruz',   unit: '',             email: 'donna@trc.ph', status: 'pending' },
  { id: 2,  name: 'Kent Reyes',   unit: 'IT Personnel', email: 'kent@trc.ph',  status: 'approved', role: 'IT Personnel' },
  { id: 3,  name: 'Clement Tan',  unit: '',             email: 'clem@trc.ph',  status: 'pending' },
  { id: 4,  name: 'Allan Diaz',   unit: 'Supply Unit',  email: 'allan@trc.ph', status: 'approved', role: 'Supply Unit' },
  { id: 5,  name: 'Xavier Lim',   unit: 'IT Personnel', email: 'xavier@trc.ph',status: 'approved', role: 'IT Personnel' },
  { id: 6,  name: 'Jemarie Cruz', unit: 'Supply Unit',  email: 'jemarie@trc.ph',status: 'approved', role: 'Supply Unit' },
  { id: 7,  name: 'Dean Torres',  unit: 'IT Personnel', email: 'dean@trc.ph',  status: 'approved', role: 'IT Personnel' },
  { id: 8,  name: 'Jona Perez',   unit: 'Supply Unit',  email: 'jona@trc.ph',  status: 'approved', role: 'Supply Unit' },
  { id: 9,  name: 'Mark Uy',      unit: 'IT Personnel', email: 'mark@trc.ph',  status: 'approved', role: 'IT Personnel' },
  { id: 10, name: 'Anna Santos',  unit: 'Supply Unit',  email: 'anna@trc.ph',  status: 'approved', role: 'Supply Unit' },
  { id: 11, name: 'Cris Dela Cruz',unit:'',            email:'cris@trc.ph',   status: 'pending' }
];

const People: React.FC = () => {
  const [users, setUsers] = useState<User[]>(seedUsers);
  const [filter, setFilter] = useState<'all' | Unit>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [unitChoice, setUnitChoice] = useState<Unit | ''>('');

  const openUnitModal = (user: User) => {
    setSelectedUser(user);
    setUnitChoice('');
    setModalOpen(true);
  };

  const confirmApprove = () => {
    if (!selectedUser || !unitChoice) return;
    setUsers(prev =>
      prev.map(u =>
        u.id === selectedUser.id
          ? { ...u, status: 'approved', unit: unitChoice, role: unitChoice }
          : u
      )
    );
    setModalOpen(false);
  };

  const rejectUser = (id: number) =>
    setUsers(prev =>
      prev.map(u =>
        u.id === id
          ? { ...u, status: 'rejected', unit: '', role: undefined }
          : u
      )
    );

  const byUnit = (list: User[]) =>
    filter === 'all' ? list : list.filter(u => u.unit === filter);

  const pendingUsers  = users.filter(u => u.status === 'pending');
  const approvedUsers = byUnit(users.filter(u => u.status === 'approved'));
  const rejectedUsers = users.filter(u => u.status === 'rejected'); // No filter

  return (
    <div className="people-page">
      <section className="pending-banner">
        <h2>Pending Approvals: {pendingUsers.length}</h2>
        {pendingUsers.length > 0 && (
          <Link to="#pending" className="banner-link">Review now →</Link>
        )}
      </section>

      <div className="filter-bar">
        {['all', 'IT Personnel', 'Supply Unit'].map(label => (
          <button
            key={label}
            className={filter === label ? 'active' : ''}
            onClick={() => setFilter(label as any)}
          >
            {label}
          </button>
        ))}
      </div>

      <SectionTable
        id="pending"
        title="Pending Users"
        users={pendingUsers}
        showActions
        onApprove={openUnitModal}
        onReject={rejectUser}
      />
      <SectionTable title="Approved Users" users={approvedUsers} />
      <SectionTable title="Rejected Users" users={rejectedUsers} />

      {modalOpen && selectedUser && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Select Unit</h3>
            <p>Choose a unit for <strong>{selectedUser.name}</strong></p>

            <select
              value={unitChoice}
              onChange={e => setUnitChoice(e.target.value as Unit)}
            >
              <option value="" disabled>Select unit</option>
              <option value="IT Personnel">IT Personnel</option>
              <option value="Supply Unit">Supply Unit</option>
            </select>

            <div className="modal-actions">
              <button onClick={() => setModalOpen(false)} className="reject-btn">Cancel</button>
              <button onClick={confirmApprove} className="approve-btn" disabled={!unitChoice}>
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default People;

/* ----------------------------- */
/* ---- SectionTable Reuse ---- */
/* ----------------------------- */

type TableProps = {
  id?: string;
  title: string;
  users: User[];
  showActions?: boolean;
  onApprove?: (user: User) => void;
  onReject?: (id: number) => void;
};

const SectionTable: React.FC<TableProps> = ({
  id, title, users, showActions = false, onApprove, onReject
}) => (
  <section id={id} className="table-section">
    <h3>{title}</h3>
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th> {/* NEW COLUMN */}
            <th>Name</th>
            <th>Unit</th>
            <th>Email</th>
            <th>Status</th>
            {showActions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {users.length ? (
            users.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td> {/* NEW CELL */}
                <td>{u.name}</td>
                <td>{u.status === 'pending' || u.status === 'rejected' ? 'N/A' : u.unit}</td>
                <td>{u.email}</td>
                <td className={u.status}>
                  {u.status}{u.role ? ` (${u.role})` : ''}
                </td>
                {showActions && (
                  <td>
                    <button onClick={() => onApprove?.(u)} className="approve-btn">
                      Approve
                    </button>
                    <button
                      onClick={() => onReject?.(u.id)}
                      className="reject-btn"
                      style={{ marginLeft: 8 }}
                    >
                      Reject
                    </button>
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={showActions ? 6 : 5} style={{ textAlign: 'center' }}>
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </section>
);


