// Agrega estas importaciones al inicio del archivo
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;


// Agrega esta función helper para convertir datos a formato CSV
function convertToCSV(data) {
  if (data.length === 0) return '';
  
  // Obtener los encabezados (primera fila)
  const headers = Object.keys(data[0]);
  
  // Crear la fila de encabezados
  const csvRows = [];
  csvRows.push(headers.join(','));
  
  // Agregar las filas de datos
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header] || '';
      // Escapar comillas y encerrar en comillas si contiene comas
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

// Agrega este nuevo endpoint para exportar a CSV
app.get('/api/export-csv', (req, res) => {
  const type = req.query.type; // 'participantes' o 'no-participantes'
  const especialidadId = req.query.especialidad;
  const searchTerm = req.query.search || '';
  
  let query, params = [];
  
  if (type === 'participantes') {
    query = `
      SELECT e.Legajo, e.apellido, e.nombre, e.email_personal, e.telefono, 
             e.plan_estudios, esp.nombre_especialidad, e.promedio_sin_aplazos,
             e.actividades_aprobadas
      FROM Estudiantes e
      INNER JOIN Participantes p ON e.Legajo = p.Legajo
      INNER JOIN Especialidades esp ON e.id_especialidad = esp.id_especialidad
    `;
    
    if (especialidadId && especialidadId !== 'todas') {
      query += ' WHERE e.id_especialidad = ?';
      params.push(especialidadId);
      
      if (searchTerm) {
        query += ' AND (e.apellido LIKE ? OR e.nombre LIKE ? OR e.Legajo LIKE ?)';
        params.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
      }
    } else if (searchTerm) {
      query += ' WHERE (e.apellido LIKE ? OR e.nombre LIKE ? OR e.Legajo LIKE ?)';
      params.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
    }
  } else { // no-participantes
    query = `
      SELECT e.Legajo, e.apellido, e.nombre, e.email_personal, e.telefono, 
             e.plan_estudios, esp.nombre_especialidad, e.promedio_sin_aplazos,
             e.actividades_aprobadas
      FROM Estudiantes e
      LEFT JOIN Participantes p ON e.Legajo = p.Legajo
      INNER JOIN Especialidades esp ON e.id_especialidad = esp.id_especialidad
      WHERE p.Legajo IS NULL
    `;
    
    if (especialidadId && especialidadId !== 'todas') {
      query += ' AND e.id_especialidad = ?';
      params.push(especialidadId);
      
      if (searchTerm) {
        query += ' AND (e.apellido LIKE ? OR e.nombre LIKE ? OR e.Legajo LIKE ?)';
        params.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
      }
    } else if (searchTerm) {
      query += ' AND (e.apellido LIKE ? OR e.nombre LIKE ? OR e.Legajo LIKE ?)';
      params.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
    }
  }
  
  query += ' ORDER BY e.apellido, e.nombre';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error(`Error en consulta para exportación CSV (${type}):`, err.message);
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Convertir datos a CSV
    const csvContent = convertToCSV(rows);
    
    // Configurar headers para descarga
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_${Date.now()}.csv`);
    
    // Enviar CSV como respuesta
    res.send(csvContent);
    console.log(`CSV generado con ${rows.length} filas para: ${type}`);
  });
});



// Configurar middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Verificar que la base de datos existe
const dbPath = path.join(__dirname, '..', 'database', 'Mentoria.db');

try {
  if (!fs.existsSync(dbPath)) {
    console.error(`ERROR: La base de datos no existe en la ruta: ${dbPath}`);
    process.exit(1);
  } else {
    console.log(`Base de datos encontrada en: ${dbPath}`);
  }
} catch(err) {
  console.error('Error al verificar la existencia de la base de datos:', err);
  process.exit(1);
}

// Conexión a la base de datos
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.message);
    process.exit(1);
  } else {
    console.log('Conectado a la base de datos SQLite');
    
    // Verificar que las tablas requeridas existen
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
      if (err) {
        console.error('Error al consultar las tablas de la base de datos:', err.message);
        return;
      }
      console.log('Tablas disponibles:', tables.map(t => t.name).join(', '));
    });
  }
});

// Obtener lista de especialidades
app.get('/api/especialidades', (req, res) => {
  const query = `SELECT id_especialidad, nombre_especialidad FROM Especialidades ORDER BY nombre_especialidad`;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error en consulta de especialidades:', err.message);
      res.status(500).json({ error: err.message });
      return;
    }
    console.log(`Se encontraron ${rows.length} especialidades`);
    res.json(rows);
  });
});

// Obtener alumnos participantes (filtrados por especialidad si se proporciona)
app.get('/api/participantes', (req, res) => {
  const especialidadId = req.query.especialidad;
  let query = `
    SELECT e.Legajo, e.apellido, e.nombre, e.email_personal, e.telefono, 
           e.plan_estudios, esp.nombre_especialidad, e.promedio_sin_aplazos,
           e.actividades_aprobadas
    FROM Estudiantes e
    INNER JOIN Participantes p ON e.Legajo = p.Legajo
    INNER JOIN Especialidades esp ON e.id_especialidad = esp.id_especialidad
  `;
  
  const params = [];
  if (especialidadId && especialidadId !== 'todas') {
    query += ' WHERE e.id_especialidad = ?';
    params.push(especialidadId);
  }
  
  query += ' ORDER BY e.apellido, e.nombre';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error en consulta de participantes:', err.message);
      res.status(500).json({ error: err.message });
      return;
    }
    console.log(`Se encontraron ${rows.length} participantes`);
    res.json(rows);
  });
});

// Obtener alumnos no participantes (filtrados por especialidad si se proporciona)
app.get('/api/no-participantes', (req, res) => {
  const especialidadId = req.query.especialidad;
  let query = `
    SELECT e.Legajo, e.apellido, e.nombre, e.email_personal, e.telefono, 
           e.plan_estudios, esp.nombre_especialidad, e.promedio_sin_aplazos,
           e.actividades_aprobadas
    FROM Estudiantes e
    LEFT JOIN Participantes p ON e.Legajo = p.Legajo
    INNER JOIN Especialidades esp ON e.id_especialidad = esp.id_especialidad
    WHERE p.Legajo IS NULL
  `;
  
  const params = [];
  if (especialidadId && especialidadId !== 'todas') {
    query += ' AND e.id_especialidad = ?';
    params.push(especialidadId);
  }
  
  query += ' ORDER BY e.apellido, e.nombre';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error en consulta de no-participantes:', err.message);
      res.status(500).json({ error: err.message });
      return;
    }
    console.log(`Se encontraron ${rows.length} no participantes`);
    res.json(rows);
  });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Manejar el cierre de la aplicación
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Cerrando la conexión a la base de datos.');
    process.exit(0);
  });
});
