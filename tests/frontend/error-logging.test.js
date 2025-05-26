/**
 * @jest-environment jsdom
 */

// Importar fetch mock
require('jest-fetch-mock').enableMocks();

// Configurar variables globales necesarias
global.API_BASE_URL = 'http://localhost:3000/api';

describe('Frontend Error Logging', () => {
    let mockLocalStorage;
    
    beforeAll(() => {
        // Configurar localStorage antes de cargar el script
        mockLocalStorage = {
            store: {},
            getItem: jest.fn(key => mockLocalStorage.store[key]),
            setItem: jest.fn((key, value) => mockLocalStorage.store[key] = value),
            clear: jest.fn(() => mockLocalStorage.store = {})
        };
        
        Object.defineProperty(window, 'localStorage', {
            value: mockLocalStorage,
            writable: true
        });
        
        // Mock navigator
        Object.defineProperty(window, 'navigator', {
            value: {
                userAgent: 'test-agent',
                language: 'es-ES',
                platform: 'test-platform'
            },
            writable: true
        });
        
        // Mock window dimensions
        Object.defineProperty(window, 'innerWidth', { value: 1024 });
        Object.defineProperty(window, 'innerHeight', { value: 768 });
    });
    
    beforeEach(() => {
        // Resetear mocks antes de cada prueba
        fetch.resetMocks();
        mockLocalStorage.clear();
        
        // Setup DOM completo
        document.body.innerHTML = `
            <div id="loading" style="display: none;"></div>
            <div id="error-message" style="display: none;"></div>
            <select id="especialidad-select">
                <option value="todas">Todas las especialidades</option>
            </select>
            <select id="plan-select">
                <option value="todos">Todos los planes</option>
            </select>
            <input type="range" id="promedio-range" min="0" max="10" step="0.1" value="0">
            <span id="promedio-value">0</span>
            <input type="range" id="actividades-range" min="0" max="100" step="1" value="0">
            <span id="actividades-value">0</span>
            <input type="text" id="search-input">
            <button id="search-btn">Buscar</button>
            <div id="participantes" class="tab-content active"></div>
            <div id="no-participantes" class="tab-content"></div>
            <button class="tab-btn active" data-tab="participantes">Participantes</button>
            <button class="tab-btn" data-tab="no-participantes">No Participantes</button>
        `;
        
        // Cargar el script antes de cada prueba
        jest.isolateModules(() => {
            require('../../src/frontend/app.js');
        });
    });
    
    test('debería enviar error al servidor con información contextual completa', async () => {
        // Simular respuesta exitosa del servidor
        fetch.mockResponseOnce(JSON.stringify({ success: true }));
        
        // Simular un error
        const error = new Error('Error de prueba');
        error.stack = 'Error: Error de prueba\n    at test.js:1:1';
        
        // Llamar a logErrorToServer
        await window.logErrorToServer('Test Context', error, { extraInfo: 'test' });
        
        // Verificar la llamada a fetch
        expect(fetch).toHaveBeenCalledTimes(1);
        
        const [url, options] = fetch.mock.calls[0];
        expect(url).toBe('http://localhost:3000/api/log-error');
        expect(options.method).toBe('POST');
        
        const sentData = JSON.parse(options.body);
        expect(sentData).toMatchObject({
            context: 'Test Context',
            message: 'Error de prueba',
            stack: expect.any(String),
            browserInfo: {
                userAgent: 'test-agent',
                language: 'es-ES',
                platform: 'test-platform',
                viewport: {
                    width: 1024,
                    height: 768
                }
            },
            appState: {
                currentTab: expect.any(String),
                selectedEspecialidad: expect.any(String),
                selectedPlan: expect.any(String),
                filtros: expect.any(Object)
            },
            additionalInfo: { extraInfo: 'test' },
            timestamp: expect.any(String)
        });
    });
    
    test('debería guardar en localStorage cuando falla el envío al servidor', async () => {
        // Simular fallo del servidor
        fetch.mockRejectOnce(new Error('Network error'));
        
        // Simular un error
        const error = new Error('Error de prueba');
        
        // Llamar a logErrorToServer
        await window.logErrorToServer('Test Context', error);
        
        // Verificar que se guardó en localStorage
        expect(mockLocalStorage.setItem).toHaveBeenCalled();
        
        const savedLogs = JSON.parse(mockLocalStorage.store.pendingErrorLogs || '[]');
        expect(savedLogs).toHaveLength(1);
        expect(savedLogs[0]).toMatchObject({
            timestamp: expect.any(String),
            context: 'Test Context',
            originalError: 'Error de prueba',
            loggingError: expect.any(String)
        });
    });
    
    test('debería reintentar enviar logs pendientes cuando se recupera la conexión', async () => {
        // Preparar logs pendientes
        const pendingLogs = [{
            timestamp: new Date().toISOString(),
            context: 'Test Context',
            message: 'Error pendiente',
            browserInfo: {
                userAgent: 'test-agent'
            }
        }];
        mockLocalStorage.store.pendingErrorLogs = JSON.stringify(pendingLogs);
        
        // Simular respuesta exitosa del servidor
        fetch.mockResponseOnce(JSON.stringify({ success: true }));
        
        // Disparar evento online
        window.dispatchEvent(new Event('online'));
        
        // Esperar a que se procesen las promesas
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verificar que se intentó enviar el log pendiente al menos una vez
        expect(fetch).toHaveBeenCalledWith(
            `${API_BASE_URL}/log-error`,
            expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
        );
        
        // Verificar que se limpió localStorage
        const remainingLogs = JSON.parse(mockLocalStorage.store.pendingErrorLogs || '[]');
        expect(remainingLogs).toHaveLength(0);
    });
}); 