import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import "../../superadmincss/ClinicalLab.css";

// Sample appointments data
const sampleAppointments = [
  { id: 1, lastName: 'Doe', firstName: 'John', middleInitial: 'A', age: 30, gender: 'Male', date: '2025-05-01', status: 'approved' },
  { id: 2, lastName: 'Smith', firstName: 'Jane', middleInitial: 'B', age: 25, gender: 'Female', date: '2025-05-10', status: 'pending' },
  { id: 3, lastName: 'Johnson', firstName: 'Alice', middleInitial: 'C', age: 40, gender: 'Female', date: '2025-05-08', status: 'cancelled' },
  { id: 4, lastName: 'Brown', firstName: 'Bob', middleInitial: 'D', age: 50, gender: 'Male', date: '2025-04-15', status: 'approved' },
  { id: 5, lastName: 'Wilson', firstName: 'Clara', middleInitial: 'E', age: 28, gender: 'Female', date: '2025-05-11', status: 'approved' },
  { id: 6, lastName: 'Garcia', firstName: 'Luis', middleInitial: 'F', age: 35, gender: 'Male', date: '2025-05-09', status: 'pending' },
  { id: 7, lastName: 'Martinez', firstName: 'Maya', middleInitial: 'G', age: 45, gender: 'Female', date: '2025-04-22', status: 'approved' },
  { id: 8, lastName: 'Lee', firstName: 'Kevin', middleInitial: 'H', age: 38, gender: 'Male', date: '2025-05-03', status: 'cancelled' },
  { id: 9, lastName: 'Clark', firstName: 'Diana', middleInitial: 'I', age: 32, gender: 'Female', date: '2025-05-12', status: 'approved' },
  { id: 10, lastName: 'Lewis', firstName: 'Peter', middleInitial: 'J', age: 29, gender: 'Male', date: '2025-04-30', status: 'pending' },
];

const Dental: React.FC = () => {
  const [appointments] = useState(sampleAppointments);
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Years from 2020 to 2030
  const years = [];
  for (let y = 2020; y <= 2030; y++) {
    years.push(y.toString());
  }

  // Filter appointments by selected year and month
  const filteredAppointments = appointments.filter((app) => {
    const appDate = new Date(app.date);
    const yearMatch = selectedYear === 'all' || appDate.getFullYear().toString() === selectedYear;
    const monthMatch = selectedMonth === 'all' || (appDate.getMonth() + 1).toString().padStart(2, '0') === selectedMonth;
    return yearMatch && monthMatch;
  });

  // Group by date and count statuses for each date
  // We'll create an object where keys are dates and values are counts per status
  const dateStatusMap: Record<string, { approved: number; pending: number; cancelled: number }> = {};

  filteredAppointments.forEach(({ date, status }) => {
    if (!dateStatusMap[date]) {
      dateStatusMap[date] = { approved: 0, pending: 0, cancelled: 0 };
    }
    if (status === 'approved') dateStatusMap[date].approved += 1;
    else if (status === 'pending') dateStatusMap[date].pending += 1;
    else if (status === 'cancelled') dateStatusMap[date].cancelled += 1;
  });

  // Convert the map to an array sorted by date
  const chartData = Object.entries(dateStatusMap)
    .map(([date, counts]) => ({
      date,
      ...counts,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="p-6">
        
        <div className='title-admin'>
             <h2>Drug Dependency Exam Data</h2>
        </div>
      <div className="filter-container-admin">
        <select
          className="filter-admin"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
        >
          <option value="all">All Year</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        <select
          className="filter-admin"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        >
          <option value="all">All Months</option>
          <option value="01">January</option>
          <option value="02">February</option>
          <option value="03">March</option>
          <option value="04">April</option>
          <option value="05">May</option>
          <option value="06">June</option>
          <option value="07">July</option>
          <option value="08">August</option>
          <option value="09">September</option>
          <option value="10">October</option>
          <option value="11">November</option>
          <option value="12">December</option>
        </select>

        <select
          className="filter-admin"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">Total Appointments</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="lineChart-admin">
        <LineChart width={1200} height={400} data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={(date) => date.slice(5)} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          {(filterType === 'all' || filterType === 'approved') && (
            <Line type="monotone" dataKey="approved" stroke="#28a745" activeDot={{ r: 8 }} />
          )}
          {(filterType === 'all' || filterType === 'pending') && (
            <Line type="monotone" dataKey="pending" stroke="#ff8800" activeDot={{ r: 8 }} />
          )}
          {(filterType === 'all' || filterType === 'cancelled') && (
            <Line type="monotone" dataKey="cancelled" stroke="#dc3545" activeDot={{ r: 8 }} />
          )}
        </LineChart>
      </div>

      <table className="patient-admin">
        <thead>
          <tr className="patient-table">
            <th className="patient-details">ID</th>
            <th className="patient-details">Last Name</th>
            <th className="patient-details">First Name</th>
            <th className="patient-details">M.I.</th>
            <th className="patient-details">Age</th>
            <th className="patient-details">Gender</th>
            <th className="patient-details">Date Appointed</th>
            <th className="patient-details">Status</th>
          </tr>
        </thead>
        <tbody>
          {filteredAppointments
            .filter((a) => filterType === 'all' || a.status === filterType)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((app) => (
              <tr key={app.id} className="border-t">
                <td className="py-3 px-6">{app.id}</td>
                <td className="py-3 px-6">{app.lastName}</td>
                <td className="py-3 px-6">{app.firstName}</td>
                <td className="py-3 px-6">{app.middleInitial}</td>
                <td className="py-3 px-6">{app.age}</td>
                <td className="py-3 px-6">{app.gender}</td>
                <td className="py-3 px-6">{app.date}</td>
                <td className="py-3 px-6 capitalize">{app.status}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
};

export default Dental;
