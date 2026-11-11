
import { useEffect, useMemo, useRef, useState } from "react";

import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock3,
  Database,
  Download,
  RefreshCw,
  Search,
  Server,
  TrendingUp,
  Wifi,
  WifiOff,
  XCircle
} from "lucide-react";

import {
  fetchTrades,
  startTradePull,
  fetchActivePull
} from "./services/api";

import { socket } from "./services/socket";
import "./App.css";

const PAGE_SIZE = 100;

// Format date and time
function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

// Format price in Indian currency
function formatPrice(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2
  });
}

function App() {
  // Application state
  const [trades, setTrades] = useState([]);
  const [totalTrades, setTotalTrades] = useState(0);

  const [page, setPage] = useState(1);
  const pageRef = useRef(1);

  const [search, setSearch] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const [pulling, setPulling] = useState(false);
  const [pullStatus, setPullStatus] = useState(null);

  const [error, setError] = useState("");

  // Keep current page available to WebSocket callbacks
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  // Load trades from MongoDB
  const loadTrades = async (selectedPage = 1) => {
    try {
      setLoading(true);
      setError("");

      const data = await fetchTrades(selectedPage, PAGE_SIZE);

      setTrades(data.trades || []);
      setTotalTrades(data.total || 0);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load trades. Please check the backend connection."
      );
    } finally {
      setLoading(false);
    }
  };

  // Restore an existing pull after opening or refreshing dashboard
  const loadActivePull = async () => {
    try {
      const data = await fetchActivePull();

      if (!data.job) {
        return;
      }

      const job = data.job;

      const progress =
        job.totalTrades > 0
          ? Math.round(
              (job.processedTrades / job.totalTrades) * 100
            )
          : 0;

      setPulling(
        job.status === "queued" ||
        job.status === "running"
      );

      setPullStatus({
        status: job.status,
        progress,
        processedTrades: job.processedTrades || 0,
        totalTrades: job.totalTrades || 0,
        batchesCompleted: job.batchesCompleted || 0,
        totalBatches: job.totalBatches || 0,
        error: job.error || null
      });
    } catch (err) {
      console.error(
        "Unable to restore active pull:",
        err.message
      );
    }
  };

  // Initialize application and WebSocket connection
  useEffect(() => {
    loadTrades(1);
    loadActivePull();

    socket.connect();

    // Connection established
    const handleConnect = () => {
      setConnected(true);
    };

    // Connection disconnected
    const handleDisconnect = () => {
      setConnected(false);
    };

    // Receive newly inserted trades
    const handleNewTrades = (newTrades) => {
      if (!Array.isArray(newTrades) || newTrades.length === 0) {
        return;
      }

      setTotalTrades((previous) => previous + newTrades.length);

      // Update first page automatically
      if (pageRef.current === 1) {
        setTrades((previous) => {
          const existingIds = new Set(
            previous.map((trade) => trade.tradeId)
          );

          const uniqueTrades = newTrades.filter(
            (trade) => !existingIds.has(trade.tradeId)
          );

          return [...uniqueTrades, ...previous].slice(
            0,
            PAGE_SIZE
          );
        });
      }
    };

    // Receive pull progress updates
    const handlePullProgress = (data) => {
      setPulling(true);

      setPullStatus({
        status: "running",
        progress: data.progress || 0,
        processedTrades: data.processedTrades || 0,
        totalTrades: data.totalTrades || 0,
        batchesCompleted: data.batchesCompleted || 0,
        totalBatches: data.totalBatches || 0
      });
    };

    // Pull completed successfully
    const handlePullCompleted = (data) => {
      setPulling(false);

      setPullStatus({
        status: "completed",
        progress: 100,
        processedTrades: data.processedTrades || 0,
        totalTrades: data.totalTrades || 0
      });

      // Return to first page and refresh stored records
      setPage(1);
      pageRef.current = 1;
      loadTrades(1);
    };

    // Pull failed
    const handlePullFailed = (data) => {
      setPulling(false);

      setPullStatus({
        status: "failed",
        error: data.error || "The pull operation failed."
      });
    };

    // Register listeners
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("newTrades", handleNewTrades);
    socket.on("pullProgress", handlePullProgress);
    socket.on("pullCompleted", handlePullCompleted);
    socket.on("pullFailed", handlePullFailed);

    // Handle an already connected socket
    if (socket.connected) {
      setConnected(true);
    }

    // Cleanup listeners
    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("newTrades", handleNewTrades);
      socket.off("pullProgress", handlePullProgress);
      socket.off("pullCompleted", handlePullCompleted);
      socket.off("pullFailed", handlePullFailed);

      socket.disconnect();
    };
  }, []);

  // Start a new trade pull
  const handleStartPull = async () => {
    try {
      setError("");

      const result = await startTradePull();

      setPulling(true);

      setPullStatus({
        status: result.status || "queued",
        progress: 0,
        processedTrades: 0,
        totalTrades: 0
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to start the data pull."
      );
    }
  };

  // Search trades on the currently loaded page
  const filteredTrades = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) {
      return trades;
    }

    return trades.filter((trade) =>
      [
        trade.tradeId,
        trade.client,
        trade.symbol,
        trade.quantity
      ].some((value) =>
        String(value).toLowerCase().includes(term)
      )
    );
  }, [trades, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(totalTrades / PAGE_SIZE)
  );

  const progress = pullStatus?.progress || 0;
  const completedCount = pullStatus?.processedTrades || 0;

  // Navigate between pages
  const changePage = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages) {
      return;
    }

    setPage(nextPage);
    pageRef.current = nextPage;
    setSearch("");
    loadTrades(nextPage);
  };

  return (
    <div className="app-shell">

      {/* Header */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">B</div>

          <div>
            <h1>BSE TradeFlow</h1>
            <span>Exchange Data Management</span>
          </div>
        </div>

        <div className="topbar-right">

          <div
            className={`connection ${
              connected ? "online" : "offline"
            }`}
          >
            {connected ? (
              <Wifi size={15} />
            ) : (
              <WifiOff size={15} />
            )}

            <span>
              {connected ? "Live connection" : "Disconnected"}
            </span>
          </div>

          <div className="user-profile">
            <div className="avatar">AD</div>

            <div className="profile-text">
              <strong>Administrator</strong>
              <span>Data Operations</span>
            </div>
          </div>

        </div>
      </header>

      <main className="main-content">

        {/* Page heading */}
        <section className="page-heading">
          <div>
            <div className="eyebrow">
              EXCHANGE OPERATIONS / OVERVIEW
            </div>

            <h2>Trade Dashboard</h2>

            <p>
              Monitor exchange trade records and manage data
              synchronization.
            </p>
          </div>

          <div className="heading-actions">

            <button
              className="button button-secondary"
              onClick={() => loadTrades(1)}
              disabled={loading}
            >
              <RefreshCw size={15} />
              Refresh data
            </button>

            <button
              className="button button-primary"
              onClick={handleStartPull}
              disabled={pulling}
            >
              <ArrowDownToLine size={16} />

              {pulling
                ? "Pull in progress"
                : "Start data pull"}
            </button>

          </div>
        </section>

        {/* Error message */}
        {error && (
          <div className="alert alert-error">
            <XCircle size={17} />
            <span>{error}</span>
          </div>
        )}

        {/* Statistics */}
        <section className="stats-grid">

          <div className="stat-card">
            <div className="stat-top">
              <span>Total stored trades</span>
              <Database size={18} />
            </div>

            <div className="stat-value">
              {totalTrades.toLocaleString("en-IN")}
            </div>

            <div className="stat-caption">
              Records available in database
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span>Data source</span>
              <Server size={18} />
            </div>

            <div className="stat-value stat-text">
              BSE API
            </div>

            <div className="stat-caption">
              Mock exchange endpoint
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span>Synchronization</span>
              <Activity size={18} />
            </div>

            <div className="stat-value stat-text">
              {pulling ? "In progress" : "Standby"}
            </div>

            <div className="stat-caption">
              {pulling
                ? "Receiving trade batches"
                : "No active pull session"}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span>Connection</span>
              <TrendingUp size={18} />
            </div>

            <div
              className={`stat-value stat-text ${
                connected ? "green-text" : ""
              }`}
            >
              {connected ? "Connected" : "Offline"}
            </div>

            <div className="stat-caption">
              Real-time event channel
            </div>
          </div>

        </section>

        {/* Synchronization panel */}
        <section className="sync-panel">

          <div className="sync-heading">

            <div className="sync-title">
              <div className="sync-icon">
                <Download size={18} />
              </div>

              <div>
                <h3>Data synchronization</h3>
                <p>Background trade retrieval process</p>
              </div>
            </div>

            <span
              className={`status-pill ${
                pullStatus?.status || "standby"
              }`}
            >
              <Circle size={7} fill="currentColor" />

              {pullStatus?.status || "Standby"}
            </span>

          </div>

          {pullStatus ? (
            <>
              <div className="progress-info">

                <span>
                  {pullStatus.status === "completed"
                    ? "Synchronization completed"
                    : pullStatus.status === "failed"
                    ? "Synchronization failed"
                    : "Processing trade records"}
                </span>

                <strong>{progress}%</strong>

              </div>

              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${progress}%`
                  }}
                />
              </div>

              <div className="sync-footer">

                <span>
                  {completedCount.toLocaleString("en-IN")}
                  {" records processed"}

                  {pullStatus.totalTrades
                    ? ` / ${pullStatus.totalTrades.toLocaleString(
                        "en-IN"
                      )}`
                    : ""}
                </span>

                {pullStatus.totalBatches !== undefined && (
                  <span>
                    Batch {pullStatus.batchesCompleted || 0}
                    {" of "}
                    {pullStatus.totalBatches}
                  </span>
                )}

              </div>

              {pullStatus.error && (
                <div className="sync-error">
                  {pullStatus.error}
                </div>
              )}
            </>
          ) : (
            <div className="empty-sync">
              <Clock3 size={17} />

              <span>
                No synchronization session has been started.
                Start a pull to retrieve the latest exchange records.
              </span>
            </div>
          )}

        </section>

        {/* Trade records */}
        <section className="trades-section">

          <div className="table-heading">

            <div>
              <h3>Trade records</h3>

              <p>
                Exchange transactions stored in the database
              </p>
            </div>

            <div className="table-tools">

              <div className="search-box">
                <Search size={16} />

                <input
                  type="text"
                  placeholder="Search ID, client or symbol..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <span className="record-count">
                {totalTrades.toLocaleString("en-IN")} records
              </span>

            </div>

          </div>

          {/* Table */}
          <div className="table-container">

            <table>
              <thead>
                <tr>
                  <th>TRADE ID</th>
                  <th>CLIENT</th>
                  <th>SYMBOL</th>
                  <th className="align-right">QUANTITY</th>
                  <th className="align-right">PRICE</th>
                  <th>TIMESTAMP</th>
                  <th>STATUS</th>
                </tr>
              </thead>

              <tbody>

                {loading ? (
                  <tr>
                    <td colSpan="7" className="table-message">
                      Loading trade records...
                    </td>
                  </tr>
                ) : filteredTrades.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="table-message">
                      No matching trade records found.
                    </td>
                  </tr>
                ) : (
                  filteredTrades.map((trade) => (
                    <tr key={trade.tradeId}>

                      <td className="trade-id">
                        {trade.tradeId}
                      </td>

                      <td>{trade.client}</td>

                      <td>
                        <span className="symbol-tag">
                          {trade.symbol}
                        </span>
                      </td>

                      <td className="align-right">
                        {Number(
                          trade.quantity
                        ).toLocaleString("en-IN")}
                      </td>

                      <td className="align-right price-cell">
                        {formatPrice(trade.price)}
                      </td>

                      <td className="timestamp-cell">
                        {formatDate(trade.timestamp)}
                      </td>

                      <td>
                        <span className="record-status">
                          <CheckCircle2 size={13} />
                          Stored
                        </span>
                      </td>

                    </tr>
                  ))
                )}

              </tbody>
            </table>

          </div>

          {/* Pagination */}
          <div className="table-pagination">

            <span>
              Showing{" "}
              {totalTrades === 0
                ? 0
                : (page - 1) * PAGE_SIZE + 1}
              {" – "}
              {Math.min(page * PAGE_SIZE, totalTrades)}
              {" of "}
              {totalTrades.toLocaleString("en-IN")}
              {" records"}
            </span>

            <div className="pagination-actions">

              <button
                className="page-button"
                disabled={page <= 1 || loading}
                onClick={() => changePage(page - 1)}
              >
                <ArrowLeft size={15} />
                Previous
              </button>

              <span className="page-number">
                {page} / {totalPages}
              </span>

              <button
                className="page-button"
                disabled={page >= totalPages || loading}
                onClick={() => changePage(page + 1)}
              >
                Next
                <ArrowRight size={15} />
              </button>

            </div>

          </div>

        </section>

        {/* Footer */}
        <footer className="footer">
          <span>
            BSE TradeFlow · Exchange Data Management System
          </span>

          <span>
            Real-time updates powered by WebSockets
          </span>
        </footer>

      </main>
    </div>
  );
}

export default App;
