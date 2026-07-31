-- Create fsli_pages table for FSLI items
CREATE TABLE IF NOT EXISTS public.fsli_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  notes_ref TEXT,
  dec_2024 TEXT,
  dec_2023 TEXT,
  category TEXT DEFAULT 'current_assets',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fsli_pages ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "FSLI pages are publicly readable" 
ON public.fsli_pages 
FOR SELECT 
USING (true);

-- Admin write access
CREATE POLICY "Admins can modify FSLI pages" 
ON public.fsli_pages 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Create fsli_sections table for editable content sections
CREATE TABLE IF NOT EXISTS public.fsli_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_slug TEXT NOT NULL,
  section_key TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(page_slug, section_key)
);

-- Enable RLS
ALTER TABLE public.fsli_sections ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "FSLI sections are publicly readable" 
ON public.fsli_sections 
FOR SELECT 
USING (true);

-- Admin write access
CREATE POLICY "Admins can modify FSLI sections" 
ON public.fsli_sections 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Create essays table for Critical Thinking, Green Transition essays
CREATE TABLE IF NOT EXISTS public.essays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section TEXT NOT NULL, -- 'critical-thinking', 'green-transition', 'english-ielts'
  phase TEXT,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  snippet TEXT,
  author TEXT DEFAULT 'Dika Gustiana',
  date TEXT,
  read_time TEXT,
  thumbnail_url TEXT,
  content TEXT,
  published BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(section, phase, slug)
);

-- Enable RLS
ALTER TABLE public.essays ENABLE ROW LEVEL SECURITY;

-- Public read access for published essays
CREATE POLICY "Published essays are publicly readable" 
ON public.essays 
FOR SELECT 
USING (published = true OR has_role(auth.uid(), 'admin'));

-- Admin write access
CREATE POLICY "Admins can modify essays" 
ON public.essays 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Create books_uploads table
CREATE TABLE IF NOT EXISTS public.books_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  filepath TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  title TEXT,
  author TEXT,
  year INTEGER,
  cover_path TEXT,
  uploaded_by UUID,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.books_uploads ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Books are publicly readable" 
ON public.books_uploads 
FOR SELECT 
USING (deleted_at IS NULL);

-- Admin write access
CREATE POLICY "Admins can modify books" 
ON public.books_uploads 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Create embeds table for FSLI embeds
CREATE TABLE IF NOT EXISTS public.embeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_slug TEXT NOT NULL,
  embed_type TEXT NOT NULL, -- 'file', 'iframe', 'link'
  src TEXT NOT NULL,
  title TEXT,
  width INTEGER,
  height INTEGER,
  scrollable BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.embeds ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Embeds are publicly readable" 
ON public.embeds 
FOR SELECT 
USING (true);

-- Admin write access
CREATE POLICY "Admins can modify embeds" 
ON public.embeds 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Create storage bucket for embeds
INSERT INTO storage.buckets (id, name, public) 
VALUES ('embeds', 'embeds', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for books
INSERT INTO storage.buckets (id, name, public) 
VALUES ('books', 'books', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for embeds bucket
CREATE POLICY "Embeds are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'embeds');

CREATE POLICY "Admins can upload embeds" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'embeds' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete embeds" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'embeds' AND has_role(auth.uid(), 'admin'));

-- Storage policies for books bucket
CREATE POLICY "Books are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'books');

CREATE POLICY "Admins can upload books" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'books' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete books" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'books' AND has_role(auth.uid(), 'admin'));

-- Seed FSLI pages with all items
INSERT INTO public.fsli_pages (slug, title, subtitle, notes_ref, dec_2024, dec_2023, category, sort_order) VALUES
('cash-and-cash-equivalents', 'Cash and cash equivalents', 'Kas dan setara kas', '3i.6', '2,614,318', '5,018,739', 'current_assets', 1),
('restricted-cash', 'Restricted cash', 'Kas yang dibatasi penggunaannya', '3i.7', '154,217', '133,537', 'current_assets', 2),
('trade-receivables-net', 'Trade receivables, net', 'Piutang usaha, neto', '3b,4dc', '2,203,018', '2,063,070', 'current_assets', 3),
('third-parties', 'Third parties', 'Piutang ketiga', '3b.5', '520,885', '715,327', 'current_assets', 4),
('related-parties', 'Related parties', 'Piutang bermiutah', '3g.9', '823,348', '801,429', 'current_assets', 5),
('other-receivables-net', 'Other receivables, net', 'Piutang lain-lain, neto', '3h,10,14d', '28,830', '28,217', 'current_assets', 6),
('due-from-government', 'Due from the Government', 'Piutang dari Pemerintah', '3h,10', '85,053', '94,887', 'current_assets', 7),
('inventories-net', 'Inventories, net', 'Persediaan, neto', '3j,11', '809,397', '658,712', 'current_assets', 8),
('corporate-dividend-taxes-receivable-current', 'Corporate and dividend taxes receivable - current portion', 'Piutang pajak penghasilan dan dividen taxes', '3c,43a', '300,738', '275,812', 'current_assets', 9),
('advances-prepayments-current', 'Advances and prepayments - current portion', 'Uang muka dan biaya dibayar di muka', '3c,43a', '20,268', '12,503', 'current_assets', 10),
('other-current-assets', 'Other current assets', 'Aset lancar lainnya', '3h,15', '179,426', '177,429', 'current_assets', 11),
('other-non-current-assets', 'Other non-current assets', 'Aset tidak lancar lainnya', '14a', '60,913', '210,253', 'non_current_assets', 12),
('restricted-cash-non-current', 'Restricted cash - non-current portion', 'Kas yang dibatasi penggunaannya', '3i,7', '1,890,493', '1,700,675', 'non_current_assets', 13),
('trade-receivables-net-non-current', 'Trade receivables, net - non-current portion', 'Piutang usaha, neto', '3i,12', '544,278', '522,121', 'non_current_assets', 14),
('fixed-assets-net', 'Fixed assets, net', 'Aset tetap, neto', '3d,13', '71,814', '73,800', 'non_current_assets', 15),
('investment-properties', 'Investment properties', 'Properti investasi', '3c,43a', '5,149', '3,301', 'non_current_assets', 16),
('deferred-tax-assets', 'Deferred tax assets', 'Aset pajak tangguhan', '10', '53,721', '95,263', 'non_current_assets', 17),
('long-term-investments', 'Long-term investments', 'Investasi jangka panjang', '', '1,109,172', '1,602,821', 'non_current_assets', 18),
('advances-prepayments-non-current', 'Advances and prepayments - non-current portion', 'Uang muka dan biaya dibayar di muka', '3h,15', '50', '2,242', 'non_current_assets', 19),
('corporate-dividend-taxes-receivable-non-current', 'Corporate and dividend taxes receivable - non-current portion', 'Piutang pajak penghasilan dan dividen taxes', '3c,43a', '262,713', '213,492', 'non_current_assets', 20),
('other-non-current-receivables', 'Other non-current receivables', 'Piutang tidak lancar lainnya', '3c,43a', '3,106', '3,460', 'non_current_assets', 21),
('oil-gas-properties-net', 'Oil and gas properties, net', 'Aset hak dan gas bumi, neto', '3m,17', '17,905,149', '16,130,200', 'non_current_assets', 22),
('right-of-use-assets-net', 'Right of use assets, net', 'Aset hak guna, neto', '3n,18', '123,977', '203,379', 'non_current_assets', 23),
('other-non-current-assets-final', 'Other non-current assets', 'Aset tidak lancar lainnya', '15b', '533,865', '455,380', 'non_current_assets', 24)
ON CONFLICT (slug) DO NOTHING;

-- Create triggers for updated_at
CREATE TRIGGER update_fsli_pages_updated_at
BEFORE UPDATE ON public.fsli_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fsli_sections_updated_at
BEFORE UPDATE ON public.fsli_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_essays_updated_at
BEFORE UPDATE ON public.essays
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();