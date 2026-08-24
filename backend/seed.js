const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function seed() {
  try {
    await client.connect();
    
    console.log('Chèn dữ liệu Tiện nghi (Amenities)...');
    await client.query(`
      INSERT INTO amenities (name, description) VALUES 
      ('Wifi', 'Mạng không dây tốc độ cao'),
      ('Pool', 'Hồ bơi vô cực ngoài trời'),
      ('Gym', 'Phòng tập thể hình hiện đại')
      ON CONFLICT (name) DO NOTHING;
    `);

    console.log('Chèn dữ liệu Phòng (Rooms)...');
    await client.query(`
      INSERT INTO rooms (room_number, name, room_type, capacity, price_per_night, status) VALUES 
      ('101', 'Phòng Tiêu Chuẩn', 'Standard', 2, 200.00, 'ACTIVE'),
      ('102', 'Phòng VIP Hướng Biển', 'VIP', 4, 500.00, 'ACTIVE'),
      ('103', 'Phòng Gia Đình', 'Family', 6, 800.00, 'ACTIVE')
      ON CONFLICT (room_number) DO NOTHING;
    `);

    console.log('Kết nối Tiện nghi vào Phòng (Room Amenities)...');
    // Bỏ qua lỗi conflict nếu cấu trúc primary key là (room_id, amenity_id)
    await client.query(`
      INSERT INTO room_amenities (room_id, amenity_id) 
      SELECT r.id, a.id FROM rooms r CROSS JOIN amenities a 
      WHERE r.room_number = '101' AND a.name = 'Wifi'
      ON CONFLICT DO NOTHING;
    `).catch(() => {});
    
    await client.query(`
      INSERT INTO room_amenities (room_id, amenity_id) 
      SELECT r.id, a.id FROM rooms r CROSS JOIN amenities a 
      WHERE r.room_number = '102' AND a.name IN ('Wifi', 'Pool')
      ON CONFLICT DO NOTHING;
    `).catch(() => {});

    await client.query(`
      INSERT INTO room_amenities (room_id, amenity_id) 
      SELECT r.id, a.id FROM rooms r CROSS JOIN amenities a 
      WHERE r.room_number = '103' AND a.name IN ('Wifi', 'Pool', 'Gym')
      ON CONFLICT DO NOTHING;
    `).catch(() => {});

    console.log('✅ Seed dữ liệu phòng và tiện nghi hoàn tất! Bạn có thể test API ngay bây giờ.');
  } catch (error) {
    console.error('Lỗi khi seed dữ liệu:', error);
  } finally {
    await client.end();
  }
}

seed();
