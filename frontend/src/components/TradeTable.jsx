
import { useState } from "react";
import { Search } from "lucide-react";

function TradeTable({ trades }) {
  const [search, setSearch] = useState("");

  const filteredTrades = trades.filter((trade) => {
    const term = search.toLowerCase();

    return (
      trade.tradeId?.toLowerCase().includes(term) ||
      trade.client?.toLowerCase().includes(term) ||
      trade.symbol?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="table-card">
      <div className="table-heading">
        <div>
          <h3>Recent Trades</h3>
          <p>Live exchange transaction records</p>
        </div>

        <div className="search-box">
          <Search size={17} />
          <input
            type="text"
            placeholder="Search trades..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>TRADE ID</th>
              <th>CLIENT</th>
              <th>SYMBOL</th>
              <th>QUANTITY</th>
              <th>PRICE</th>
              <th>TIMESTAMP</th>
            </tr>
          </thead>

          <tbody>
            {filteredTrades.length > 0 ? (
              filteredTrades.map((trade) => (
                <tr key={trade.tradeId}>
                  <td className="trade-id">{trade.tradeId}</td>

                  <td>{trade.client}</td>

                  <td>
                    <span className="symbol-badge">
                      {trade.symbol}
                    </span>
                  </td>

                  <td>{trade.quantity?.toLocaleString("en-IN")}</td>

                  <td>
                    ₹{Number(trade.price).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </td>

                  <td>
                    {new Date(trade.timestamp).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="empty-state">
                  No matching trades found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        Showing {filteredTrades.length} trades
      </div>
    </div>
  );
}

export default TradeTable;