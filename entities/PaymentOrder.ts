import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { PaymentTransaction } from "./PaymentTransaction";
import { Refund } from "./Refund";

@Entity({ name: "payment_orders" })
export class PaymentOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  order_id: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  po_id: string;

  @Column("decimal", { precision: 10, scale: 2 })
  amount: number;

  @Column({ type: "varchar", length: 3, default: "INR" })
  currency: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  customer_id: string;

  @Column({ type: "varchar", length: 50, default: "PENDING" })
  status: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  payment_page_client_id: string;

  @Column({ type: "text", nullable: true })
  return_url: string;

  @Column({ type: "jsonb", nullable: true })
  session_data: any;

  @Column({ type: "varchar", length: 255, nullable: true })
  session_id: string;

  @Column({ type: "jsonb", nullable: true })
  payment_links: any;

  @Column({ type: "timestamp", nullable: true })
  order_expiry: Date;

  @Column({ type: "jsonb", nullable: true })
  sdk_payload: any;

  @CreateDateColumn({ type: "timestamp" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at: Date;

  // Relations
  @OneToMany(() => PaymentTransaction, (transaction) => transaction.order)
  transactions: PaymentTransaction[];

  @OneToMany(() => Refund, (refund) => refund.order)
  refunds: Refund[];
}
