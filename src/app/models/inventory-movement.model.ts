
export type InventoryMovementType =
  | 'dispatch'
  | 'return';

/**
 * Movimiento físico de inventario.
 */
export interface InventoryMovement {
  id: number;
  tenant_id: number;
  inventory_item_id: number;
  reservation_id: number;
  movement_type: InventoryMovementType;
  quantity: number;
  notes: string | null;
  created_by: number | null;
  created_at: string;
}

/**
 * Resumen de movimientos de una reservación.
 *
 * Los campos opcionales permiten mantener compatibilidad
 * con componentes que inicializan únicamente las
 * cantidades básicas.
 */
export interface InventoryMovementSummary {
  quantity_dispatched: number;
  quantity_returned: number;
  quantity_outstanding: number;

  is_fully_reconciled?: boolean;
  quantity_administrative_outstanding?: number;
  quantity_lost?: number;
  quantity_physical_outstanding?: number;
  quantity_reconciled?: number;
}

/**
 * Respuesta al consultar el historial de movimientos.
 *
 * GET /api/v1/inventory/movements
 */
export interface InventoryMovementsResponse {
  items: InventoryMovement[];
  summary: InventoryMovementSummary;
}

/**
 * Solicitud para registrar una entrega o devolución.
 */
export interface InventoryMovementRequest {
  reservation_id: number;
  quantity: number;
  notes?: string;
}

/**
 * Respuesta al registrar un movimiento.
 */
export interface InventoryMovementResult {
  movement: InventoryMovement;
  summary: InventoryMovementSummary;
}
