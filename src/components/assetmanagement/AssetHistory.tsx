

import "../../assets/assethistory.css";

const AssetHistory = () => {
  const historyData = [
    {
      id: 1,
      assetName: 'Laptop Dell',
      reportedBy: 'Donna May Magsucang',
      dateReported: '2025-05-10',
      status: 'Under Maintenance',
    },
    {
      id: 2,
      assetName: 'Projector Epson',
      reportedBy: 'Donna May Magsucang',
      dateReported: '2025-05-11',
      status: 'Resolved',
    },
    {
      id: 3,
      assetName: 'Printer Canon',
      reportedBy: 'Donna May Magsucang',
      dateReported: '2025-05-12',
      status: 'Pending',
    },
    {
      id: 4,
      assetName: 'Router TP-Link',
      reportedBy: 'Donna May Magsucang',
      dateReported: '2025-05-13',
      status: 'Resolved',
    },
    {
      id: 5,
      assetName: 'Monitor Acer',
      reportedBy: 'Donna May Magsucang',
      dateReported: '2025-05-14',
      status: 'Pending',
    },
    {
      id: 6,
      assetName: 'System Unit HP',
      reportedBy: 'Donna May Magsucang',
      dateReported: '2025-05-15',
      status: 'Under Maintenance',
    },
  ];

  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'Pending':
        return 'status-pending';
      case 'Resolved':
        return 'status-resolved';
      case 'Under Maintenance':
        return 'status-maintenance';
      default:
        return '';
    }
  };

  const sortedHistory = [...historyData].sort((a, b) => {
    const priority = (status: string) => {
      if (status === 'Pending') return 0;
      if (status === 'Under Maintenance') return 1;
      return 2; // Resolved last
    };
    return priority(a.status) - priority(b.status);
  });

  return (
    <div className="asset-history-container">
      <h2 className="title">Asset Report History</h2>

      <div className="table-container">
        <table className="history-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Asset Name</th>
              <th>Reported By</th>
              <th>Date Reported</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedHistory.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>{item.assetName}</td>
                <td>{item.reportedBy}</td>
                <td>{item.dateReported}</td>
                <td>
                  <span className={`status-badge ${getStatusClass(item.status)}`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AssetHistory;
