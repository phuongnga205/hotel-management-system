export class BookingResponseDto {
    id!: number;
    roomId!: number;
    checkInDate!: string;
    checkOutDate!: string;
    note?: string;
    constructor(booking:any) {
        this.id = booking.id;
        this.roomId = booking.roomId;
        this.checkInDate = booking.checkInDate;
        this.checkOutDate = booking.checkOutDate;
        this.note = booking.note;
    }
}