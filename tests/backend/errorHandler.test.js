const fs = require('fs');
const path = require('path');
const {
    ErrorTypes,
    logError,
    logSQLError,
    logValidationError,
    logRouteError,
    logAccess,
    errorMiddleware
} = require('../../src/backend/utils/errorHandler');

// Mock de fs.appendFile
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    appendFile: jest.fn((path, data, callback) => callback()),
    existsSync: jest.fn(() => true),
    mkdirSync: jest.fn()
}));

describe('Error Handler Module', () => {
    beforeEach(() => {
        // Limpiar todos los mocks antes de cada prueba
        jest.clearAllMocks();
        console.error = jest.fn(); // Mock console.error
    });

    describe('logError', () => {
        test('debería registrar un error general correctamente', () => {
            const error = new Error('Test error');
            const context = 'Test Context';
            const details = { extra: 'info' };

            const result = logError(context, error, details);

            expect(result).toMatchObject({
                type: ErrorTypes.GENERAL,
                context: 'Test Context',
                message: 'Test error',
                details: { extra: 'info' }
            });
            expect(fs.appendFile).toHaveBeenCalled();
            expect(console.error).toHaveBeenCalled();
        });

        test('debería manejar errores sin stack trace', () => {
            const result = logError('Test', 'Simple error message');

            expect(result).toMatchObject({
                type: ErrorTypes.GENERAL,
                message: 'Simple error message'
            });
            expect(fs.appendFile).toHaveBeenCalled();
        });
    });

    describe('logSQLError', () => {
        test('debería registrar un error SQL con detalles de la consulta', () => {
            const error = new Error('SQL error');
            const details = {
                query: 'SELECT * FROM table',
                params: ['param1'],
                table: 'test_table',
                operation: 'SELECT'
            };

            const result = logSQLError('SQL Operation', error, details);

            expect(result).toMatchObject({
                type: ErrorTypes.SQL,
                details: expect.objectContaining({
                    query: 'SELECT * FROM table',
                    params: ['param1'],
                    table: 'test_table',
                    operation: 'SELECT'
                })
            });
        });
    });

    describe('logValidationError', () => {
        test('debería registrar errores de validación', () => {
            const validationErrors = {
                field1: 'Required',
                field2: 'Invalid format'
            };
            const requestData = {
                field1: '',
                field2: 'bad-format'
            };

            const result = logValidationError('Validation', validationErrors, requestData);

            expect(result).toMatchObject({
                type: ErrorTypes.VALIDATION,
                details: {
                    validationErrors,
                    requestData
                }
            });
        });
    });

    describe('logRouteError', () => {
        test('debería registrar errores de ruta no encontrada', () => {
            const req = {
                method: 'GET',
                url: '/invalid/path',
                params: {},
                query: { test: 'param' },
                headers: { 'content-type': 'application/json' }
            };

            const result = logRouteError(req);

            expect(result).toMatchObject({
                type: ErrorTypes.ROUTE,
                message: 'Ruta GET /invalid/path no encontrada',
                details: expect.objectContaining({
                    method: 'GET',
                    url: '/invalid/path'
                })
            });
        });
    });

    describe('logAccess', () => {
        test('debería registrar accesos a la API', () => {
            const req = {
                method: 'GET',
                url: '/api/test'
            };
            const status = 200;
            const message = 'Success';

            logAccess(req, status, message);

            expect(fs.appendFile).toHaveBeenCalled();
            const logCall = fs.appendFile.mock.calls[0];
            expect(logCall[1]).toContain('[200] GET /api/test - Success');
        });
    });

    describe('errorMiddleware', () => {
        test('debería manejar errores de validación', () => {
            const err = new Error('Validation failed');
            err.name = 'ValidationError';
            
            const req = {
                path: '/test',
                method: 'POST',
                query: {},
                body: {}
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            errorMiddleware(err, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: true,
                    message: 'Validation failed'
                })
            );
        });

        test('debería manejar errores SQL', () => {
            const err = new Error('SQL error');
            err.code = 'SQLITE_ERROR';
            
            const req = {
                path: '/test',
                method: 'GET',
                query: {},
                body: {}
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            errorMiddleware(err, req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: true,
                    message: 'SQL error'
                })
            );
        });
    });
}); 