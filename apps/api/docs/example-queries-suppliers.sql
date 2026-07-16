-- Example queries for Product / Supplier / SupplierProduct model
-- Compatibility remains between PRODUCTS (product_compatibility).
-- Run these in PostgreSQL (e.g. via Prisma Studio raw SQL or psql).
-- Replace :supplier_id, :product_id, and product-id-1/2/3 with real UUIDs or CUIDs from your DB.

-- =============================================================================
-- 1. Finding all products from a supplier
-- =============================================================================
-- Replace :supplier_id with a UUID from suppliers.id
SELECT p.id, p.name, b.name AS brand_name, c.name AS category_name,
       sp.price, sp.stock, sp.lead_time_days, sp.supplier_sku
FROM supplier_products sp
JOIN products p ON p.id = sp.product_id
JOIN brands b ON b.id = p.brand_id
JOIN categories c ON c.id = p.category_id
WHERE sp.supplier_id = :supplier_id
ORDER BY c.name, p.name;

-- =============================================================================
-- 2. Finding the cheapest supplier for a product
-- =============================================================================
-- Replace :product_id with a product id
SELECT s.id AS supplier_id, s.name AS supplier_name, sp.price, sp.lead_time_days
FROM supplier_products sp
JOIN suppliers s ON s.id = sp.supplier_id
WHERE sp.product_id = :product_id
ORDER BY sp.price ASC
LIMIT 1;

-- =============================================================================
-- 3. Getting all supplier offers for a list of products
-- =============================================================================
-- Replace the product IDs with your list (e.g. from a kit)
SELECT p.id AS product_id, p.name AS product_name,
       s.id AS supplier_id, s.name AS supplier_name,
       sp.price, sp.stock, sp.lead_time_days, sp.minimum_order_quantity
FROM supplier_products sp
JOIN products p ON p.id = sp.product_id
JOIN suppliers s ON s.id = sp.supplier_id
WHERE sp.product_id IN ('product-id-1', 'product-id-2', 'product-id-3')
ORDER BY p.name, sp.price;

-- =============================================================================
-- 4. Finding products compatible with another product
-- =============================================================================
-- Compatibility is defined in product_compatibility (between products, not suppliers).
-- Replace :product_id with the product you want to find compatibles for
SELECT p.id, p.name, b.name AS brand_name, c.name AS category_name,
       pc.compatibility_type, pc.rule
FROM product_compatibility pc
JOIN products p ON (p.id = pc.product_a_id OR p.id = pc.product_b_id) AND p.id != :product_id
JOIN brands b ON b.id = p.brand_id
JOIN categories c ON c.id = p.category_id
WHERE pc.product_a_id = :product_id OR pc.product_b_id = :product_id;

-- =============================================================================
-- 5. Building a kit using products from the SAME supplier
-- =============================================================================
-- Find a supplier that offers ALL required product IDs (e.g. for a kit)
-- Required product IDs: replace with your list
WITH required_products AS (
  SELECT unnest(ARRAY['product-id-1', 'product-id-2', 'product-id-3']) AS product_id
),
supplier_coverage AS (
  SELECT sp.supplier_id,
         count(DISTINCT sp.product_id) AS offered,
         (SELECT count(*) FROM required_products) AS required
  FROM supplier_products sp
  WHERE sp.product_id IN (SELECT product_id FROM required_products)
  GROUP BY sp.supplier_id
)
SELECT s.id, s.name, sc.offered, sc.required
FROM supplier_coverage sc
JOIN suppliers s ON s.id = sc.supplier_id
WHERE sc.offered = sc.required;

-- Optional: total kit price from one supplier
-- Replace :supplier_id and the product/quantity list
SELECT s.name,
       sum(sp.price * k.qty) AS total_price
FROM (VALUES
  ('product-id-1'::text, 20),
  ('product-id-2'::text, 1)
) AS k(product_id, qty)
JOIN supplier_products sp ON sp.product_id = k.product_id AND sp.supplier_id = :supplier_id
JOIN suppliers s ON s.id = sp.supplier_id
GROUP BY s.id, s.name;
