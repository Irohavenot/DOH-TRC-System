import React, { useState } from 'react';
import "../../superadmincss/Notifications.css";

type Notification = {
  id: number;
  title: string;
  message: string;
  date: string;
  read: boolean;
};

const sampleNotifications: Notification[] = [
  {
    id: 1,
    title: 'New Asset Added',
    message: 'A new laptop has been added to the IT inventory.',
    date: '2025-05-21',
    read: false,
  },
  {
    id: 2,
    title: 'License Expiring Soon',
    message: 'The antivirus license for Workstation #3 is expiring in 3 days.',
    date: '2025-05-20',
    read: true,
  },
  {
    id: 3,
    title: 'New Patient Appointment',
    message: 'Patient Maria Santos scheduled an appointment for May 25.',
    date: '2025-05-19',
    read: false,
  },
  {
    id: 4,
    title: 'Asset Maintenance Required',
    message: 'Projector Unit A needs maintenance. Last check was over 6 months ago.',
    date: '2025-05-18',
    read: false,
  },
  {
    id: 5,
    title: 'Patient Appointment Cancelled',
    message: 'Patient Juan Dela Cruz cancelled his appointment.',
    date: '2025-05-17',
    read: true,
  },
];


const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>(sampleNotifications);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  const markAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAsUnread = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: false } : n))
    );
  };

  const deleteNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const toggleDropdown = (id: number) => {
    setOpenDropdownId((prevId) => (prevId === id ? null : id));
  };

  const formatRelativeDate = (dateString: string): string => {
    const notifDate = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - notifDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays < 1) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return notifDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  return (
    <div className="notif-container">
      <div className='notif-admin'>
      <h2 >Notifications</h2>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        {notifications.length === 0 ? (
          <p className="notif-num">No notifications available.</p>
        ) : (
          <ul>
            {notifications.map((notif) => (
              <li
                key={notif.id}
                className={`p-4 border-b relative ${
                  notif.read ? 'bg-gray-100' : 'bg-yellow-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{notif.title}</h3>
                    <p className="text-gray-700">{notif.message}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatRelativeDate(notif.date)}
                    </p>
                  </div>

                  {/* 3-dot dropdown */}
                  <div className="relative">
                    <button
  onClick={() => toggleDropdown(notif.id)}
  className="dropdown-trigger"
>
  &#8942;
</button>

                    {openDropdownId === notif.id && (
                      <div className="dropdown-menu">

                        <ul className="text-sm text-gray-700">
                          {!notif.read && (
                            <li
                              onClick={() => {
                                markAsRead(notif.id);
                                setOpenDropdownId(null);
                              }}
                              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            >
                              Mark as Read
                            </li>
                          )}
                          {notif.read && (
                            <li
                              onClick={() => {
                                markAsUnread(notif.id);
                                setOpenDropdownId(null);
                              }}
                              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            >
                              Mark as Unread
                            </li>
                          )}
                          <li
                            onClick={() => {
                              deleteNotification(notif.id);
                              setOpenDropdownId(null);
                            }}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-red-600"
                          >
                            Delete Notification
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Notifications;
