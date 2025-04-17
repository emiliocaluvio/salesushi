// ... (lo que ya tenías antes)

// 🔸 Obtener cupos disponibles por horario
app.get('/api/disponibilidad', async (req, res) => {
  const horarios = ['horario_19', 'horario_20', 'horario_21'];
  const result = await Promise.all(horarios.map(async (tabla, i) => {
    const { count } = await supabase.from(tabla).select('*', { count: 'exact', head: true });
    return {
      hora: `${19 + i}:00`,
      disponibles: 10 - count
    };
  }));
  res.json(result);
});

// 🔸 Guardar pedido y asignar a horario
app.post('/guardar-pedido-horario', async (req, res) => {
  const {
    nombre_cliente, apellido_cliente, celular_cliente, metodo_pago,
    rolls, horario
  } = req.body;

  const tablaHorario = {
    '19:00': 'horario_19',
    '20:00': 'horario_20',
    '21:00': 'horario_21'
  }[horario];

  if (!tablaHorario) {
    return res.status(400).json({ error: 'Horario inválido' });
  }

  // Verificar cupos
  const { count } = await supabase.from(tablaHorario).select('*', { count: 'exact', head: true });
  if ((count || 0) + rolls.length > 10) {
    return res.status(400).json({ error: 'No hay suficientes cupos en ese horario' });
  }

  // Armar datos completos
  const fecha = new Date();
  const registros = rolls.map(r => ({
    nombre_cliente,
    apellido_cliente,
    celular_cliente,
    metodo_pago,
    proteina: r.proteina,
    cobertura: r.cobertura,
    vegetal: r.vegetal,
    precio: r.precio,
    fecha
  }));

  // Guardar en histórico
  const { error: errorHistorico } = await supabase.from('pedidos').insert(registros);
  if (errorHistorico) return res.status(500).json({ error: errorHistorico.message });

  // Guardar en tabla de horario
  const { error: errorHorario } = await supabase.from(tablaHorario).insert(registros);
  if (errorHorario) return res.status(500).json({ error: errorHorario.message });

  res.status(200).json({ message: 'Pedido guardado correctamente en histórico y horario' });
});

// 🔸 Limpiar tabla horaria desde admin
app.delete('/api/limpiar_tabla/:tabla', async (req, res) => {
  const { tabla } = req.params;
  if (!['horario_19', 'horario_20', 'horario_21'].includes(tabla)) {
    return res.status(400).json({ error: 'Tabla no válida' });
  }

  const { error } = await supabase.from(tabla).delete().neq('id', 0);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ message: 'Tabla limpiada correctamente' });
});
