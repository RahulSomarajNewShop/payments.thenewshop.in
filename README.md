# Payment Integration Kit for The New Shop

This package provides a complete payment integration solution for The New Shop with TypeORM entities, payment processing, and database management.

## 🚀 Quick Start

### Installation

```bash
npm install @thenewshop/payment-integration-kit
```

### Basic Usage

```typescript
import {
  PaymentOrder,
  PaymentTransaction,
  Refund,
  User,
  PaymentOrderData,
  PaymentResponse,
} from "@thenewshop/payment-integration-kit";

// Use entities in your TypeORM configuration
const entities = [PaymentOrder, PaymentTransaction, Refund, User];
```

## 📦 Package Contents

### Entities

- **PaymentOrder**: Main order entity with payment details
- **PaymentTransaction**: Transaction tracking with HMAC validation
- **Refund**: Refund management and tracking
- **User**: User management for audit compliance

### API Endpoints

- `POST /initiatePayment`: Create new payment order
- `POST /handlePaymentResponse`: Process payment response with validation
- `GET /orderStatus/:orderId`: Dual inquiry status check
- `POST /initiateRefund`: Process refunds
- `GET /test/generateOrder`: Generate test orders
- `GET /test/orders`: View all test data

## 🔧 Integration with The New Shop

### 1. Database Setup

Add to your TypeORM configuration:

```typescript
// ormconfig.ts
import { DataSource } from "typeorm";
import {
  PaymentOrder,
  PaymentTransaction,
  Refund,
  User,
} from "@thenewshop/payment-integration-kit";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [PaymentOrder, PaymentTransaction, Refund, User],
  synchronize: true, // Be careful in production
  logging: true,
});
```

### 2. Environment Configuration

```env
# Database Configuration
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=your_database
DB_USER=your_username
DB_PASSWORD=your_password

# Payment Gateway Configuration
JUSPAY_API_KEY=your_api_key
JUSPAY_MERCHANT_ID=your_merchant_id

# Application Settings
FRONTEND_BASE_URL=https://your-frontend-url.com
PORT=5000
```

### 3. Using Entities in Your Project

```typescript
// services/PaymentService.ts
import { Repository } from "typeorm";
import {
  PaymentOrder,
  PaymentTransaction,
} from "@thenewshop/payment-integration-kit";

export class PaymentService {
  constructor(
    private orderRepo: Repository<PaymentOrder>,
    private transactionRepo: Repository<PaymentTransaction>
  ) {}

  async createOrder(orderData: PaymentOrderData): Promise<PaymentOrder> {
    const order = this.orderRepo.create(orderData);
    return await this.orderRepo.save(order);
  }

  async getOrderStatus(orderId: string): Promise<PaymentResponse> {
    // Implementation using the payment kit
  }
}
```

### 4. API Integration

```typescript
// controllers/PaymentController.ts
import {
  PaymentOrder,
  PaymentOrderData,
} from "@thenewshop/payment-integration-kit";

export class PaymentController {
  async initiatePayment(req: Request, res: Response) {
    const orderData: PaymentOrderData = {
      order_id: req.body.order_id,
      amount: req.body.amount,
      customer_id: req.body.customer_id,
    };

    // Use the payment kit's logic
    // The kit handles HMAC validation, database storage, and payment processing
  }
}
```

## 🔒 Security Features

- **HMAC Validation**: All payment responses are validated using HMAC-SHA256
- **Amount Validation**: Database validation ensures amount integrity
- **Dual Inquiry**: Status checks both database and payment gateway
- **Audit Trail**: Complete transaction history preserved

## 🧪 Testing

### Generate Test Orders

```bash
GET /test/generateOrder
```

### View Test Data

```bash
GET /test/orders
```

### Test Payment Flow

1. Create order via `/initiatePayment`
2. Process payment response via `/handlePaymentResponse`
3. Check status via `/orderStatus/:orderId`

## 📊 Database Schema

### payment_orders

- `id`: Primary key
- `order_id`: Unique order identifier
- `amount`: Payment amount
- `currency`: Currency code (default: INR)
- `customer_id`: Customer identifier
- `status`: Order status
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### payment_transactions

- `id`: Primary key
- `order_id`: Foreign key to orders
- `transaction_id`: Gateway transaction ID
- `amount`: Transaction amount
- `status`: Transaction status
- `signature`: HMAC signature
- `response_data`: Complete response data (JSONB)

### refunds

- `id`: Primary key
- `order_id`: Foreign key to orders
- `refund_id`: Gateway refund ID
- `amount`: Refund amount
- `status`: Refund status
- `unique_request_id`: Unique refund identifier

### users

- `id`: Primary key
- `username`: Unique username
- `password_hash`: Hashed password
- `email`: User email
- `is_active`: Account status

## 🔄 Payment Flow

1. **Order Creation**: Store order in database
2. **Payment Initiation**: Call payment gateway
3. **Response Processing**: Validate HMAC and store transaction
4. **Status Updates**: Update order status based on gateway response
5. **Dual Inquiry**: Provide status API for verification

## 📝 Requirements Compliance

✅ **Database Storage**: All transactions stored with status tracking
✅ **Payment Confirmation**: Based on database status validation
✅ **Multiple Test Transactions**: Test endpoints provided
✅ **User Credentials**: Available till audit completion
✅ **Database Records**: Preserved till audit completion
✅ **UAT Setup**: Identical to production configuration
✅ **Dual Inquiry**: Status API implemented (Mandatory)

## 🤝 Support

For integration support with The New Shop project, contact the development team.

## 📄 License

MIT License - see LICENSE file for details.
