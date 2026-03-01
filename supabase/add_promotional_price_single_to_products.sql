-- Add promotional_price_single column to products table
ALTER TABLE products 
ADD COLUMN promotional_price_single DECIMAL(10, 2);

-- Update RLS policies if necessary (usually not needed for adding columns if policies are on the table level)
