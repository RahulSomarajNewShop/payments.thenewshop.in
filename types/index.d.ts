// Payment Integration Kit Type Definitions

export interface PaymentOrderData {
  order_id: string;
  amount: number;
  currency?: string;
  customer_id?: string;
  payment_page_client_id?: string;
  return_url?: string;
}

export interface PaymentTransactionData {
  order_id: string;
  transaction_id?: string;
  amount: number;
  status?: string;
  payment_method?: string;
  signature?: string;
  signature_algorithm?: string;
  response_data?: any;
}

export interface RefundData {
  order_id: string;
  refund_id?: string;
  amount: number;
  status?: string;
  unique_request_id?: string;
}

export interface UserData {
  username: string;
  password_hash: string;
  email?: string;
  is_active?: boolean;
}

export interface PaymentResponse {
  success: boolean;
  order_id: string;
  amount: number;
  status: string;
  database_status: string;
  gateway_status: string;
  transaction_details: any;
  gateway_response: any;
  last_updated: string;
}

export interface TestOrderResponse {
  order_id: string;
  amount: number;
  customer_id: string;
  message: string;
}

export interface TestDataResponse {
  orders: any[];
  transactions: any[];
  refunds: any[];
}

// Payment Handler Types
export interface OrderSessionParams {
  order_id: string;
  amount: number;
  currency?: string;
  return_url: string;
  customer_id?: string;
  payment_page_client_id?: string;
}

export interface OrderStatusParams {
  order_id: string;
}

export interface RefundParams {
  order_id: string;
  amount: number;
  unique_request_id?: string;
}

export interface APIException {
  status: string;
  errorCode: string;
  errorMessage: string;
  httpResponseCode: number;
}

// Database Types
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max: number;
  min: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

// Export all entities
export * from "../entities/PaymentOrder";
export * from "../entities/PaymentTransaction";
export * from "../entities/Refund";
export * from "../entities/User";
