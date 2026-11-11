
import { Activity, Radio } from "lucide-react";

function Header({ connected }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-icon">
          <Activity size={23} />
        </div>

        <div>
          <h2>BSE TradeFlow</h2>
          <span>TRADE MANAGEMENT SYSTEM</span>
        </div>
      </div>

      <div className="connection">
        <span className={`connection-dot ${connected ? "online" : "offline"}`} />
        <Radio size={16} />
        {connected ? "Live Connected" : "Reconnecting..."}
      </div>
    </header>
  );
}

export default Header;