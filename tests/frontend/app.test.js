/**
 * @jest-environment jsdom
 */

// Import fetch mock
require('jest-fetch-mock').enableMocks();

// Setup DOM elements
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
  
  <div id="participantes">
    <span id="participantes-count">0</span>
    <div id="no-participantes-found" style="display: none;">No se encontraron resultados</div>
    <table id="participantes-table">
      <tbody></tbody>
    </table>
  </div>
  
  <div id="no-participantes">
    <span id="no-participantes-count">0</span>
    <div id="no-no-participantes-found" style="display: none;">No se encontraron resultados</div>
    <table id="no-participantes-table">
      <tbody></tbody>
    </table>
  </div>
  
  <button id="export-participantes">Exportar Participantes</button>
  <button id="export-no-participantes">Exportar No Participantes</button>
`;

// Import the app code
const fs = require('fs');
const path = require('path');
const appCode = fs.readFileSync(path.join(__dirname, '../../src/frontend/app.js'), 'utf8');

// Mock data
const mockEspecialidades = [
  { id_especialidad: 1, nombre_especialidad: 'Sistemas' },
  { id_especialidad: 2, nombre_especialidad: 'Mecánica' }
];

const mockPlanes = [
  { plan_estudios: '2008' },
  { plan_estudios: '2014' }
];

const mockNoParticipantes = [
  {
    Legajo: '12345',
    apellido: 'García',
    nombre: 'Juan',
    email_personal: 'juan@test.com',
    telefono: '123456789',
    plan_estudios: '2008',
    nombre_especialidad: 'Sistemas',
    promedio_sin_aplazos: 8.5,
    actividades_aprobadas: 30
  },
  {
    Legajo: '67890',
    apellido: 'López',
    nombre: 'María',
    email_personal: 'maria@test.com',
    telefono: '987654321',
    plan_estudios: '2008',
    nombre_especialidad: 'Sistemas',
    promedio_sin_aplazos: 7.0,
    actividades_aprobadas: 20
  }
];

// Helper function to wait for async operations
async function waitForTimeout(ms = 500) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

// Initialize app
eval(appCode);
document.dispatchEvent(new Event('DOMContentLoaded'));

describe('Frontend Filters', () => {
  beforeEach(() => {
    fetch.resetMocks();
    document.getElementById('especialidad-select').value = 'todas';
    document.getElementById('plan-select').value = 'todos';
    document.getElementById('promedio-range').value = '0';
    document.getElementById('actividades-range').value = '0';
    document.getElementById('search-input').value = '';
    document.getElementById('error-message').style.display = 'none';
    document.getElementById('loading').style.display = 'none';
  });

  test('should load and display no-participantes data correctly', async () => {
    // Mock successful responses
    fetch
      .mockResponseOnce(JSON.stringify(mockEspecialidades))
      .mockResponseOnce(JSON.stringify(mockPlanes))
      .mockResponseOnce(JSON.stringify([]))
      .mockResponseOnce(JSON.stringify(mockNoParticipantes));

    // Trigger load
    document.getElementById('especialidad-select').dispatchEvent(new Event('change'));
    
    // Wait for async operations
    await waitForTimeout();

    // Check results
    const tableBody = document.querySelector('#no-participantes-table tbody');
    expect(tableBody.children.length).toBe(2);
    expect(document.getElementById('no-participantes-count').textContent).toBe('2');
  });

  test('should handle API errors gracefully', async () => {
    // Mock error responses
    fetch.mockReject(new Error('Error del servidor'));

    // Trigger load
    document.getElementById('especialidad-select').dispatchEvent(new Event('change'));
    
    // Wait for async operations
    await waitForTimeout();

    // Check error message
    const errorMessage = document.getElementById('error-message');
    expect(errorMessage.style.display).toBe('flex');
    expect(errorMessage.textContent).toContain('Error al cargar los datos');
  });
}); 