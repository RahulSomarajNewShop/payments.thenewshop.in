# PostgreSQL Database Setup

This guide will help you set up PostgreSQL integration for the Juspay Node.js backend kit.

## Prerequisites

1. PostgreSQL installed and running on your system
2. Node.js and npm installed

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This will install the required PostgreSQL dependencies:

- `pg`: PostgreSQL client for Node.js
- `dotenv`: Environment variable management

### 2. Environment Configuration

1. Copy the environment template:

   ```bash
   cp env.example .env
   ```

2. Edit the `.env` file with your PostgreSQL credentials:

   ```env
   # PostgreSQL Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=your_database_name
   DB_USER=your_username
   DB_PASSWORD=your_password

   # Database Connection Pool Settings
   DB_POOL_MIN=2
   DB_POOL_MAX=10
   DB_POOL_IDLE_TIMEOUT=30000
   DB_POOL_ACQUIRE_TIMEOUT=60000

   # Application Settings
   NODE_ENV=development
   PORT=5000
   ```

### 3. Database Setup

1. Create a PostgreSQL database:

   ```sql
   CREATE DATABASE your_database_name;
   ```

2. Create a user (if needed):
   ```sql
   CREATE USER your_username WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE your_database_name TO your_username;
   ```

### 4. Using the Database

The database connection is configured in `database.js`. You can import and use it in your routes:

```javascript
const { query, getClient } = require("./database");

// Example: Execute a simple query
app.get("/users", async (req, res) => {
  try {
    const result = await query("SELECT * FROM users");
    res.json(result.rows);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Example: Using a client for transactions
app.post("/transaction", async (req, res) => {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    // Your transaction queries here
    await client.query("COMMIT");
    res.json({ success: true });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});
```

## Database Schema Examples

Here are some example tables you might want to create for payment tracking:

```sql
-- Orders table
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(255) UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  customer_id VARCHAR(255),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment transactions table
CREATE TABLE payment_transactions (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(255) REFERENCES orders(order_id),
  transaction_id VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50),
  payment_method VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Refunds table
CREATE TABLE refunds (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(255) REFERENCES orders(order_id),
  refund_id VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Testing the Connection

You can test the database connection by running:

```bash
npm start
```

If the connection is successful, you should see:

```
Connected to PostgreSQL database
Server is running on http://localhost:5000
```

## Troubleshooting

1. **Connection refused**: Make sure PostgreSQL is running and the port is correct
2. **Authentication failed**: Check your username and password in the `.env` file
3. **Database does not exist**: Create the database first using the SQL commands above
4. **Permission denied**: Make sure your user has the necessary privileges

## Security Notes

- Never commit your `.env` file to version control
- Use strong passwords for your database
- Consider using SSL connections for production environments
- Regularly update your PostgreSQL installation for security patches
