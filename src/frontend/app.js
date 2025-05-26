// Variables globales
const API_BASE_URL = 'http://localhost:3000/api';
let currentTab = 'participantes';
let especialidades = [];
let participantesData = [];
let noParticipantesData = [];
let searchTerm = '';
let filtroPromedio = 0;
let filtroActividades = 0;
let filtroPlan = 'todos';
let errorDisplay;

// Elementos del DOM
let tabButtons;
let tabContents;
let especialidadSelect;
let planSelect;
let promedioRange;
let promedioValue;
let actividadesRange;
let actividadesValue;
let searchInput;
let searchBtn;
let loadingElement;
let errorMessage;

// Función de logging
async function logErrorToServer(context, error, additionalInfo = {}) {
    try {
        // Obtener información del navegador y sistema
        const browserInfo = {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };

        // Obtener estado actual de la aplicación
        const appState = {
            currentTab,
            selectedEspecialidad: especialidadSelect?.value || 'todas',
            selectedPlan: planSelect?.value || 'todos',
            filtros: {
                promedio: filtroPromedio,
                actividades: filtroActividades,
                searchTerm
            }
        };

        const errorData = {
            timestamp: new Date().toISOString(),
            context,
            message: error.message || String(error),
            stack: error.stack,
            browserInfo,
            appState,
            additionalInfo,
            errorType: error.name || 'Error',
            url: window.location.href,
            httpStatus: error.status || null,
            httpStatusText: error.statusText || null
        };

        const response = await fetch(`${API_BASE_URL}/log-error`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(errorData)
        });

        if (!response.ok) {
            const pendingLogs = JSON.parse(localStorage.getItem('pendingErrorLogs') || '[]');
            pendingLogs.push(errorData);
            localStorage.setItem('pendingErrorLogs', JSON.stringify(pendingLogs));
            
            throw new Error(`Error al enviar log al servidor: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (e) {
        console.error('Error al intentar registrar error:', e);
        try {
            const fallbackLog = {
                timestamp: new Date().toISOString(),
                context,
                originalError: error.message || String(error),
                loggingError: e.message
            };
            const pendingLogs = JSON.parse(localStorage.getItem('pendingErrorLogs') || '[]');
            pendingLogs.push(fallbackLog);
            localStorage.setItem('pendingErrorLogs', JSON.stringify(pendingLogs));
        } catch (storageError) {
            console.error('Error al guardar en localStorage:', storageError);
        }
    }
}

// Función para reintentar envío de logs pendientes
async function retryPendingLogs() {
    const pendingLogs = JSON.parse(localStorage.getItem('pendingErrorLogs') || '[]');
    if (pendingLogs.length === 0) return;

    const successfulRetries = [];

    for (const log of pendingLogs) {
        try {
            const response = await fetch(`${API_BASE_URL}/log-error`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(log)
            });

            if (response.ok) {
                successfulRetries.push(log);
            }
        } catch (e) {
            console.error('Error al reintentar envío de log:', e);
        }
    }

    // Remover los logs enviados exitosamente
    const remainingLogs = pendingLogs.filter(log => !successfulRetries.includes(log));
    localStorage.setItem('pendingErrorLogs', JSON.stringify(remainingLogs));
}

// Exponer funciones para testing
if (typeof window !== 'undefined') {
    window.logErrorToServer = logErrorToServer;
    window.retryPendingLogs = retryPendingLogs;
}

// Agregar retry de logs pendientes cuando se recupere la conexión
if (typeof window !== 'undefined') {
    window.addEventListener('online', retryPendingLogs);
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async function() {
    // Inicializar referencias a elementos del DOM
    initializeDOMElements();
    
    // Inicializar el display de errores
    errorDisplay = new ErrorDisplay();
    document.body.appendChild(errorDisplay.container);
    
    // Configurar manejo global de errores
    setupErrorHandling();
    
    try {
        // Inicializar la aplicación
        await init();
    } catch (error) {
        console.error('Error durante la inicialización:', error);
        errorDisplay.show(
            'No se pudo inicializar la aplicación. Por favor, contacte al soporte técnico.',
            {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            }
        );
    }
});

function initializeDOMElements() {
    tabButtons = document.querySelectorAll('.tab-btn');
    tabContents = document.querySelectorAll('.tab-content');
    especialidadSelect = document.getElementById('especialidad-select');
    planSelect = document.getElementById('plan-select');
    promedioRange = document.getElementById('promedio-range');
    promedioValue = document.getElementById('promedio-value');
    actividadesRange = document.getElementById('actividades-range');
    actividadesValue = document.getElementById('actividades-value');
    searchInput = document.getElementById('search-input');
    searchBtn = document.getElementById('search-btn');
    loadingElement = document.getElementById('loading');
    errorMessage = document.getElementById('error-message');
}

function setupErrorHandling() {
    window.onerror = (message, source, lineno, colno, error) => {
        console.error('Error global:', error);
        errorDisplay.show(
            'Ha ocurrido un error en la aplicación',
            {
                message,
                source,
                lineno,
                colno,
                stack: error?.stack,
                timestamp: new Date().toISOString()
            }
        );
    };

    window.addEventListener('unhandledrejection', event => {
        console.error('Promise rejection:', event.reason);
        errorDisplay.show(
            'Error de comunicación con el servidor',
            {
                type: 'UnhandledPromiseRejection',
                message: event.reason?.message || 'Error de conexión con el servidor',
                stack: event.reason?.stack,
                timestamp: new Date().toISOString()
            }
        );
    });
}

async function init() {
    showLoading(true);
    try {
        // Configurar listeners
        setupEventListeners();
        
        // Cargar datos iniciales
        await Promise.all([
            fetchEspecialidades(),
            fetchPlanes()
        ]);
        
        // Cargar datos y renderizar la tab actual
        await loadData();
        renderData(currentTab);
    } catch (error) {
        console.error('Error en init:', error);
        errorDisplay.show(
            'Error al inicializar la aplicación',
            {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            }
        );
    } finally {
        showLoading(false);
    }
}

function setupEventListeners() {
    // Tab buttons
    tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const tab = button.getAttribute('data-tab');
            showLoading(true);
            try {
                await loadData(); // Recargar datos al cambiar de tab
                changeTab(tab);
            } catch (error) {
                console.error('Error al cambiar de tab:', error);
                errorDisplay.show(
                    'Error al cambiar de pestaña',
                    {
                        error: error.message,
                        tab: tab,
                        timestamp: new Date().toISOString()
                    }
                );
            } finally {
                showLoading(false);
            }
        });
    });

    // Especialidad select
    especialidadSelect = document.getElementById('especialidad-select');
    especialidadSelect.addEventListener('change', () => {
        loadData();
    });

    // Búsqueda
    searchBtn = document.getElementById('search-btn');
    searchBtn.addEventListener('click', performSearch);
    searchInput = document.getElementById('search-input');
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        } else if (searchInput.value === '') {
            searchTerm = '';
            renderData(currentTab);
        }
    });

    // Botones de exportación
    const exportParticipantesBtn = document.getElementById('export-participantes');
    const exportNoParticipantesBtn = document.getElementById('export-no-participantes');
    
    if (exportParticipantesBtn) {
        exportParticipantesBtn.addEventListener('click', () => {
            exportToCSV('participantes');
        });
    } else {
        console.warn('Elemento con id "export-participantes" no encontrado');
    }
    
    if (exportNoParticipantesBtn) {
        exportNoParticipantesBtn.addEventListener('click', () => {
            exportToCSV('no-participantes');
        });
    } else {
        console.warn('Elemento con id "export-no-participantes" no encontrado');
    }

    // Nuevos event listeners para filtros
    planSelect = document.getElementById('plan-select');
    planSelect.addEventListener('change', () => {
        filtroPlan = planSelect.value;
        loadData();
    });

    promedioRange = document.getElementById('promedio-range');
    promedioRange.addEventListener('input', () => {
        filtroPromedio = parseFloat(promedioRange.value);
        promedioValue.textContent = filtroPromedio.toFixed(1);
        loadData();
    });

    actividadesRange = document.getElementById('actividades-range');
    actividadesRange.addEventListener('input', () => {
        filtroActividades = parseInt(actividadesRange.value);
        actividadesValue.textContent = filtroActividades;
        loadData();
    });
}

function exportToCSV(type) {
    const especialidadId = especialidadSelect.value;
    const search = searchTerm;
    
    // Mostrar indicador de carga
    showLoading(true);
    
    // Construir URL con parámetros
    let url = `${API_BASE_URL}/export-csv?type=${type}&especialidad=${especialidadId}`;
    if (search) {
        url += `&search=${encodeURIComponent(search)}`;
    }
    
    // Redirigir para descargar el archivo
    window.location.href = url;
    
    // Ocultar indicador de carga después de un momento
    setTimeout(() => {
        showLoading(false);
    }, 1000);
}

function changeTab(tab) {
    // Actualizar botones
    tabButtons.forEach(btn => {
        if (btn.getAttribute('data-tab') === tab) {
            btn.classList.remove('text-gray-500', 'border-transparent', 'hover:border-gray-300', 'hover:text-gray-700');
            btn.classList.add('border-blue-500', 'text-blue-600');
        } else {
            btn.classList.remove('border-blue-500', 'text-blue-600');
            btn.classList.add('text-gray-500', 'border-transparent', 'hover:border-gray-300', 'hover:text-gray-700');
        }
    });

    // Actualizar contenido
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        if (content.id === tab) {
            content.classList.add('active');
            content.style.display = 'block';
        } else {
            content.classList.remove('active');
            content.style.display = 'none';
        }
    });

    currentTab = tab;
    // Renderizar solo los datos de la tab actual
    renderData(tab);
}

async function fetchEspecialidades() {
    try {
        const response = await fetch(`${API_BASE_URL}/especialidades`);
        if (!response.ok) throw new Error('Error del servidor');
        
        const data = await response.json();
        especialidades = data;
        renderEspecialidades();
    } catch (error) {
        await logErrorToServer('Carga de especialidades', error);
        throw new Error('Error al cargar las especialidades');
    }
}

function renderEspecialidades() {
    // Mantener la opción "Todas las especialidades"
    especialidadSelect.innerHTML = '<option value="todas">Todas las especialidades</option>';
    
    // Agregar las especialidades de la base de datos
    especialidades.forEach(esp => {
        const option = document.createElement('option');
        option.value = esp.id_especialidad;
        option.textContent = esp.nombre_especialidad;
        especialidadSelect.appendChild(option);
    });
}

async function fetchPlanes() {
    try {
        const response = await fetch(`${API_BASE_URL}/planes`);
        if (!response.ok) throw new Error('Error del servidor');
        
        const data = await response.json();
        renderPlanes(data);
    } catch (error) {
        await logErrorToServer('Carga de planes', error);
        throw new Error('Error al cargar los planes');
    }
}

function renderPlanes(planes) {
    // Mantener la opción "Todos los planes"
    planSelect.innerHTML = '<option value="todos">Todos los planes</option>';
    
    // Agregar los planes de la base de datos
    planes.forEach(plan => {
        const option = document.createElement('option');
        option.value = plan.plan_estudios;
        option.textContent = plan.plan_estudios;
        planSelect.appendChild(option);
    });
}

async function fetchData(type, params = {}) {
    try {
        const queryParams = new URLSearchParams(params).toString();
        const url = `/api/${type}${queryParams ? `?${queryParams}` : ''}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error del servidor');
        
        return await response.json();
    } catch (error) {
        await logErrorToServer(`Carga de datos - ${type}`, error);
        throw error;
    }
}

async function loadData() {
    showLoading(true);
    errorMessage.style.display = 'none';
    
    try {
        const params = {
            especialidad: especialidadSelect.value,
            plan: planSelect.value,
            promedio: promedioRange.value,
            actividades: actividadesRange.value
        };
        
        const [participantes, noParticipantes] = await Promise.all([
            fetchData('participantes', params),
            fetchData('no-participantes', params)
        ]);
        
        participantesData = participantes;
        noParticipantesData = noParticipantes;
        
        renderData('participantes');
        renderData('no-participantes');
    } catch (error) {
        await logErrorToServer('Carga de datos', error);
        showError('Error al cargar los datos');
    } finally {
        showLoading(false);
    }
}

function renderData(type) {
    // Solo renderizar si es la tab activa
    if (type !== currentTab) {
        return;
    }

    const data = type === 'participantes' ? participantesData : noParticipantesData;
    const tableId = `${type}-table`;
    const tableBody = document.querySelector(`#${tableId} tbody`);
    const countElement = document.getElementById(`${type}-count`);
    const noRecordsMessage = document.getElementById(`no-${type}-found`);
    
    // Limpiar tabla
    if (!tableBody) {
        console.error(`No se encontró el tbody para la tabla ${tableId}`);
        errorDisplay.show(
            'Error al mostrar los datos',
            {
                error: `No se encontró el elemento tbody para la tabla ${tableId}`,
                type: type,
                timestamp: new Date().toISOString()
            }
        );
        return;
    }
    
    tableBody.innerHTML = '';
    
    // Si no hay datos, mostrar mensaje y salir
    if (!data || !Array.isArray(data)) {
        if (countElement) countElement.textContent = '0';
        if (noRecordsMessage) noRecordsMessage.style.display = 'block';
        return;
    }
    
    // Aplicar todos los filtros
    let filteredData = [...data];
    
    // Filtro por búsqueda
    if (searchTerm) {
        filteredData = filteredData.filter(alumno => {
            const searchFields = `${alumno.Legajo || ''} ${alumno.apellido || ''} ${alumno.nombre || ''}`.toLowerCase();
            return searchFields.includes(searchTerm.toLowerCase());
        });
    }

    // Filtro por plan de estudios
    if (filtroPlan !== 'todos') {
        filteredData = filteredData.filter(alumno => alumno.plan_estudios === filtroPlan);
    }

    // Filtro por promedio mínimo
    if (filtroPromedio > 0) {
        filteredData = filteredData.filter(alumno => {
            const promedio = parseFloat(alumno.promedio_sin_aplazos) || 0;
            return promedio >= filtroPromedio;
        });
    }
    
    // Filtro por cantidad mínima de actividades
    if (filtroActividades > 0) {
        filteredData = filteredData.filter(alumno => {
            const actividades = parseInt(alumno.actividades_aprobadas) || 0;
            return actividades >= filtroActividades;
        });
    }
    
    // Actualizar contador
    if (countElement) countElement.textContent = filteredData.length.toString();

    // Mostrar mensaje si no hay resultados
    if (filteredData.length === 0) {
        if (noRecordsMessage) noRecordsMessage.style.display = 'block';
        return;
    } else {
        if (noRecordsMessage) noRecordsMessage.style.display = 'none';
    }
    
    // Renderizar datos filtrados
    filteredData.forEach((alumno, index) => {
        const row = document.createElement('tr');
        const promedio = parseFloat(alumno.promedio_sin_aplazos) || 0;
        const actividades = parseInt(alumno.actividades_aprobadas) || 0;
        
        // Alternar colores de fondo para mejor legibilidad
        const bgClass = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        row.className = bgClass;
        row.innerHTML = `
            <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">${alumno.Legajo || ''}</td>
            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">${alumno.apellido || ''}</td>
            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">${alumno.nombre || ''}</td>
            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">${alumno.nombre_especialidad || ''}</td>
            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">${promedio.toFixed(2)}</td>
            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">${actividades}</td>
        `;
        tableBody.appendChild(row);
    });
}

function performSearch() {
    searchTerm = searchInput.value.toLowerCase().trim();
    loadData();
}

function showLoading(show) {
    loadingElement.style.display = show ? 'flex' : 'none';
    if (show) errorMessage.style.display = 'none';
}

function showError(message) {
    loadingElement.style.display = 'none';
    errorMessage.textContent = message;
    errorMessage.style.display = 'flex';
}

// Función helper para hacer peticiones a la API
async function fetchApi(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`Error en fetchApi (${endpoint}):`, error);
        errorDisplay.show(
            'Error al comunicarse con el servidor',
            {
                endpoint,
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            }
        );
        throw error;
    }
}

// Exportar funciones y variables necesarias
window.fetchApi = fetchApi;
