
import "../assets/trial.css";

const Trial = () => {
  const cards = [
    {
      title: "App Development",
      team: "Marketing Team",
      timeLeft: "1 Weeks Left",
      progress: 34,
      iconClass: "icon-pink",
    },
    {
      title: "Web Design",
      team: "Core UI Team",
      timeLeft: "3 Weeks Left",
      progress: 76,
      iconClass: "icon-green",
    },
    {
      title: "Landing Page",
      team: "Marketing Team",
      timeLeft: "2 Days Left",
      progress: 4,
      iconClass: "icon-blue",
    },
    {
      title: "Business Compare",
      team: "Marketing Team",
      timeLeft: "1 Month Left",
      progress: 90,
      iconClass: "icon-orange",
    },
    {
      title: "Comerce Checkout",
      team: "Order Process Team",
      timeLeft: "3 Weeks Left",
      progress: 65,
      iconClass: "icon-purple",
    },
    {
      title: "Data Staging",
      team: "Core Data Team",
      timeLeft: "2 Month Left",
      progress: 96,
      iconClass: "icon-orange",
    },
    {
      title: "Campaign Store",
      team: "Internal Communication",
      timeLeft: "11 Days Left",
      progress: 24,
      iconClass: "icon-blue",
    },
    {
      title: "Acquisition Mitra",
      team: "Merchant Team",
      timeLeft: "1 Weeks Left",
      progress: 70,
      iconClass: "icon-pink",
    },
  ];

  return (
    <div className="trial-body">
    <div className="dashboard-container-trial">
      <aside className="sidebar-trial">
        <h2>Boardto</h2>
        <nav>
          <ul>
            <li>Boards</li>
            <li>Plan Schedule</li>
            <li className="active">Reporting</li>
            <li>Messages</li>
            <li>Team Member</li>
            <li>Tools Plugin</li>
            <li>Roadmap</li>
            <li>Setting</li>
            <li>Logout</li>
          </ul>
        </nav>
      </aside>
      <main className="main-content-trial">
        <header className="dashboard-header">
          <input type="text" placeholder="Search..." />
          <div className="user-info-trial">
            <span className="notif">🔔</span>
            <span className="user-name">Augusta Ryan</span>
          </div>
        </header>
        <section className="reporting">
          <h1>Reporting</h1>
          <div className="filter-tabs">
            <button className="active">All <span>50</span></button>
            <button>Started <span>20</span></button>
            <button>Approval <span>15</span></button>
            <button>Completed <span>34</span></button>
          </div>
          <div className="cards-grid">
            {cards.map((card, index) => (
              <div className="card" key={index}>
                <div className={`card-icon ${card.iconClass}`}></div>
                <h2>{card.title}</h2>
                <p>{card.team}</p>
                <p>{card.timeLeft}</p>
                <div className="card-footer">
                  <span>Team Member</span>
                  <span>Progress {card.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
    </div>
  );
};

export default Trial;
