import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { PaymentOrder } from "./PaymentOrder";

@Entity({ name: "refunds" })
export class Refund {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255 })
  order_id: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  refund_id: string;

  @Column("decimal", { precision: 10, scale: 2 })
  amount: number;

  @Column({ type: "varchar", length: 50, nullable: true })
  status: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  unique_request_id: string;

  @CreateDateColumn({ type: "timestamp" })
  created_at: Date;

  // Relations
  @ManyToOne(() => PaymentOrder, (order) => order.refunds)
  @JoinColumn({ name: "order_id" })
  order: PaymentOrder;
}
