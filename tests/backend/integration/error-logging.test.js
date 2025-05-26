const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../../../src/backend/server');

describe('Sistema de Logging - Pruebas de Integración', () => {
    const LOG_DIR = path.join(__dirname, '..', '..', '..', 'logs');
    const ERROR_LOG_PATH = path.join(LOG_DIR, 'error.log');
    const SQL_LOG_PATH = path.join(LOG_DIR, 'sql.log');
    const VALIDATION_LOG_PATH = path.join(LOG_DIR, 'validation.log');
    const ACCESS_LOG_PATH = path.join(LOG_DIR, 'access.log');

    beforeAll(() => {
        // Asegurar que el directorio de logs existe
        if (!fs.existsSync(LOG_DIR)) {
            fs.mkdirSync(LOG_DIR, { recursive: true });
        }
    });

    beforeEach(() => {
        // Limpiar archivos de log antes de cada prueba
        [ERROR_LOG_PATH, SQL_LOG_PATH, VALIDATION_LOG_PATH, ACCESS_LOG_PATH].forEach(logPath => {
            if (fs.existsSync(logPath)) {
                fs.writeFileSync(logPath, '');
            }
        });
        
        // Esperar un momento para asegurar que los archivos estén limpios
        return new Promise(resolve => setTimeout(resolve, 100));
    });

    afterEach(() => {
        // Esperar un momento para asegurar que los logs se escriban
        return new Promise(resolve => setTimeout(resolve, 100));
    });

    test('debería registrar error SQL al consultar con query malformada', async () => {
        const response = await request(app)
            .get('/api/participantes?promedio=invalid')
            .expect(500);

        expect(response.body).toMatchObject({
            error: 'Error al consultar participantes'
        });

        // Verificar log SQL
        const sqlLog = fs.readFileSync(SQL_LOG_PATH, 'utf8');
        expect(sqlLog).toContain('SQL_ERROR');
        expect(sqlLog).toContain('Consulta participantes');
    });

    test('debería registrar error de validación al enviar datos inválidos', async () => {
        const invalidData = {
            context: 'Test',
            message: null, // Debe ser string
            stack: 123 // Debe ser string
        };

        const response = await request(app)
            .post('/api/log-error')
            .send(invalidData)
            .expect(400);

        expect(response.body).toMatchObject({
            error: true
        });

        // Verificar log de validación
        const validationLog = fs.readFileSync(VALIDATION_LOG_PATH, 'utf8');
        expect(validationLog).toContain('VALIDATION_ERROR');
    });

    test('debería registrar error de ruta no encontrada', async () => {
        const response = await request(app)
            .get('/api/ruta-inexistente')
            .expect(404);

        expect(response.body).toMatchObject({
            error: 'Ruta no encontrada'
        });

        // Verificar log de error
        const errorLog = fs.readFileSync(ERROR_LOG_PATH, 'utf8');
        expect(errorLog).toContain('ROUTE_ERROR');
        expect(errorLog).toContain('/api/ruta-inexistente');
    });

    test('debería registrar accesos exitosos', async () => {
        await request(app)
            .get('/api/especialidades')
            .expect(200);

        // Verificar log de acceso
        const accessLog = fs.readFileSync(ACCESS_LOG_PATH, 'utf8');
        expect(accessLog).toContain('[200]');
        expect(accessLog).toContain('GET /api/especialidades');
    });

    test('debería registrar error del frontend', async () => {
        const errorData = {
            context: 'Test Frontend',
            message: 'Error de prueba',
            stack: 'Error: Error de prueba\n    at test.js:1:1',
            additionalInfo: {
                browser: 'Chrome',
                version: '100.0.0'
            }
        };

        const response = await request(app)
            .post('/api/log-error')
            .send(errorData)
            .expect(200);

        expect(response.body).toMatchObject({
            success: true,
            errorId: expect.any(String)
        });

        // Verificar log de error
        const errorLog = fs.readFileSync(ERROR_LOG_PATH, 'utf8');
        expect(errorLog).toContain('Frontend Error');
        expect(errorLog).toContain('Error de prueba');
        expect(errorLog).toContain('Chrome');
    });

    test('debería registrar detalles completos en errores SQL', async () => {
        // Forzar un error SQL con un valor inválido para promedio
        const response = await request(app)
            .get('/api/participantes?promedio=invalid&especialidad=1')
            .expect(500);

        // Verificar log SQL
        const sqlLog = fs.readFileSync(SQL_LOG_PATH, 'utf8');
        expect(sqlLog).toContain('SQL_ERROR');
        expect(sqlLog).toContain('Consulta participantes');
        expect(sqlLog).toContain('promedio=invalid');
    });
}); 