document.addEventListener('DOMContentLoaded', function() {
    // Variables globales
    const API_BASE_URL = 'http://localhost:3000/api';
    let currentTab = 'participantes';
    let especialidades = [];
    let participantesData = [];
    let noParticipantesData = [];
    let searchTerm = '';

    // Elementos del DOM
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const especialidadSelect = document.getElementById('especialidad-select');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const loadingElement = document.getElementById('loading');
    const errorMessage = document.getElementById('error-message');
    
    // Inicializar la aplicación
    init();

    function init() {
        // Configurar listeners
        setupEventListeners();
        
        // Cargar especialidades
        fetchEspecialidades()
            .then(() => {
                // Cargar datos iniciales
                fetchData('participantes');
                fetchData('no-participantes');
            })
            .catch(error => {
                console.error('Error durante la inicialización:', error);
                showError();
            });
    }

    function setupEventListeners() {
		// Tab buttons
		tabButtons.forEach(button => {
			button.addEventListener('click', () => {
				const tab = button.getAttribute('data-tab');
				changeTab(tab);
			});
		});

		// Especialidad select
		especialidadSelect.addEventListener('change', () => {
			fetchData('participantes');
			fetchData('no-participantes');
		});

		// Búsqueda
		searchBtn.addEventListener('click', performSearch);
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
            btn.classList.remove('active');
            if (btn.getAttribute('data-tab') === tab) {
                btn.classList.add('active');
            }
        });

        // Actualizar contenido
        tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === tab) {
                content.classList.add('active');
            }
        });

        currentTab = tab;
    }

    async function fetchEspecialidades() {
        showLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/especialidades`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            especialidades = await response.json();
            renderEspecialidades();
            showLoading(false);
        } catch (error) {
            console.error('Error fetching especialidades:', error);
            showLoading(false);
            showError();
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

    async function fetchData(type) {
        showLoading(true);
        
        const especialidadId = especialidadSelect.value;
        let url = `${API_BASE_URL}/${type}?especialidad=${especialidadId}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Guardar datos según el tipo
            if (type === 'participantes') {
                participantesData = data;
            } else {
                noParticipantesData = data;
            }
            
            renderData(type);
            showLoading(false);
        } catch (error) {
            console.error(`Error fetching ${type}:`, error);
            showLoading(false);
            showError();
        }
    }

    function renderData(type) {
        const data = type === 'participantes' ? participantesData : noParticipantesData;
        const tableId = `${type}-table`;
        const tableBody = document.querySelector(`#${tableId} tbody`);
        const countElement = document.getElementById(`${type}-count`);
        const noRecordsMessage = document.getElementById(`no-${type}-found`);
        
        // Filtrar por término de búsqueda si existe
        let filteredData = data;
        if (searchTerm) {
            filteredData = data.filter(student => {
                const fullName = `${student.apellido} ${student.nombre}`.toLowerCase();
                const legajo = student.Legajo.toString().toLowerCase();
                return fullName.includes(searchTerm) || legajo.includes(searchTerm);
            });
        }
        
        // Actualizar contador
        countElement.textContent = filteredData.length;
        
        // Limpiar tabla
        tableBody.innerHTML = '';
        
        // Mostrar mensaje si no hay datos
        if (filteredData.length === 0) {
            noRecordsMessage.style.display = 'flex';
            return;
        } else {
            noRecordsMessage.style.display = 'none';
        }
        
        // Llenar tabla con datos
        filteredData.forEach(student => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${student.Legajo}</td>
                <td>${student.apellido || '-'}</td>
                <td>${student.nombre || '-'}</td>
                <td>${student.email_personal || '-'}</td>
                <td>${student.telefono || '-'}</td>
                <td>${student.plan_estudios || '-'}</td>
                <td>${student.nombre_especialidad || '-'}</td>
                <td>${student.promedio_sin_aplazos || '-'}</td>
                <td>${student.actividades_aprobadas || '0'}</td>
            `;
            
            tableBody.appendChild(row);
        });
    }

    function performSearch() {
        searchTerm = searchInput.value.toLowerCase().trim();
        renderData(currentTab);
    }

    function showLoading(show) {
        loadingElement.style.display = show ? 'flex' : 'none';
        errorMessage.style.display = 'none';
    }

    function showError() {
        loadingElement.style.display = 'none';
        errorMessage.style.display = 'flex';
    }
});
