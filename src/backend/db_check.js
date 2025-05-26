const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Verificar que la base de datos existe
const dbPath = 'D:/TutoriasDB/Mentoria.db';

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

// Conectar a la base de datos
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.message);
    process.exit(1);
  } else {
    console.log('Conectado a la base de datos SQLite');
    
    // Verificar que las tablas existen
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
      if (err) {
        console.error('Error al consultar las tablas de la base de datos:', err.message);
        db.close();
        return;
      }
      
      const tableNames = tables.map(t => t.name);
      console.log('Tablas disponibles:', tableNames.join(', '));
      
      // Verificar cada tabla necesaria
      checkTable(tableNames, 'Estudiantes');
      checkTable(tableNames, 'Participantes');
      checkTable(tableNames, 'Especialidades');
      
      // Mostrar la estructura de cada tabla
      tables.forEach(table => {
        db.all(`PRAGMA table_info(${table.name})`, [], (err, columns) => {
          if (err) {
            console.error(`Error al obtener información de la tabla ${table.name}:`, err.message);
            return;
          }
          console.log(`\nEstructura de tabla ${table.name}:`);
          columns.forEach(col => {
            console.log(`  - ${col.name} (${col.type})`);
          });
          
          // Si hemos procesado la última tabla, cerramos la conexión
          if (table.name === tableNames[tableNames.length - 1]) {
            db.close();
          }
        });
      });
    });
  }
});

function checkTable(tables, tableName) {
  if (!tables.includes(tableName)) {
    console.error(`ADVERTENCIA: La tabla ${tableName} no existe en la base de datos`);
  } else {
    console.log(`Tabla ${tableName} encontrada`);
  }
}
