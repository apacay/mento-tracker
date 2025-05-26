const fs = require('fs');
const path = require('path');

// Configuración de logs
const LOG_DIR = path.join(__dirname, '..', '..', '..', 'logs');
const ERROR_LOG_PATH = path.join(LOG_DIR, 'error.log');
const SQL_LOG_PATH = path.join(LOG_DIR, 'sql.log');
const VALIDATION_LOG_PATH = path.join(LOG_DIR, 'validation.log');
const ACCESS_LOG_PATH = path.join(LOG_DIR, 'access.log');

// Asegurar que el directorio de logs existe
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Tipos de errores
const ErrorTypes = {
    SQL: 'SQL_ERROR',
    VALIDATION: 'VALIDATION_ERROR',
    ROUTE: 'ROUTE_ERROR',
    GENERAL: 'GENERAL_ERROR',
    SECURITY: 'SECURITY_ERROR'
};

/**
 * Registra un error en el archivo de log correspondiente y consola
 * @param {string} context - Contexto donde ocurrió el error
 * @param {Error|string} error - Error o mensaje de error
 * @param {Object} details - Detalles adicionales del error
 * @param {string} type - Tipo de error (SQL_ERROR, VALIDATION_ERROR, etc)
 * @returns {Object} Detalles del error registrado
 */
function logError(context, error, details = {}, type = ErrorTypes.GENERAL) {
    const timestamp = new Date().toISOString();
    const errorLog = {
        timestamp,
        type,
        context,
        message: error.message || error,
        stack: error.stack,
        details
    };

    // Determinar el archivo de log según el tipo de error
    let logPath;
    switch (type) {
        case ErrorTypes.SQL:
            logPath = SQL_LOG_PATH;
            break;
        case ErrorTypes.VALIDATION:
            logPath = VALIDATION_LOG_PATH;
            break;
        default:
            logPath = ERROR_LOG_PATH;
    }

    // Formatear el log para archivo
    const logEntry = `${timestamp} [${type}] ${context}: ${JSON.stringify(errorLog, null, 2)}\n`;

    // Log a consola con colores según el tipo
    const consoleLog = {
        [ErrorTypes.SQL]: '\x1b[31m', // Rojo
        [ErrorTypes.VALIDATION]: '\x1b[33m', // Amarillo
        [ErrorTypes.ROUTE]: '\x1b[35m', // Magenta
        [ErrorTypes.SECURITY]: '\x1b[41m', // Fondo rojo
        [ErrorTypes.GENERAL]: '\x1b[36m' // Cyan
    };

    console.error(
        `${consoleLog[type] || ''}[${type}] ${context}:\x1b[0m`,
        JSON.stringify(errorLog, null, 2)
    );

    // Log a archivo
    fs.appendFile(logPath, logEntry, (err) => {
        if (err) console.error('Error escribiendo al archivo de log:', err);
    });

    return errorLog;
}

/**
 * Registra un error de SQL con detalles específicos
 * @param {string} context - Contexto de la operación SQL
 * @param {Error} error - Error de SQL
 * @param {Object} details - Detalles de la consulta
 */
function logSQLError(context, error, details = {}) {
    return logError(context, error, {
        query: details.query,
        params: details.params,
        table: details.table,
        operation: details.operation,
        ...details
    }, ErrorTypes.SQL);
}

/**
 * Registra un error de validación
 * @param {string} context - Contexto de la validación
 * @param {Object} validationErrors - Errores de validación
 * @param {Object} requestData - Datos de la petición
 */
function logValidationError(context, validationErrors, requestData = {}) {
    return logError(context, 'Error de validación', {
        validationErrors,
        requestData
    }, ErrorTypes.VALIDATION);
}

/**
 * Registra un error de ruta no encontrada
 * @param {Object} req - Objeto de petición Express
 */
function logRouteError(req) {
    return logError('Ruta no encontrada', `Ruta ${req.method} ${req.url} no encontrada`, {
        method: req.method,
        url: req.url,
        params: req.params,
        query: req.query,
        headers: req.headers
    }, ErrorTypes.ROUTE);
}

/**
 * Registra un acceso a la API
 * @param {Object} req - Objeto de petición Express
 * @param {number} status - Código de estado HTTP
 * @param {string} message - Mensaje descriptivo
 */
function logAccess(req, status, message) {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} [${status}] ${req.method} ${req.url} - ${message}\n`;

    fs.appendFile(ACCESS_LOG_PATH, logEntry, (err) => {
        if (err) console.error('Error escribiendo al archivo de log de acceso:', err);
    });
}

/**
 * Captura y formatea errores para enviar al frontend
 * @param {Error} error - Error original
 * @param {Object} context - Información adicional del contexto
 * @returns {Object} Error formateado
 */
function captureError(error, context = {}) {
    return {
        timestamp: new Date().toISOString(),
        message: error.message || 'Error desconocido',
        stack: error.stack,
        type: error.name || 'Error',
        context: {
            ...context,
            url: context.req?.url,
            method: context.req?.method,
            query: context.req?.query,
            body: context.req?.body,
        },
        details: error.details || {}
    };
}

/**
 * Middleware para manejo de errores
 */
function errorMiddleware(err, req, res, next) {
    const errorInfo = captureError(err, { req });
    
    // Log del error para debugging
    console.error(JSON.stringify(errorInfo, null, 2));
    
    // Enviar al frontend
    res.status(err.status || 500).json({
        error: true,
        message: err.message || 'Error interno del servidor',
        debugInfo: errorInfo // Para mostrar en la sección de desarrollador
    });
}

module.exports = {
    ErrorTypes,
    logError,
    logSQLError,
    logValidationError,
    logRouteError,
    logAccess,
    captureError,
    errorMiddleware
}; 