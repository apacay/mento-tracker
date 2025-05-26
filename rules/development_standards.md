# Estándares de Desarrollo

## Estructura del Proyecto

### Organización de Código
- Ningún archivo debe exceder 500 líneas de código
- Dividir en módulos cuando la funcionalidad sea separable
- Organizar código por característica/responsabilidad
- Mantener una estructura de directorios clara y lógica

### Convenciones de Nombrado
- Usar nombres descriptivos y significativos
- Seguir PEP8 para convenciones de nombrado
- Mantener consistencia en todo el proyecto
- Usar prefijos/sufijos apropiados según el tipo de elemento

## Calidad de Código

### Estilo y Formato
- Seguir PEP8 estrictamente
- Usar type hints para todas las funciones y métodos
- Formatear código con black
- Mantener un máximo de 88 caracteres por línea

### Herramientas de Desarrollo
- Usar pydantic para validación de datos
- Implementar FastAPI para endpoints REST
- Utilizar herramientas de linting (flake8, pylint)
- Implementar mypy para verificación de tipos

## Pruebas

### Estructura
- Ubicar pruebas en el directorio `/tests`
- Reflejar la estructura de la aplicación en las pruebas
- Separar pruebas por tipo (unitarias, integración, e2e)
- Mantener archivos de prueba manejables

### Cobertura
- Mantener cobertura de código >80%
- Escribir pruebas para cada nueva característica
- Incluir casos de éxito, fallo y límite
- Documentar decisiones de no probar cierto código

## Documentación

### Código
- Usar estilo Google para docstrings
- Documentar todos los módulos, clases y funciones
- Incluir ejemplos en funciones complejas
- Agregar comentarios para lógica compleja

### Proyecto
- Mantener README.md actualizado
- Documentar cambios significativos
- Actualizar TASK.md antes de nuevas tareas
- Registrar decisiones de diseño importantes

## Proceso de Desarrollo

### Control de Calidad
- Revisar código antes de commits
- Ejecutar suite de pruebas completa
- Verificar formato y estilo
- Validar documentación actualizada

### Mejores Prácticas
- Commits pequeños y frecuentes
- Mensajes de commit descriptivos
- Mantener ramas actualizadas
- Resolver conflictos de manera inmediata 