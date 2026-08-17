import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('rooms')
export class Room {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', length: 255, nullable: true })
	name?: string;

	@Column({ type: 'text', nullable: true })
	description?: string | null;

	@Column({ type: 'numeric', nullable: true })
	price?: number | null;

	@Column({ type: 'int', nullable: true })
	capacity?: number | null;

	@Column({ type: 'timestamp', nullable: true })
	createdAt?: Date | null;

	@Column({ type: 'timestamp', nullable: true })
	updatedAt?: Date | null;
}
