-- Bucket para las fotos/PDFs de comprobantes subidos para OCR (RF-03).
-- Público de lectura (igual que los demás links de respaldo de la app,
-- que hoy apuntan a Drive), pero solo arquitectas logueadas pueden subir.
insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', true)
on conflict (id) do nothing;

create policy "arquitectas suben comprobantes"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'comprobantes');

create policy "arquitectas listan comprobantes"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'comprobantes');
