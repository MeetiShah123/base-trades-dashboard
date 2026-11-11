
# BSE TradeFlow – Exchange Data Management Dashboard

A full-stack trade data ingestion and monitoring application built to simulate the retrieval of large volumes of trade records from a BSE-like exchange API.

The application uses batch-based HTTP requests, MongoDB persistence, background processing, and WebSocket communication to make trade records available progressively without keeping a long-running HTTP connection open.

## 1. Problem Statement

The exchange API may take up to 15 minutes to complete a full trade-data pull. However, the network environment terminates HTTP connections that remain open for more than 30 seconds.

A conventional approach that holds a single HTTP request open for the entire operation is therefore unreliable.

The objective is to retrieve the data in smaller independent requests, persist each batch, and make newly available records visible on an already-open dashboard without requiring manual refreshes or periodic polling.

## 2. Solution Overview

BSE TradeFlow separates the data retrieval process from the dashboard request lifecycle.

- The dashboard starts a pull through a short HTTP request.
- The backend creates a pull job and immediately acknowledges the request.
- A background worker retrieves records in independent batches.
- Each batch is stored in MongoDB.
- Socket.IO broadcasts newly inserted records and progress updates.
- The React dashboard updates automatically using WebSocket events.

The application also restores the active pull's persisted status when the dashboard is opened or refreshed.

## 3. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite |
| Styling | CSS |
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| HTTP communication | Axios, REST API |
| Real-time communication | Socket.IO |
| Mock exchange service | Express |
| Development tools | VS Code, npm |

## 4. Architecture

```text
                 React Dashboard
                        |
              REST API / Socket.IO
                        |
                 Express Backend
                        |
             Pull Job Management
                        |
                Background Worker
                        |
              Batch HTTP Requests
                        |
                 Mock BSE API
                        |
                 Trade Records
                        |
                    MongoDB
                        |
              Socket.IO Broadcasts
                        |
                 React Dashboard
```

## 5. Main Features

- Mock exchange API containing 3,000 seeded trade records.
- Configurable data-pull duration.
- Batch-based data retrieval.
- Background trade processing.
- MongoDB persistence using bulk upserts.
- Live trade updates through WebSockets.
- Real-time pull progress monitoring.
- Active pull status restoration after dashboard reload.
- Trade search and pagination.
- Prevention of duplicate records using unique trade IDs.

## 6. API Endpoints

### Mock BSE API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Check mock API health |
| GET | `/getTrades` | Retrieve a batch of trades |

### Backend API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Backend health check |
| GET | `/api/trades` | Retrieve stored trade records |
| POST | `/api/pulls` | Start a new pull |
| GET | `/api/pulls/active` | Retrieve an active pull |
| GET | `/api/pulls/:id` | Retrieve pull status |

## 7. WebSocket Events

| Event | Description |
|---|---|
| `connectionStatus` | Reports connection status |
| `newTrades` | Sends newly inserted trades |
| `pullProgress` | Sends batch progress |
| `pullCompleted` | Indicates successful completion |
| `pullFailed` | Reports a pull failure |

## 8. Database Design

### Trade Collection

Stores the retrieved exchange records.

Fields:
- tradeId
- client
- symbol
- quantity
- price
- timestamp

The trade ID is unique to prevent duplicate records.

### PullJob Collection

Tracks the progress and status of each data retrieval operation.

Fields:
- status
- totalTrades
- processedTrades
- batchesCompleted
- totalBatches
- startedAt
- completedAt
- error

## 9. Installation and Setup

### Prerequisites

- Node.js and npm
- MongoDB local installation or MongoDB Atlas account
- Git

### Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd bse-trades-dashboard
```

### Configure the backend

```bash
cd backend
npm install
```

Create a `.env` file using `.env.example` as a reference.

Configure the MongoDB connection string.

### Configure the frontend

Open another terminal:

```bash
cd frontend
npm install
```

Create a `.env` file using the frontend `.env.example`.

## 10. Running the Application

Run the following services in three separate terminals.

### Terminal 1 – Mock BSE API

```bash
cd backend
npm run mock
```

### Terminal 2 – Backend server

```bash
cd backend
npm run dev
```

### Terminal 3 – React frontend

```bash
cd frontend
npm run dev
```

Open:

http://localhost:5173

## 11. Configuration

The backend supports configurable pull parameters:

| Variable | Description | Default |
|---|---|---|
| `PULL_DURATION_MS` | Approximate pull duration | 900000 |
| `BATCH_SIZE` | Records per batch | 100 |
| `MOCK_REQUEST_DELAY_MS` | Mock API response delay | 200 |
| `PORT` | Backend port | 5000 |
| `MOCK_BSE_PORT` | Mock API port | 4001 |

For a 15-minute demonstration, set `PULL_DURATION_MS=900000`.

For quicker functional testing, temporarily use a smaller value such as `60000`.

## 12. Handling the 30-Second Connection Limitation

The application does not keep a single HTTP connection open for the entire 15-minute operation.

Instead, the background worker retrieves data through multiple independent HTTP requests. Each request retrieves a limited batch and completes separately.

The worker stores each batch in MongoDB and broadcasts progress using WebSockets.

This separates the long-running ingestion process from the short-lived HTTP request that starts it.

## 13. Reliability and Design Considerations

- Unique trade IDs and upserts help prevent duplicate database records.
- Pull job progress is stored in MongoDB.
- The dashboard retrieves active pull status when it loads.
- WebSocket reconnection is enabled in the frontend.
- The current background worker runs within the backend process. A production deployment should use a durable job queue or worker recovery mechanism to resume work after a process restart.
- The mock exchange API is intended for assessment and demonstration, not production trading.

## 14. Future Enhancements

- Durable background processing using Redis and BullMQ.
- Authentication and role-based access control.
- Improved failure recovery and retry mechanisms.
- Advanced trade filtering and export functionality.
- Deployment to a cloud environment.
- Monitoring and operational logging.

## 15. Conclusion

BSE TradeFlow demonstrates how long-running data ingestion can be handled without relying on a single long-lived HTTP connection.

By combining independent batch requests, background processing, MongoDB persistence, and WebSocket communication, the application makes progressively retrieved trade records available to users through a responsive dashboard.