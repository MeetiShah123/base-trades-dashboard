
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

function PullStatus({ progress, jobStatus, processed, total, error }) {
  if (!jobStatus) return null;

  return (
    <div className="pull-card">
      <div className="pull-heading">
        <div>
          <h3>Data Synchronization</h3>
          <p>Background trade retrieval process</p>
        </div>

        {jobStatus === "running" && (
          <RefreshCw className="spin" size={22} />
        )}

        {jobStatus === "completed" && (
          <CheckCircle2 color="#22c55e" size={22} />
        )}

        {jobStatus === "failed" && (
          <AlertCircle color="#ef4444" size={22} />
        )}
      </div>

      <div className="progress-info">
        <span>
          {jobStatus === "completed"
            ? "Synchronization completed"
            : jobStatus === "failed"
            ? "Synchronization failed"
            : "Synchronizing trades..."}
        </span>

        <strong>{progress}%</strong>
      </div>

      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="progress-detail">
        {processed} of {total} trades processed
      </p>

      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

export default PullStatus;