const request = require('supertest');
const path = require('path');
const app = require('../../src/backend/server');

describe('Filtros API', () => {
    describe('GET /api/participantes', () => {
        // Test caso normal: filtrar por especialidad
        test('debería filtrar participantes por especialidad', async () => {
            const response = await request(app)
                .get('/api/participantes')
                .query({ especialidad: '1' });
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            response.body.forEach(alumno => {
                expect(alumno.id_especialidad).toBe(1);
            });
        });

        // Test caso normal: filtrar por plan de estudios
        test('debería filtrar participantes por plan de estudios', async () => {
            const response = await request(app)
                .get('/api/participantes')
                .query({ plan: '2008' });
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            response.body.forEach(alumno => {
                expect(alumno.plan_estudios).toBe('2008');
            });
        });

        // Test caso normal: filtrar por promedio mínimo
        test('debería filtrar participantes por promedio mínimo', async () => {
            const promedioMin = 7.0;
            const response = await request(app)
                .get('/api/participantes')
                .query({ promedio: promedioMin });
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            response.body.forEach(alumno => {
                expect(parseFloat(alumno.promedio_sin_aplazos)).toBeGreaterThanOrEqual(promedioMin);
            });
        });

        // Test caso normal: filtrar por cantidad mínima de actividades
        test('debería filtrar participantes por cantidad mínima de actividades', async () => {
            const actividadesMin = 20;
            const response = await request(app)
                .get('/api/participantes')
                .query({ actividades: actividadesMin });
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            response.body.forEach(alumno => {
                expect(parseInt(alumno.actividades_aprobadas)).toBeGreaterThanOrEqual(actividadesMin);
            });
        });

        // Test caso borde: valores límite
        test('debería manejar valores límite correctamente', async () => {
            const response = await request(app)
                .get('/api/participantes')
                .query({ 
                    promedio: 10,
                    actividades: 50
                });
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });

        // Test caso de error: parámetros inválidos
        test('debería manejar parámetros inválidos graciosamente', async () => {
            const response = await request(app)
                .get('/api/participantes')
                .query({ 
                    promedio: 'invalid',
                    actividades: 'invalid'
                });
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('GET /api/planes', () => {
        // Test caso normal: obtener lista de planes
        test('debería devolver la lista de planes de estudio', async () => {
            const response = await request(app)
                .get('/api/planes');
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
            response.body.forEach(plan => {
                expect(plan).toHaveProperty('plan_estudios');
                expect(typeof plan.plan_estudios).toBe('string');
            });
        });
    });
}); 