import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { PaymentOrder } from "./PaymentOrder";

@Entity({ name: "payment_transactions" })
export class PaymentTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255 })
  order_id: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  transaction_id: string;

  @Column("decimal", { precision: 10, scale: 2 })
  amount: number;

  @Column({ type: "varchar", length: 50, nullable: true })
  status: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  payment_method: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  signature: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  signature_algorithm: string;

  @Column({ type: "jsonb", nullable: true })
  response_data: any;

  @CreateDateColumn({ type: "timestamp" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at: Date;

  // Relations
  @ManyToOne(() => PaymentOrder, (order) => order.transactions)
  @JoinColumn({ name: "order_id" })
  order: PaymentOrder;
}
