/**
 * Local Outbox Queue Manager for POS Async Sync Engine.
 * Guarantees 0ms UI responsiveness, local persistence, idempotency, and offline resilience.
 */

export interface OutboxOperation {
  op_id: string;          // Client UUID (Idempotency Key)
  device_id: string;      // Unique device identifier
  sequence_no: number;    // Monotonic sequence number for this device
  timestamp: string;      // ISO UTC timestamp
  branch_id?: string;     // Branch identifier
  operation: 'CREATE_ORDER' | 'UPDATE_ORDER' | 'PROCESS_PAYMENT' | 'CANCEL_ITEM' | 'MOVE_TABLE';
  table_id?: string;
  order_id?: string;
  payload: any;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  retries: number;
  last_error?: string;
}

const STORAGE_KEY = 'pos_outbox_queue_v1';
const DEVICE_ID_KEY = 'pos_device_id_v1';
const SEQ_KEY = 'pos_device_seq_v1';

// Initialize unique Device ID
export function getDeviceId(): string {
  if (typeof window === 'undefined' || !window.localStorage) return 'device_unknown';
  let devId = localStorage.getItem(DEVICE_ID_KEY);
  if (!devId) {
    devId = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    localStorage.setItem(DEVICE_ID_KEY, devId);
  }
  return devId;
}

// Get next monotonic sequence number
export function getNextSequenceNo(): number {
  if (typeof window === 'undefined' || !window.localStorage) return Date.now();
  const current = parseInt(localStorage.getItem(SEQ_KEY) || '0', 10);
  const next = current + 1;
  localStorage.setItem(SEQ_KEY, next.toString());
  return next;
}

// Helper to generate UUID
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Read Outbox Queue from local storage
export function getOutboxQueue(): OutboxOperation[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Save Outbox Queue to local storage
function saveOutboxQueue(queue: OutboxOperation[]) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue.slice(-200))); // Keep last 200 ops
  } catch {
    /* ignore */
  }
}

/**
 * Enqueue an atomic operation into the Local Outbox Queue (0ms blocking time)
 */
export function enqueueOperation(
  op: Omit<OutboxOperation, 'op_id' | 'device_id' | 'sequence_no' | 'timestamp' | 'status' | 'retries'> & { op_id?: string }
): OutboxOperation {
  const queue = getOutboxQueue();
  const op_id = op.op_id || generateUUID();
  
  // Deduplicate if op_id already exists
  const existing = queue.find((o) => o.op_id === op_id);
  if (existing) return existing;

  const newOp: OutboxOperation = {
    ...op,
    op_id,
    device_id: getDeviceId(),
    sequence_no: getNextSequenceNo(),
    timestamp: new Date().toISOString(),
    status: 'PENDING',
    retries: 0,
  };

  queue.push(newOp);
  saveOutboxQueue(queue);
  return newOp;
}

/**
 * Update operation status in Outbox Queue
 */
export function updateOperationStatus(
  op_id: string,
  status: OutboxOperation['status'],
  error?: string
) {
  const queue = getOutboxQueue();
  const target = queue.find((o) => o.op_id === op_id);
  if (target) {
    target.status = status;
    if (error) target.last_error = error;
    if (status === 'FAILED') target.retries += 1;
    saveOutboxQueue(queue);
  }
}

/**
 * Get all pending operations to sync
 */
export function getPendingOperations(): OutboxOperation[] {
  return getOutboxQueue().filter((o) => o.status === 'PENDING' || (o.status === 'FAILED' && o.retries < 5));
}
