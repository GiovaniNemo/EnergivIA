# Supplier / SupplierProduct – Suggested improvements

## Performance & scalability

1. **Composite index for “cheapest by product”**  
   Already have `@@index([productId])` on `supplier_products`. For “cheapest offer per product” consider a composite index to support `ORDER BY price ASC` on that table:
   - `CREATE INDEX idx_supplier_products_product_price ON supplier_products(product_id, price);`  
   (Add via raw migration if needed; Prisma does not support index on (a, b) for different sort orders in one index.)

2. **Caching for catalog + offers**  
   For kit generation, consider caching product catalog (by category) and, per supplier, the list of product IDs they offer, to avoid repeated lookups. Invalidate on supplier_product create/update/delete.

3. **Pagination for “all products from supplier”**  
   When a supplier has many products, expose paginated endpoints (e.g. `GET /suppliers/:id/products?page=1&pageSize=20`) instead of loading all in one response.

4. **Read replica for reporting**  
   For heavy reporting (e.g. “cheapest supplier per product”, “kits by supplier”), consider routing read-only queries to a PostgreSQL read replica so reporting does not impact transactional writes.

## Data model (optional)

5. **Currency on supplier_products**  
   If you ever have multi-currency (e.g. BRL vs USD), add a `currency` column (or a `supplier.currency`) and store amounts in that currency; convert for display as needed.

6. **Valid-from / valid-to on supplier_products**  
   For price validity periods, add `valid_from` and `valid_to` (date or timestamp). Queries then filter by `CURRENT_DATE` (or equivalent) when resolving “current” price.

7. **Kit → supplier**  
   To record “this kit was quoted from this supplier”, add `supplier_id` (nullable) on `kits`. That supports analytics (e.g. kits per supplier) and re-quoting from the same supplier.

## Compatibility

8. **product_compatibility**  
   Kept as-is: compatibility is between **products** (technical catalog), not between supplier_products. Sizing and kit logic stay product-based; only price/stock/lead time come from supplier_products.
