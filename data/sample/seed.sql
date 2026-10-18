\set QUIET 1

BEGIN;

CREATE TEMP TABLE sample_context AS
SELECT id AS user_id FROM users WHERE email = :'sample_user_email';

SELECT count(*) AS sample_user_count FROM sample_context \gset
\if :sample_user_count
\else
  \warn Sample user does not exist: :sample_user_email
  \quit false
\endif

DELETE FROM expenses WHERE user_id = (SELECT user_id FROM sample_context);
DELETE FROM recognition_jobs WHERE user_id = (SELECT user_id FROM sample_context);
DELETE FROM media_assets WHERE user_id = (SELECT user_id FROM sample_context);

CREATE TEMP TABLE sample_media (
  slug text PRIMARY KEY,
  storage_key text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL
);

INSERT INTO sample_media (slug, storage_key, mime_type, size_bytes, width, height)
VALUES
  ('bookstore.jpg', 'sample/bookstore.jpg', 'image/jpeg', 190751, 800, 600),
  ('desk-lamp.jpg', 'sample/desk-lamp.jpg', 'image/jpeg', 34973, 800, 600),
  ('electric-bill.jpg', 'sample/electric-bill.jpg', 'image/jpeg', 59698, 800, 600),
  ('family-dinner.jpg', 'sample/family-dinner.jpg', 'image/jpeg', 90393, 800, 600),
  ('flower-gift.jpg', 'sample/flower-gift.jpg', 'image/jpeg', 93551, 800, 600),
  ('grocery-basket.jpg', 'sample/grocery-basket.jpg', 'image/jpeg', 180248, 800, 600),
  ('morning-coffee.jpg', 'sample/morning-coffee.jpg', 'image/jpeg', 79544, 800, 600),
  ('motorbike-ride.jpg', 'sample/motorbike-ride.jpg', 'image/jpeg', 71702, 800, 600),
  ('pho-lunch.jpg', 'sample/pho-lunch.jpg', 'image/jpeg', 144144, 800, 600),
  ('weekend-cinema.jpg', 'sample/weekend-cinema.jpg', 'image/jpeg', 33139, 800, 600);

CREATE TEMP TABLE inserted_media (slug text PRIMARY KEY, id bigint NOT NULL);

WITH rows AS (
  INSERT INTO media_assets (
    user_id, storage_key, thumbnail_key, mime_type, size_bytes, width, height,
    status, failure_reason, expires_at
  )
  SELECT
    (SELECT user_id FROM sample_context), storage_key, NULL, mime_type,
    size_bytes, width, height, 'ready', NULL, '2099-12-31T00:00:00Z'
  FROM sample_media
  ORDER BY slug
  RETURNING id, storage_key
)
INSERT INTO inserted_media (slug, id)
SELECT replace(storage_key, 'sample/', ''), id FROM rows;

INSERT INTO expenses (
  user_id, category_id, media_asset_id, amount_minor, currency, occurred_at,
  occurred_timezone, caption, merchant, location, source, idempotency_key,
  request_hash, field_sources
)
SELECT
  context.user_id,
  category.id,
  media.id,
  expense.amount_minor,
  'VND',
  expense.occurred_at::timestamptz,
  'Asia/Ho_Chi_Minh',
  expense.caption,
  expense.merchant,
  expense.location,
  'manual',
  'sample-' || expense.slug,
  md5('sample-' || expense.slug),
  '{}'::jsonb
FROM (
  VALUES
    ('morning-coffee.jpg', 'food', 45000, '2026-10-17T01:15:00Z', 'Cà phê sáng trước giờ làm', 'Quán cà phê góc phố', 'Quận 1, TP. Hồ Chí Minh'),
    ('pho-lunch.jpg', 'food', 65000, '2026-10-16T05:10:00Z', 'Bữa trưa ấm bụng', 'Phở Hà Nội', 'Quận 3, TP. Hồ Chí Minh'),
    ('grocery-basket.jpg', 'shopping', 328000, '2026-10-16T11:30:00Z', 'Đi chợ cho cả tuần', 'Siêu thị An Nam', 'Quận Bình Thạnh, TP. Hồ Chí Minh'),
    ('bookstore.jpg', 'education', 215000, '2026-10-15T02:20:00Z', 'Một cuốn sách mới cho cuối tuần', 'Nhà sách Fahasa', 'Quận 1, TP. Hồ Chí Minh'),
    ('motorbike-ride.jpg', 'transport', 42000, '2026-10-15T05:45:00Z', 'Chuyến xe sáng đi làm', 'GrabBike', 'TP. Hồ Chí Minh'),
    ('family-dinner.jpg', 'food', 486000, '2026-10-15T12:15:00Z', 'Bữa tối cùng gia đình', 'Bếp Nhà', 'Quận Phú Nhuận, TP. Hồ Chí Minh'),
    ('desk-lamp.jpg', 'shopping', 390000, '2026-10-13T03:05:00Z', 'Đèn mới cho góc làm việc', 'Cửa hàng nội thất', 'Quận 2, TP. Hồ Chí Minh'),
    ('electric-bill.jpg', 'bills', 742000, '2026-10-13T05:00:00Z', 'Tiền điện tháng 10', 'Điện lực TP.HCM', 'TP. Hồ Chí Minh'),
    ('weekend-cinema.jpg', 'entertainment', 240000, '2026-10-13T09:35:00Z', 'Xem phim cuối tuần', 'Rạp chiếu phim', 'Quận 7, TP. Hồ Chí Minh'),
    ('flower-gift.jpg', 'other', 180000, '2026-10-13T12:40:00Z', 'Một bó hoa nhỏ tặng bạn', 'Tiệm hoa địa phương', 'Quận 3, TP. Hồ Chí Minh')
) AS expense(slug, category_code, amount_minor, occurred_at, caption, merchant, location)
JOIN sample_context context ON true
JOIN categories category ON category.code = expense.category_code
JOIN inserted_media media ON media.slug = expense.slug;

COMMIT;

\set QUIET 0
SELECT
  (SELECT count(*) FROM expenses WHERE user_id = context.user_id) AS expenses,
  (SELECT count(*) FROM media_assets WHERE user_id = context.user_id) AS media_assets
FROM sample_context context;
