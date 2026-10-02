import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import type { Relation } from 'typeorm';
import { AutoIncBaseEntity } from '../../common/entities/autoinc-base.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { Depot } from './depot.entity';
import { Outlet } from './outlet.entity';

@Entity('users')
@Unique(['email'])
export class User extends AutoIncBaseEntity {
  @Column({ length: 150 })
  email: string;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash: string;

  // Never selected by default, so it cannot leak into a response; ask for it
  // explicitly (`addSelect`) where a PIN is being checked.
  @Column({ name: 'pin_hash', type: 'text', nullable: true, select: false })
  pinHash: string | null;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({ length: 20, nullable: true, unique: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  avatar: string | null;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  // Where a dispatcher, loader or driver works.
  @Column({ name: 'depot_id', type: 'int', nullable: true })
  depotId: number | null;

  @ManyToOne(() => Depot, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'depot_id' })
  depot?: Relation<Depot> | null;

  // The outlet a store manager orders for.
  @Column({ name: 'outlet_id', type: 'int', nullable: true })
  outletId: number | null;

  @ManyToOne(() => Outlet, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'outlet_id' })
  outlet?: Relation<Outlet> | null;
}
