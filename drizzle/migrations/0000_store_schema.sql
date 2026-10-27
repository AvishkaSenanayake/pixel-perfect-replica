CREATE TYPE public.app_role AS ENUM ('admin','cashier');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

-- First account ever created becomes the shop owner (admin)
CREATE OR REPLACE FUNCTION public.handle_first_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created_admin AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_first_admin();

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  brand text NOT NULL DEFAULT '',
  category text NOT NULL,
  price numeric(12,2) NOT NULL,
  old_price numeric(12,2),
  description text NOT NULL DEFAULT '',
  specs jsonb NOT NULL DEFAULT '{}'::jsonb,
  warranty text NOT NULL DEFAULT '1 Year Warranty',
  image text NOT NULL DEFAULT 'tv',
  stock integer NOT NULL DEFAULT 0,
  store_location text NOT NULL DEFAULT 'Main Store',
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products public read" ON public.products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "staff manage products" ON public.products FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  phone text NOT NULL,
  email text,
  address text NOT NULL,
  city text NOT NULL,
  notes text,
  payment_method text NOT NULL CHECK (payment_method IN ('cod','bank')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','awaiting_verification','verified','rejected','cod')),
  status integer NOT NULL DEFAULT 1 CHECK (status BETWEEN 1 AND 5),
  slip_path text,
  subtotal numeric(12,2) NOT NULL,
  delivery_fee numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL,
  stock_deducted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_phone_idx ON public.orders(phone);
GRANT SELECT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read orders" ON public.orders FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff update orders" ON public.orders FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  serial_numbers text
);
GRANT SELECT, UPDATE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read items" ON public.order_items FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff update items" ON public.order_items FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Place order (guest checkout). Prices come from products table, never from client.
CREATE OR REPLACE FUNCTION public.place_order(p_customer jsonb, p_items jsonb, p_payment_method text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code text; v_order uuid; v_sub numeric := 0; v_fee numeric; it jsonb; prod record; q int;
BEGIN
  IF p_payment_method NOT IN ('cod','bank') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;
  IF jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Cart is empty'; END IF;
  IF coalesce(trim(p_customer->>'name'),'') = '' OR coalesce(trim(p_customer->>'phone'),'') = ''
     OR coalesce(trim(p_customer->>'address'),'') = '' OR coalesce(trim(p_customer->>'city'),'') = '' THEN
    RAISE EXCEPTION 'Missing delivery details';
  END IF;
  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    q := (it->>'quantity')::int;
    SELECT * INTO prod FROM products WHERE id = (it->>'product_id')::uuid;
    IF prod IS NULL OR q IS NULL OR q < 1 THEN RAISE EXCEPTION 'Invalid item'; END IF;
    IF prod.stock < q THEN RAISE EXCEPTION 'Not enough stock for %', prod.name; END IF;
    v_sub := v_sub + prod.price * q;
  END LOOP;
  v_fee := CASE WHEN v_sub >= 100000 THEN 0 ELSE 1500 END;
  v_code := 'ORD-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  INSERT INTO orders (code, customer_name, phone, email, address, city, notes, payment_method, payment_status, subtotal, delivery_fee, total)
  VALUES (v_code, trim(p_customer->>'name'), regexp_replace(p_customer->>'phone', '\s', '', 'g'), nullif(trim(p_customer->>'email'),''),
          trim(p_customer->>'address'), trim(p_customer->>'city'), nullif(trim(p_customer->>'notes'),''),
          p_payment_method, CASE WHEN p_payment_method='cod' THEN 'cod' ELSE 'pending' END, v_sub, v_fee, v_sub + v_fee)
  RETURNING id INTO v_order;
  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO prod FROM products WHERE id = (it->>'product_id')::uuid;
    INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity)
    VALUES (v_order, prod.id, prod.name, prod.price, (it->>'quantity')::int);
  END LOOP;
  RETURN v_code;
END $$;

-- Track orders by order code or phone number
CREATE OR REPLACE FUNCTION public.track_orders(p_query text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'code', o.code, 'customer_name', o.customer_name, 'phone', o.phone, 'city', o.city,
    'payment_method', o.payment_method, 'payment_status', o.payment_status, 'status', o.status,
    'has_slip', o.slip_path IS NOT NULL, 'total', o.total, 'subtotal', o.subtotal, 'delivery_fee', o.delivery_fee,
    'created_at', o.created_at, 'updated_at', o.updated_at,
    'items', (SELECT jsonb_agg(jsonb_build_object('name', i.product_name, 'quantity', i.quantity, 'unit_price', i.unit_price)) FROM order_items i WHERE i.order_id = o.id)
  ) ORDER BY o.created_at DESC), '[]'::jsonb)
  FROM orders o
  WHERE length(trim(p_query)) >= 6 AND (upper(o.code) = upper(trim(p_query)) OR o.phone = regexp_replace(p_query, '\s', '', 'g'))
$$;

-- Attach a deposit slip (code + phone must match)
CREATE OR REPLACE FUNCTION public.attach_slip(p_code text, p_phone text, p_path text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE orders SET slip_path = p_path, payment_status = 'awaiting_verification', updated_at = now()
  WHERE upper(code) = upper(p_code) AND phone = regexp_replace(p_phone, '\s', '', 'g')
    AND payment_method = 'bank' AND payment_status IN ('pending','awaiting_verification','rejected');
  RETURN FOUND;
END $$;

-- Staff: confirm order (verify payment for bank) and deduct stock once
CREATE OR REPLACE FUNCTION public.confirm_order(p_order uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o record; it record;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO o FROM orders WHERE id = p_order FOR UPDATE;
  IF o IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF NOT o.stock_deducted THEN
    FOR it IN SELECT * FROM order_items WHERE order_id = p_order LOOP
      UPDATE products SET stock = stock - it.quantity WHERE id = it.product_id AND stock >= it.quantity;
      IF NOT FOUND AND it.product_id IS NOT NULL THEN RAISE EXCEPTION 'Not enough stock for %', it.product_name; END IF;
    END LOOP;
  END IF;
  UPDATE orders SET stock_deducted = true,
    payment_status = CASE WHEN payment_method = 'bank' THEN 'verified' ELSE payment_status END,
    status = greatest(status, 2), updated_at = now()
  WHERE id = p_order;
END $$;

CREATE OR REPLACE FUNCTION public.reject_slip(p_order uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  UPDATE orders SET payment_status = 'rejected', updated_at = now() WHERE id = p_order AND payment_method = 'bank';
END $$;

GRANT EXECUTE ON FUNCTION public.place_order(jsonb, jsonb, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_orders(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attach_slip(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_slip(uuid) TO authenticated;

-- Slip storage: anyone may upload, only staff may view
CREATE POLICY "anyone upload slips" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'slips');
CREATE POLICY "staff read slips" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'slips' AND public.is_staff(auth.uid()));

INSERT INTO public.products (slug, name, brand, category, price, old_price, description, specs, warranty, image, stock, store_location, featured) VALUES
('samsung-55-crystal-uhd','Samsung 55" Crystal UHD 4K Smart TV','Samsung','TVs',189900,214900,'Vivid 4K picture with Crystal Processor, HDR and built-in streaming apps.','{"Screen":"55 inch","Resolution":"3840 x 2160 (4K)","Smart OS":"Tizen","HDMI Ports":"3","Refresh Rate":"60Hz"}','2 Years Company Warranty','tv',8,'Main Store',true),
('lg-65-oled','LG 65" OLED evo Smart TV','LG','TVs',579000,null,'Self-lit OLED pixels for perfect black and infinite contrast.','{"Screen":"65 inch","Panel":"OLED evo","Resolution":"4K","Smart OS":"webOS","Refresh Rate":"120Hz"}','3 Years Company Warranty','tv',2,'Main Store',false),
('hp-pavilion-15','HP Pavilion 15 Laptop – Core i5','HP','Laptops',244500,259000,'Everyday performance laptop with a crisp Full HD display.','{"Processor":"Intel Core i5-1335U","RAM":"16GB DDR4","Storage":"512GB SSD","Display":"15.6\" FHD IPS","OS":"Windows 11"}','1 Year Warranty','laptop',12,'Main Store',true),
('macbook-air-m3','Apple MacBook Air 13" M3','Apple','Laptops',389000,null,'Ultra-thin, silent and all-day battery with the M3 chip.','{"Chip":"Apple M3","RAM":"8GB","Storage":"256GB SSD","Display":"13.6\" Liquid Retina","Battery":"Up to 18 hours"}','1 Year Apple Warranty','laptop',4,'Colombo Branch',true),
('samsung-galaxy-s25','Samsung Galaxy S25 5G (256GB)','Samsung','Mobile Phones',289900,309900,'Flagship performance, pro-grade cameras and Galaxy AI.','{"Display":"6.2\" Dynamic AMOLED 2X","Storage":"256GB","RAM":"12GB","Camera":"50MP + 12MP + 10MP","Battery":"4000mAh"}','1 Year Company Warranty','phone',15,'Main Store',true),
('redmi-note-14','Xiaomi Redmi Note 14 (128GB)','Xiaomi','Mobile Phones',64990,null,'Big AMOLED screen and long battery life at a great price.','{"Display":"6.67\" AMOLED 120Hz","Storage":"128GB","RAM":"8GB","Camera":"108MP","Battery":"5500mAh"}','1 Year Warranty','phone',0,'Main Store',false),
('lg-inverter-fridge-420','LG 420L Smart Inverter Double Door Refrigerator','LG','Refrigerators',248000,269000,'Energy-saving inverter compressor with door cooling+.','{"Capacity":"420 Litres","Type":"Double Door, Frost Free","Compressor":"Smart Inverter","Energy":"Up to 36% saving"}','10 Years Compressor Warranty','fridge',6,'Main Store',true),
('samsung-side-by-side','Samsung 635L Side-by-Side Refrigerator','Samsung','Refrigerators',465000,null,'Spacious side-by-side with twin cooling and water dispenser.','{"Capacity":"635 Litres","Type":"Side-by-Side","Dispenser":"Water","Compressor":"Digital Inverter"}','10 Years Compressor Warranty','fridge',3,'Kandy Branch',false),
('panasonic-rice-cooker-1-8','Panasonic 1.8L Electric Rice Cooker','Panasonic','Rice Cookers',14500,16900,'Cook fluffy rice for the whole family with auto keep-warm.','{"Capacity":"1.8 Litres","Power":"660W","Inner Pot":"Non-stick","Function":"Auto Keep Warm"}','1 Year Warranty','ricecooker',40,'Main Store',true),
('philips-multi-cooker','Philips Viva Multi Cooker 5L','Philips','Rice Cookers',32900,null,'16 cooking programs: rice, steam, soup, cake and more.','{"Capacity":"5 Litres","Programs":"16","Power":"980W","Timer":"24h preset"}','2 Years Warranty','ricecooker',18,'Main Store',false),
('bajaj-re-4s','Bajaj RE 4S Three-Wheeler (Petrol)','Bajaj','Vehicles',2195000,null,'Reliable, fuel-efficient three-wheeler for business or family.','{"Engine":"236.2cc 4-Stroke","Fuel":"Petrol","Seating":"Driver + 3","Mileage":"~30 km/l","Registration":"Assistance available"}','2 Years / 50,000 km Warranty','threewheeler',3,'Main Store',true),
('tvs-king-deluxe','TVS King Deluxe Three-Wheeler','TVS','Vehicles',2090000,null,'Comfortable ride, strong body and low maintenance.','{"Engine":"200cc 4-Stroke","Fuel":"Petrol","Seating":"Driver + 3","Brakes":"Hydraulic drum"}','2 Years Warranty','threewheeler',1,'Kandy Branch',false);
