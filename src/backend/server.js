// Agrega estas importaciones al inicio del archivo
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const {
    logError,
    logSQLError,
    logValidationError,
    logRouteError,
    logAccess,
    errorMiddleware
} = require('./utils/errorHandler');

const app = express();
const PORT = 3000;

// Configuración de logs
const LOG_DIR = path.join(__dirname, '..', '..', 'logs');
const ERROR_LOG_PATH = path.join(LOG_DIR, 'error.log');
const ACCESS_LOG_PATH = path.join(LOG_DIR, 'access.log');

// Asegurarse de que el directorio de logs existe
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Configurar middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Middleware para logging de acceso
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logAccess(req, res.statusCode, `Completado en ${duration}ms`);
    });
    next();
});

// Verificar que la base de datos existe
const dbPath = path.join(__dirname, '..', 'database', 'Mentoria.db');
let db;

try {
    if (!fs.existsSync(dbPath)) {
        console.warn(`ADVERTENCIA: La base de datos no existe en la ruta: ${dbPath}`);
    }
    
    // Intentar conectar a la base de datos
    db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error('Error al conectar con la base de datos:', err);
        } else {
            console.log('Conectado a la base de datos SQLite');
            
            // Verificar que las tablas requeridas existen
            db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
                if (err) {
                    logSQLError('Verificación de tablas', err);
                } else {
                    const tableNames = tables.map(t => t.name).join(', ');
                    console.log('Tablas disponibles:', tableNames);
                }
            });
        }
    });
} catch(err) {
    console.error('Error al inicializar la base de datos:', err);
}

// Middleware para verificar la conexión a la base de datos
app.use((req, res, next) => {
    if (!db) {
        return next(new Error('No se pudo establecer la conexión con la base de datos'));
    }
    next();
});

// Endpoint para registrar errores del frontend
app.post('/api/log-error', (req, res) => {
    const { message, context, stack, additionalInfo } = req.body;
    
    if (!message || typeof message !== 'string') {
        return res.status(400).json({
            error: true,
            message: 'El mensaje es requerido y debe ser un string'
        });
    }

    console.error('Error del frontend:', {
        message,
        context,
        stack,
        additionalInfo
    });

    res.json({ success: true });
});

// Función helper para convertir datos a formato CSV
function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));
    
    for (const row of data) {
        const values = headers.map(header => {
            const val = row[header] || '';
            return `"${String(val).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
}

// Endpoint para exportar a CSV
app.get('/api/export-csv', (req, res) => {
    const type = req.query.type;
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
    } else {
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
            logSQLError('Exportación CSV', err, {
                type,
                especialidadId,
                searchTerm,
                query,
                params
            });
            return res.status(500).json({
                error: 'Error en exportación CSV',
                message: `Error al generar el archivo CSV para ${type}.`
            });
        }
        
        const csvContent = convertToCSV(rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${type}_${Date.now()}.csv`);
        res.send(csvContent);
        logAccess(req, 200, `CSV generado con ${rows.length} filas para: ${type}`);
    });
});

// Obtener lista de especialidades
app.get('/api/especialidades', (req, res, next) => {
    const query = `SELECT id_especialidad, nombre_especialidad FROM Especialidades ORDER BY nombre_especialidad`;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            return next(err);
        }
        res.json(rows);
    });
});

// Obtener lista de planes de estudio
app.get('/api/planes', (req, res, next) => {
    const query = `SELECT DISTINCT plan_estudios FROM Estudiantes ORDER BY plan_estudios`;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            return next(err);
        }
        res.json(rows);
    });
});

// Obtener lista de participantes
app.get('/api/participantes', (req, res, next) => {
    const { especialidad, plan, promedio, actividades } = req.query;
    
    try {
        const promedioMin = parseFloat(promedio) || 0;
        const actividadesMin = parseInt(actividades) || 0;
        
        let query = `
            SELECT e.Legajo, e.apellido, e.nombre, e.email_personal, e.telefono, 
                   e.plan_estudios, esp.nombre_especialidad, 
                   CAST(e.promedio_sin_aplazos AS FLOAT) as promedio_sin_aplazos,
                   CAST(e.actividades_aprobadas AS INTEGER) as actividades_aprobadas,
                   e.id_especialidad
            FROM Estudiantes e
            INNER JOIN Participantes p ON e.Legajo = p.Legajo
            INNER JOIN Especialidades esp ON e.id_especialidad = esp.id_especialidad
            WHERE 1=1
        `;
        
        const params = [];
        
        if (especialidad && especialidad !== 'todas') {
            query += ' AND e.id_especialidad = ?';
            params.push(especialidad);
        }
        
        if (plan && plan !== 'todos') {
            query += ' AND e.plan_estudios = ?';
            params.push(plan);
        }
        
        if (promedioMin > 0) {
            query += ' AND CAST(e.promedio_sin_aplazos AS FLOAT) >= ?';
            params.push(promedioMin);
        }
        
        if (actividadesMin > 0) {
            query += ' AND CAST(e.actividades_aprobadas AS INTEGER) >= ?';
            params.push(actividadesMin);
        }
        
        query += ' ORDER BY e.apellido, e.nombre';
        
        db.all(query, params, (err, rows) => {
            if (err) {
                return next(err);
            }
            
            rows.forEach(row => {
                row.promedio_sin_aplazos = parseFloat(row.promedio_sin_aplazos) || 0;
                row.actividades_aprobadas = parseInt(row.actividades_aprobadas) || 0;
            });
            
            res.json(rows);
        });
    } catch (err) {
        next(err);
    }
});

// Obtener lista de no participantes
app.get('/api/no-participantes', (req, res) => {
  const especialidadId = req.query.especialidad;
  const plan = req.query.plan;
  const promedioMin = parseFloat(req.query.promedio) || 0;
  const actividadesMin = parseInt(req.query.actividades) || 0;
  
  let query = `
    SELECT e.Legajo, e.apellido, e.nombre, e.email_personal, e.telefono, 
           e.plan_estudios, esp.nombre_especialidad, 
           CAST(e.promedio_sin_aplazos AS FLOAT) as promedio_sin_aplazos,
           CAST(e.actividades_aprobadas AS INTEGER) as actividades_aprobadas,
           e.id_especialidad
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
  
  if (plan && plan !== 'todos') {
    query += ' AND e.plan_estudios = ?';
    params.push(plan);
  }
  
  if (promedioMin > 0) {
    query += ' AND CAST(e.promedio_sin_aplazos AS FLOAT) >= ?';
    params.push(promedioMin);
  }
  
  if (actividadesMin > 0) {
    query += ' AND CAST(e.actividades_aprobadas AS INTEGER) >= ?';
    params.push(actividadesMin);
  }
  
  query += ' ORDER BY e.apellido, e.nombre';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      const errorDetails = logError('Consulta no participantes', err, {
        query,
        params,
        especialidadId,
        plan,
        promedioMin,
        actividadesMin
      });
      res.status(500).json({
        error: 'Error al consultar no participantes',
        message: 'Ocurrió un error al obtener la lista de no participantes.',
        detalles: errorDetails
      });
      return;
    }
    
    // Convertir campos numéricos a números
    rows.forEach(row => {
      row.promedio_sin_aplazos = parseFloat(row.promedio_sin_aplazos) || 0;
      row.actividades_aprobadas = parseInt(row.actividades_aprobadas) || 0;
    });
    
    logAccess(req, 200, `Se encontraron ${rows.length} no participantes`);
    res.json(rows);
  });
});

// Middleware para manejar rutas no encontradas
app.use((req, res) => {
    res.status(404).json({
        error: true,
        message: `La ruta ${req.method} ${req.url} no existe en esta API.`
    });
});

// Middleware para manejo de errores
app.use(errorMiddleware);

// Iniciar el servidor solo si no está siendo importado como módulo
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
}

// Exportar la app para testing
module.exports = app;

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
