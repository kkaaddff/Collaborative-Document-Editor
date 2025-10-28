/**
 * 操作变换算法（Operational Transformation）
 * 用于处理并发编辑时的冲突
 */

/**
 * 变换两个操作
 * @param {Object} op1 - 第一个操作
 * @param {Object} op2 - 第二个操作
 * @returns {Object} - 变换后的操作
 */
export function transform(op1, op2) {
  // 如果操作时间戳相同，使用用户 ID 作为优先级
  const priority = op1.timestamp === op2.timestamp 
    ? op1.userId.localeCompare(op2.userId)
    : op1.timestamp - op2.timestamp;

  // 两个插入操作
  if (op1.type === 'insert' && op2.type === 'insert') {
    return transformInsertInsert(op1, op2, priority);
  }
  
  // 两个删除操作
  if (op1.type === 'delete' && op2.type === 'delete') {
    return transformDeleteDelete(op1, op2);
  }
  
  // 插入和删除操作
  if (op1.type === 'insert' && op2.type === 'delete') {
    return transformInsertDelete(op1, op2);
  }
  
  // 删除和插入操作
  if (op1.type === 'delete' && op2.type === 'insert') {
    return transformDeleteInsert(op1, op2);
  }

  return op1;
}

/**
 * 变换两个插入操作
 */
function transformInsertInsert(op1, op2, priority) {
  if (op2.position <= op1.position) {
    // op2 在 op1 之前或同位置插入
    if (op2.position === op1.position && priority < 0) {
      // 相同位置，op1 优先级更高，不调整
      return op1;
    }
    // 调整 op1 的位置
    return {
      ...op1,
      position: op1.position + (op2.content?.length || 0)
    };
  }
  // op2 在 op1 之后，不需要调整
  return op1;
}

/**
 * 变换两个删除操作
 */
function transformDeleteDelete(op1, op2) {
  const op1End = op1.position + (op1.length || 0);
  const op2End = op2.position + (op2.length || 0);

  // op2 完全在 op1 之前
  if (op2End <= op1.position) {
    return {
      ...op1,
      position: Math.max(0, op1.position - (op2.length || 0))
    };
  }

  // op2 完全在 op1 之后
  if (op2.position >= op1End) {
    return op1;
  }

  // 有重叠部分
  // 简化处理：调整 op1 的位置和长度
  const newPosition = Math.max(0, op1.position - Math.max(0, op2.position - op1.position));
  const overlap = Math.min(op1End, op2End) - Math.max(op1.position, op2.position);
  const newLength = Math.max(0, (op1.length || 0) - overlap);

  if (newLength === 0) {
    // 操作已经被完全覆盖，返回空操作
    return null;
  }

  return {
    ...op1,
    position: newPosition,
    length: newLength
  };
}

/**
 * 变换插入和删除操作
 */
function transformInsertDelete(op1, op2) {
  const op2End = op2.position + (op2.length || 0);

  // 删除操作在插入之前
  if (op2End <= op1.position) {
    return {
      ...op1,
      position: Math.max(0, op1.position - (op2.length || 0))
    };
  }

  // 删除操作在插入之后
  if (op2.position >= op1.position) {
    return op1;
  }

  // 删除操作包含插入位置
  return {
    ...op1,
    position: op2.position
  };
}

/**
 * 变换删除和插入操作
 */
function transformDeleteInsert(op1, op2) {
  // 插入在删除之前
  if (op2.position <= op1.position) {
    return {
      ...op1,
      position: op1.position + (op2.content?.length || 0)
    };
  }

  const op1End = op1.position + (op1.length || 0);

  // 插入在删除范围内
  if (op2.position < op1End) {
    return {
      ...op1,
      length: (op1.length || 0) + (op2.content?.length || 0)
    };
  }

  // 插入在删除之后
  return op1;
}

/**
 * 应用操作到内容
 * @param {string} content - 当前内容
 * @param {Object} operation - 要应用的操作
 * @returns {string} - 应用操作后的内容
 */
export function applyOperation(content, operation) {
  if (!operation) return content;

  if (operation.type === 'insert') {
    const before = content.substring(0, operation.position);
    const after = content.substring(operation.position);
    return before + (operation.content || '') + after;
  }

  if (operation.type === 'delete') {
    const before = content.substring(0, operation.position);
    const after = content.substring(operation.position + (operation.length || 0));
    return before + after;
  }

  return content;
}

/**
 * 批量变换操作
 * @param {Object} operation - 要变换的操作
 * @param {Array} operations - 已有的操作列表
 * @returns {Object} - 变换后的操作
 */
export function transformAgainstAll(operation, operations) {
  let transformed = operation;
  
  for (const op of operations) {
    if (op.userId !== operation.userId) {
      transformed = transform(transformed, op);
      if (!transformed) {
        return null;
      }
    }
  }
  
  return transformed;
}

