import { useState } from 'react';
import React from 'react';
import "../../assets/Reports.css";
interface Report {
  date: string;
  assetName: string;
  issueType: string;
  reportedBy: string;
  status: 'Pending' | 'In Progress' | 'Resolved';
}

const Reports: React.FC = () => {
  const [month, setMonth] = useState<string>(''); // e.g. "04"
  const [year, setYear] = useState<string>('');   // e.g. "2025"

  const [reports, setReports] = useState<Report[]>([
    {
      date: '2025-04-01',
      assetName: 'Printer A',
      issueType: 'Paper Jam',
      reportedBy: 'Donna M.',
      status: 'Pending',
    },
    {
      date: '2025-04-15',
      assetName: 'Laptop B',
      issueType: 'Battery Issue',
      reportedBy: 'Ronzel G.',
      status: 'Pending',
    },
    {
      date: '2025-03-20',
      assetName: 'Scanner C',
      issueType: 'No Power',
      reportedBy: 'Shelonie D.',
      status: 'Pending',
    },
  ]);

  // Change status dropdown handler
  const handleStatusChange = (index: number, newStatus: Report['status']) => {
    const updatedReports = [...reports];
    updatedReports[index].status = newStatus;
    setReports(updatedReports);
  };

  // Filter by selected month and year
  const filteredReports = reports.filter((report) => {
    const reportDate = new Date(report.date);
    const reportMonth = (reportDate.getMonth() + 1).toString().padStart(2, '0'); // 01 to 12
    const reportYear = reportDate.getFullYear().toString(); // "2025"

    const matchesMonth = month ? reportMonth === month : true;
    const matchesYear = year ? reportYear === year : true;

    return matchesMonth && matchesYear;
  });

  // Function to get the status color
  const getStatusColor = (status: Report['status']) => {
    switch (status) {
      case 'Pending':
        return 'red';
      case 'In Progress':
        return 'orange';
      case 'Resolved':
        return 'green';
      default:
        return 'gray';
    }
  };

  return (
   
   <div className="reports-container">
  <h2>Reported IT Asset Issues</h2>

  {/* Filter Section */}
  <div className="filter-section">
    <div className="filter-group">
      <label htmlFor="month">Month:</label>
      <select id="month" value={month} onChange={(e) => setMonth(e.target.value)}>
        <option value="">All Months</option>
        {[
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ].map((monthName, index) => {
          const value = String(index + 1).padStart(2, '0');
          return (
            <option key={value} value={value}>
              {monthName}
            </option>
          );
        })}
      </select>
    </div>

    <div className="filter-group">
      <label htmlFor="year">Year:</label>
      <select id="year" value={year} onChange={(e) => setYear(e.target.value)}>
        <option value="">All Years</option>
        {Array.from({ length: 2050 - 1990 + 1 }, (_, i) => {
          const y = (1990 + i).toString();
          return <option key={y} value={y}>{y}</option>;
        })}
      </select>
    </div>
  </div>


          {/* Reports Table */}
          <table className="reports-table">
            <thead>
              <tr>
                <th>Date Reported</th>
                <th>Asset Name</th>
                <th>Issue Type</th>
                <th>Reported By</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length > 0 ? (
                Object.entries(
                  filteredReports.reduce((acc, report) => {
                    const date = new Date(report.date);
                    const monthYear = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
                    if (!acc[monthYear]) acc[monthYear] = [];
                    acc[monthYear].push(report);
                    return acc;
                  }, {} as Record<string, Report[]>)
                ).map(([monthYear, reportsInMonth], groupIndex) => (
                  <React.Fragment key={groupIndex}>
                    <tr className="month-header">
                      <td colSpan={6} style={{ fontWeight: 'bold', backgroundColor: '#f2f2f2' }}>
                        {monthYear}
                      </td>
                    </tr>
                    {reportsInMonth.map((report, index) => {
  const globalIndex = reports.findIndex(r =>
    r.date === report.date &&
    r.assetName === report.assetName &&
    r.issueType === report.issueType
  );

  return (
    <tr key={`${groupIndex}-${index}`}>
      <td>{report.date}</td>
      <td>{report.assetName}</td>
      <td>{report.issueType}</td>
      <td>{report.reportedBy}</td>
      <td style={{ color: getStatusColor(report.status) }}>{report.status}</td>
      <td>
        <div className="action-buttons">
          {report.status === 'Pending' && (
            <>
              <button
                className="action-btn in-progress"
                onClick={() => handleStatusChange(globalIndex, 'In Progress')}
              >
                In Progress
              </button>
              <button
                className="action-btn resolved"
                onClick={() => handleStatusChange(globalIndex, 'Resolved')}
              >
                Resolved
              </button>
            </>
          )}

          {report.status === 'In Progress' && (
            <button
              className="action-btn resolved"
              onClick={() => handleStatusChange(globalIndex, 'Resolved')}
            >
              Resolved
            </button>
          )}

          {report.status === 'Resolved' && (
            <span className="status-completed">Completed</span>
          )}
        </div>
      </td>
    </tr>
  );
})}

                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>No reports found for selected filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
     
     
  );
};

export default Reports;
