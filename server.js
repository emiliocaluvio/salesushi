const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://wirexcgiyqfgrdglslhp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpcmV4Y2dpeXFmZ3JkZ2xzbGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1NzYwMjUsImV4cCI6MjA2MDE1MjAyNX0.Q0cUsNkRcpGHoDRd-V81M2LO7aFLiZH4StuDnRp5qZ4'; // Por seguridad, no la muestro
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

// ✅ GET estado de pedidos
app.get('/estado-pedidos', async (req, res) => {
  const { data, error } = await supabase
    .from('estado_pedidos')
    .select('activo')
    .limit(1)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ activo: data?.activo ?? false });
});

// ✅ POST actualizar estado de pedidos
app.post('/estado-pedidos', async (req, res) => {
  const { activo } = req.body;

  const { data: row, error: selectError } = await supabase
    .from('estado_pedidos')
    .select('id')
    .limit(1)
    .single();

  if (selectError || !row) {
    const { error: insertError } = await supabase
      .from('estado_pedidos')
      .insert([{ activo }]);

    if (insertError) return res.status(500).json({ error: insertError.message });
    return res.status(200).json({ message: "Estado creado", activo });
  }

  const { error: updateError } = await supabase
    .from('estado_pedidos')
    .update({ activo })
    .eq('id', row.id);

  if (updateError) return res.status(500).json({ error: updateError.message });

  res.json({ message: "Estado actualizado", activo });
});

// 🔹 Combinaciones
app.get('/combinaciones', async (req, res) => {
  const { data, error } = await supabase.from('combinaciones').select('proteina, cobertura, precio');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 🔹 Proteínas únicas
app.get('/proteinas-unicas', async (req, res) => {
  const { data, error } = await supabase.from('combinaciones').select('proteina');
  if (error) return res.status(500).json({ error: error.message });
  const unicas = [...new Set(data.map(item => item.proteina))];
  res.json(unicas);
});

// 🔹 Vegetales
app.get('/vegetales', (req, res) => {
  const vegetales = ["Ciboulette", "Cebollín", "Palta", "Mix de morrón", "Pepino", "Palmitos", "Zanahoria"];
  res.json(vegetales);
});

// 🔹 Guardar pedido
app.post('/guardar-pedido', async (req, res) => {
  const {
    nombre_cliente, apellido_cliente, celular_cliente, metodo_pago,
    proteina, cobertura, vegetal, precio
  } = req.body;

  const { error } = await supabase
    .from('pedidos')
    .insert([{ nombre_cliente, apellido_cliente, celular_cliente, metodo_pago, proteina, cobertura, vegetal, precio, fecha: new Date() }]);

  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ message: 'Pedido guardado correctamente' });
});

// 🔹 Obtener pedidos
app.get('/pedidos', async (req, res) => {
  const { data, error } = await supabase.from('pedidos').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 🔹 Eliminar pedido
app.delete('/eliminar-pedido/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('pedidos').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ message: "Pedido eliminado" });
});

// 🔹 Generar imagen
app.post('/generar-imagen', async (req, res) => {
  try {
    const { proteina, vegetal, cobertura, imagen } = req.body;
    if (!proteina || !vegetal || !cobertura || !imagen) {
      return res.status(400).json({ error: 'Faltan datos' });
    }

    const basePath = path.join(__dirname, 'public');
    const outputPath = path.join(basePath, 'rolls', imagen);

    const normalizar = (nombre) => nombre
      .toLowerCase()
      .replace(/mix de /g, '')
      .replace(/\s+/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const prot = proteina === 'Vegetariano' ? vegetal.split(',')[0] : proteina;
    const veg = proteina === 'Vegetariano' ? vegetal.split(',')[1] : vegetal;

    const capaProteina = path.join(basePath, 'proteinas', `${normalizar(prot)}proteina.png`);
    const capaVegetal = path.join(basePath, 'vegetales', `${normalizar(veg)}vegetal.png`);
    const capaCobertura = path.join(basePath, 'coberturas', `${normalizar(cobertura)}cobertura.png`);
    const maqueta = path.join(basePath, 'maqueta.png');

    const composiciones = [];

    if (fs.existsSync(capaProteina)) {
      composiciones.push({ input: await sharp(capaProteina).resize(1440, 1334).toBuffer(), top: 0, left: 0 });
    }

    if (fs.existsSync(capaVegetal)) {
      composiciones.push({ input: await sharp(capaVegetal).resize(1440, 1334).toBuffer(), top: 0, left: 0 });
    }

    if (fs.existsSync(capaCobertura)) {
      composiciones.push({ input: await sharp(capaCobertura).resize(1440, 1334).toBuffer(), top: 0, left: 0 });
    }

    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

    await sharp(maqueta).composite(composiciones).png().toFile(outputPath);

    res.status(200).json({ message: 'Imagen generada con éxito', imagen: `/rolls/${imagen}` });
  } catch (err) {
    console.error("❌ Error generando imagen:", err.message);
    res.status(500).json({ error: 'Error al generar la imagen' });
  }
});

// 🟢 Servidor funcionando
app.listen(port, () => {
  console.log(`✅ Servidor escuchando en http://localhost:${port}`);
});
