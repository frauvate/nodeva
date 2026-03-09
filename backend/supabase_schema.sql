-- MongoDB, NoSQL olduğu için tablo yapısına gerek yoktur, veriler JSON dokümanları olarak saklanacaktır.
-- Supabase tarafında ise sadece Authentication (Kullanıcı giriş/çıkış) kullanıyoruz.
-- Supabase Auth tablosu zaten kendiliğinden (auth.users) mevcuttur.

-- Ek olarak Supabase üzerinden MongoDB'ye erişirken "kullanıcı" bilgilerini eşleştirmek adına
-- İsterseniz, aşağıdaki gibi Supabase Public şemasında genel bir kullanıcı tablosu tutabilirsiniz (Tercihe bağlıdır):

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE,
  email TEXT
);

-- Yeni bir kullanıcı Supabase'e kayıt olduğunda otomatik profil oluşturacak Trigger (İsteğe Bağlı)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
