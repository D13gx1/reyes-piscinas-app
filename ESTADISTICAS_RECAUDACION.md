# Sistema de Estadísticas de Recaudación

## Descripción General

El sistema de estadísticas permite visualizar la recaudación y el historial de mantenciones realizadas en diferentes períodos de tiempo (día, mes, año). También incluye estadísticas químicas sobre el uso de cloro y pH.

## Funcionalidades Principales

### 1. Selector de Período
- **Día**: Muestra estadísticas de una fecha específica
- **Mes**: Muestra estadísticas de un mes y año específicos
- **Año**: Muestra estadísticas de un año completo

### 2. Estadísticas de Recaudación
- **Total Recaudado**: Suma de todos los precios de las mantenciones en el período
- **Cantidad de Mantenciones**: Número total de mantenciones realizadas
- **Promedio por Mantención**: Promedio del precio por mantención

### 3. Estadísticas Químicas
- **Promedio de Cloro**: Promedio de cloro usado por mantención
- **Promedio de pH**: Promedio de pH medido por mantención
- **Total Cloro Usado**: Suma total de cloro utilizado
- **Total pH Medido**: Suma total de pH medido

### 4. Historial de Mantenciones
Lista detallada de todas las mantenciones realizadas en el período seleccionado, incluyendo:
- Nombre del cliente
- Fecha y hora de la mantención
- Precio cobrado
- Cantidad de cloro usado
- Nivel de pH medido
- Tipo de servicio realizado

## Estructura de Datos

### Interfaz Cliente (actualizada)
```typescript
export interface Cliente {
  // ... otros campos
  precio: number; // Precio por mantención
  historial: {
    fecha: string;
    servicio: string;
    cloro: number;
    ph: number;
    estadoCloro?: string;
    estadoPh?: string;
    hora?: string;
  }[];
}
```

### Interfaz Mantención
```typescript
export interface Mantencion {
  id: string;
  clienteId: string;
  clienteNombre: string;
  fecha: string;
  precio: number;
  cloro: number;
  ph: number;
  servicio: string;
  hora?: string;
}
```

### Interfaz Estadísticas
```typescript
export interface EstadisticasRecaudacion {
  total: number;
  cantidadMantenciones: number;
  promedioPorMantencion: number;
  periodo: string;
  fechaInicio: string;
  fechaFin: string;
}
```

## Servicios Implementados

### EstadisticasService
- `getEstadisticasDia(fecha: string)`: Obtiene estadísticas de un día específico
- `getEstadisticasMes(anio: number, mes: number)`: Obtiene estadísticas de un mes
- `getEstadisticasAnio(anio: number)`: Obtiene estadísticas de un año
- `getMantencionesDetalladas(fechaInicio: string, fechaFin: string)`: Obtiene lista detallada de mantenciones
- `getEstadisticasQuimicas(fechaInicio: string, fechaFin: string)`: Obtiene estadísticas químicas

## Cálculo de Recaudación

El sistema calcula la recaudación basándose en:
1. **Precio del Cliente**: Cada cliente tiene un precio fijo por mantención
2. **Historial de Mantenciones**: Se cuenta cada entrada en el historial como una mantención realizada
3. **Filtrado por Fecha**: Solo se consideran las mantenciones dentro del período seleccionado

### Fórmula de Cálculo
```
Total Recaudado = Σ (Precio del Cliente × Cantidad de Mantenciones del Cliente)
Promedio por Mantención = Total Recaudado ÷ Total de Mantenciones
```

## Características de la Interfaz

### Diseño Responsivo
- Adaptable a diferentes tamaños de pantalla
- Layout optimizado para móviles
- Tarjetas con información organizada

### Elementos Visuales
- Iconos descriptivos para cada sección
- Colores diferenciados para diferentes tipos de información
- Badges para mostrar cantidades
- Chips para mostrar precios

### Funcionalidades de Usuario
- Botón de refrescar para actualizar datos
- Selectores intuitivos para fechas
- Loading states durante la carga
- Mensajes informativos cuando no hay datos

## Uso del Sistema

### Para Ver Estadísticas Diarias
1. Seleccionar "Día" en el segment
2. Elegir la fecha deseada
3. Los datos se cargan automáticamente

### Para Ver Estadísticas Mensuales
1. Seleccionar "Mes" en el segment
2. Elegir el mes y año
3. Los datos se cargan automáticamente

### Para Ver Estadísticas Anuales
1. Seleccionar "Año" en el segment
2. Elegir el año
3. Los datos se cargan automáticamente

## Consideraciones Técnicas

### Rendimiento
- Los datos se cargan de forma asíncrona
- Se implementa manejo de errores
- Loading states para mejor UX

### Compatibilidad
- Funciona con la estructura actual de Firebase
- Compatible con la interfaz de Cliente existente
- No requiere cambios en la base de datos

### Escalabilidad
- El sistema puede manejar grandes volúmenes de datos
- Los cálculos se realizan en el cliente para mejor rendimiento
- Estructura preparada para futuras expansiones

## Próximas Mejoras Posibles

1. **Gráficos**: Agregar visualizaciones gráficas de las estadísticas
2. **Exportación**: Permitir exportar datos a PDF o Excel
3. **Filtros Avanzados**: Filtrar por cliente específico o tipo de servicio
4. **Comparativas**: Comparar períodos entre sí
5. **Notificaciones**: Alertas cuando se alcancen ciertos objetivos de recaudación 