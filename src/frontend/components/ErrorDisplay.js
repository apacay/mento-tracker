class ErrorDisplay {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'error-display';
        this.container.style.display = 'none';
        
        // Contenedor principal del error
        this.errorBox = document.createElement('div');
        this.errorBox.className = 'error-box';
        
        // Mensaje de error
        this.messageElement = document.createElement('div');
        this.messageElement.className = 'error-message';
        
        // Botón para mostrar/ocultar detalles
        this.toggleButton = document.createElement('button');
        this.toggleButton.className = 'error-toggle';
        this.toggleButton.textContent = 'Mostrar detalles técnicos';
        this.toggleButton.onclick = () => this.toggleDetails();
        
        // Contenedor de detalles técnicos
        this.detailsContainer = document.createElement('div');
        this.detailsContainer.className = 'error-details';
        this.detailsContainer.style.display = 'none';
        
        // Botón para copiar detalles
        this.copyButton = document.createElement('button');
        this.copyButton.className = 'copy-button';
        this.copyButton.textContent = 'Copiar detalles';
        this.copyButton.onclick = () => this.copyDetails();
        
        // Pre para mostrar detalles técnicos
        this.detailsPre = document.createElement('pre');
        
        // Botón para cerrar el error
        this.closeButton = document.createElement('button');
        this.closeButton.className = 'close-button';
        this.closeButton.innerHTML = '&times;';
        this.closeButton.onclick = () => this.hide();
        
        // Ensamblar el componente
        this.detailsContainer.appendChild(this.copyButton);
        this.detailsContainer.appendChild(this.detailsPre);
        this.errorBox.appendChild(this.closeButton);
        this.errorBox.appendChild(this.messageElement);
        this.errorBox.appendChild(this.toggleButton);
        this.errorBox.appendChild(this.detailsContainer);
        this.container.appendChild(this.errorBox);
        
        // Agregar estilos
        this.addStyles();
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .error-display {
                position: fixed;
                bottom: 20px;
                right: 20px;
                max-width: 400px;
                z-index: 1000;
            }
            
            .error-box {
                background: #fff1f0;
                border: 1px solid #ffa39e;
                padding: 12px;
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            }
            
            .error-message {
                color: #cf1322;
                margin-bottom: 8px;
            }
            
            .error-toggle {
                background: none;
                border: none;
                color: #1890ff;
                cursor: pointer;
                padding: 0;
                font-size: 14px;
                margin-bottom: 8px;
            }
            
            .error-details {
                background: #f5f5f5;
                padding: 8px;
                border-radius: 4px;
                margin-top: 8px;
            }
            
            .copy-button {
                background: #1890ff;
                color: white;
                border: none;
                padding: 4px 12px;
                border-radius: 4px;
                cursor: pointer;
                margin-bottom: 8px;
            }
            
            .copy-button:hover {
                background: #096dd9;
            }
            
            pre {
                white-space: pre-wrap;
                word-wrap: break-word;
                margin: 0;
                font-size: 12px;
            }
        `;
        document.head.appendChild(style);
    }
    
    show(message, details = null) {
        this.messageElement.textContent = message;
        
        if (details) {
            this.detailsPre.textContent = JSON.stringify(details, null, 2);
            this.toggleButton.style.display = 'block';
            this.detailsContainer.style.display = 'none';
        } else {
            this.toggleButton.style.display = 'none';
            this.detailsContainer.style.display = 'none';
        }
        
        this.container.style.display = 'block';
        
        // Auto-ocultar después de 10 segundos si no hay interacción
        if (this._hideTimeout) {
            clearTimeout(this._hideTimeout);
        }
        this._hideTimeout = setTimeout(() => {
            if (!this.detailsContainer.style.display || this.detailsContainer.style.display === 'none') {
                this.hide();
            }
        }, 10000);
    }
    
    hide() {
        this.container.style.display = 'none';
        if (this._hideTimeout) {
            clearTimeout(this._hideTimeout);
        }
    }
    
    toggleDetails() {
        const isVisible = this.detailsContainer.style.display === 'block';
        this.detailsContainer.style.display = isVisible ? 'none' : 'block';
        this.toggleButton.textContent = isVisible ? 'Mostrar detalles técnicos' : 'Ocultar detalles técnicos';
        
        // Si se muestran los detalles, cancelar el auto-ocultado
        if (!isVisible && this._hideTimeout) {
            clearTimeout(this._hideTimeout);
        }
    }
    
    async copyDetails() {
        try {
            await navigator.clipboard.writeText(this.detailsPre.textContent);
            this.copyButton.textContent = '¡Copiado!';
            setTimeout(() => {
                this.copyButton.textContent = 'Copiar detalles';
            }, 2000);
        } catch (err) {
            console.error('Error al copiar:', err);
            this.copyButton.textContent = 'Error al copiar';
            setTimeout(() => {
                this.copyButton.textContent = 'Copiar detalles';
            }, 2000);
        }
    }
}

// Exportar la clase
window.ErrorDisplay = ErrorDisplay; 