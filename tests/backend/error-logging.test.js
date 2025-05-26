const request = require('supertest');
const path = require('path');
const fs = require('fs').promises;
const app = require('../../src/backend/server');

const ERROR_LOG_PATH = path.join(__dirname, '../../logs/error.log');
const ACCESS_LOG_PATH = path.join(__dirname, '../../logs/access.log');

describe('Error Logging', () => {
    // Limpiar los logs antes de cada prueba
    beforeEach(async () => {
        try {
            await fs.writeFile(ERROR_LOG_PATH, '');
            await fs.writeFile(ACCESS_LOG_PATH, '');
        } catch (error) {
            console.error('Error al limpiar los archivos de log:', error);
        }
    });

    describe('API Errors', () => {
        test('debería registrar errores de base de datos en error.log', async () => {
            // Forzar un error de SQL inválido
            const response = await request(app)
                .get('/api/participantes')
                .query({ especialidad: 'INVALID_SQL' });
            
            expect(response.status).toBe(500);
            
            // Verificar que el error se registró
            const errorLog = await fs.readFile(ERROR_LOG_PATH, 'utf8');
            expect(errorLog).toContain('[ERROR]');
            expect(errorLog).toContain('Consulta participantes');
            expect(errorLog).toContain('INVALID_SQL');
        });

        test('debería registrar errores de parámetros inválidos', async () => {
            // Enviar parámetros que causarán error
            const response = await request(app)
                .get('/api/participantes')
                .query({ 
                    promedio: 'not_a_number',
                    actividades: {}  // Objeto inválido
                });
            
            expect(response.status).toBe(400);
            
            // Verificar que el error se registró
            const errorLog = await fs.readFile(ERROR_LOG_PATH, 'utf8');
            expect(errorLog).toContain('[ERROR]');
            expect(errorLog).toContain('Validación de parámetros');
            expect(errorLog).toContain('not_a_number');
        });

        test('debería registrar errores de rutas no existentes', async () => {
            // Intentar acceder a una ruta que no existe
            const response = await request(app)
                .get('/api/ruta_no_existente');
            
            expect(response.status).toBe(404);
            
            // Verificar que el error se registró
            const errorLog = await fs.readFile(ERROR_LOG_PATH, 'utf8');
            expect(errorLog).toContain('[ERROR]');
            expect(errorLog).toContain('Ruta no encontrada');
            expect(errorLog).toContain('/api/ruta_no_existente');
        });
    });

    describe('Frontend Error Logging', () => {
        test('debería registrar errores del cliente en error.log', async () => {
            // Simular un error del cliente
            const errorData = {
                context: 'Frontend Error',
                message: 'Error en la carga de datos',
                stack: 'Error: Failed to load data\n    at loadData (/app.js:123)'
            };

            const response = await request(app)
                .post('/api/log-error')
                .send(errorData);
            
            expect(response.status).toBe(200);
            
            // Verificar que el error se registró
            const errorLog = await fs.readFile(ERROR_LOG_PATH, 'utf8');
            expect(errorLog).toContain('[ERROR]');
            expect(errorLog).toContain('Frontend Error');
            expect(errorLog).toContain('Error en la carga de datos');
        });
    });

    describe('Access Logging', () => {
        test('debería registrar accesos exitosos en access.log', async () => {
            // Hacer una petición exitosa
            const response = await request(app)
                .get('/api/especialidades');
            
            expect(response.status).toBe(200);
            
            // Verificar que el acceso se registró
            const accessLog = await fs.readFile(ACCESS_LOG_PATH, 'utf8');
            expect(accessLog).toContain('[200]');
            expect(accessLog).toContain('GET /api/especialidades');
        });
    });
}); 