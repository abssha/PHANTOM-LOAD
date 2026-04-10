function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function validateChat(req, res, next) {
  const { message } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required and must be a non-empty string' });
  }

  next();
}

export function validateRegister(req, res, next) {
  const { name, email, password } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required and must be a non-empty string' });
  }

  if (!email || typeof email !== 'string' || !isValidEmail(email)) {
    return res.status(400).json({ error: 'email is required and must be valid' });
  }

  if (!password || typeof password !== 'string' || password.length < 6 || !password.trim()) {
    return res.status(400).json({ error: 'password must be at least 6 characters long' });
  }

  next();
}

export function validateLogin(req, res, next) {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !isValidEmail(email)) {
    return res.status(400).json({ error: 'email is required and must be valid' });
  }

  if (!password || typeof password !== 'string' || !password.trim()) {
    return res.status(400).json({ error: 'password is required and must be a non-empty string' });
  }

  next();
}

export function validateAuditCreate(req, res, next) {
  const {
    _id,
    label,
    createdAt,
    ratePerUnit,
    totalMonthlyKwh,
    totalMonthlyCost,
    totalCO2,
    topVampires,
    roomSummary
  } = req.body;

  if (!_id || typeof _id !== 'string' || !_id.trim()) {
    return res.status(400).json({ error: '_id is required and must be a non-empty string' });
  }

  if (!label || typeof label !== 'string' || !label.trim()) {
    return res.status(400).json({ error: 'label is required and must be a non-empty string' });
  }

  if (!createdAt || Number.isNaN(Date.parse(createdAt))) {
    return res.status(400).json({ error: 'createdAt is required and must be a valid ISO date string' });
  }

  if (!isFiniteNumber(ratePerUnit)) {
    return res.status(400).json({ error: 'ratePerUnit is required and must be a number' });
  }

  if (!isFiniteNumber(totalMonthlyKwh)) {
    return res.status(400).json({ error: 'totalMonthlyKwh is required and must be a number' });
  }

  if (!isFiniteNumber(totalMonthlyCost)) {
    return res.status(400).json({ error: 'totalMonthlyCost is required and must be a number' });
  }

  if (!isFiniteNumber(totalCO2)) {
    return res.status(400).json({ error: 'totalCO2 is required and must be a number' });
  }

  if (!Array.isArray(topVampires)) {
    return res.status(400).json({ error: 'topVampires is required and must be an array' });
  }

  for (const vampire of topVampires) {
    if (!vampire || typeof vampire !== 'object') {
      return res.status(400).json({ error: 'Each topVampires entry must be an object' });
    }

    if (!vampire.name || typeof vampire.name !== 'string' || !vampire.name.trim()) {
      return res.status(400).json({ error: 'Each topVampires entry must include a non-empty name' });
    }

    if (!vampire.roomName || typeof vampire.roomName !== 'string' || !vampire.roomName.trim()) {
      return res.status(400).json({ error: 'Each topVampires entry must include a non-empty roomName' });
    }

    if (!isFiniteNumber(vampire.score)) {
      return res.status(400).json({ error: 'Each topVampires entry must include a numeric score' });
    }
  }

  if (!Array.isArray(roomSummary)) {
    return res.status(400).json({ error: 'roomSummary is required and must be an array' });
  }

  for (const room of roomSummary) {
    if (!room || typeof room !== 'object') {
      return res.status(400).json({ error: 'Each roomSummary entry must be an object' });
    }

    if (!room.name || typeof room.name !== 'string' || !room.name.trim()) {
      return res.status(400).json({ error: 'Each roomSummary entry must include a non-empty name' });
    }

    if (!isFiniteNumber(room.applianceCount)) {
      return res.status(400).json({ error: 'Each roomSummary entry must include a numeric applianceCount' });
    }

    if (!isFiniteNumber(room.monthlyKwh)) {
      return res.status(400).json({ error: 'Each roomSummary entry must include a numeric monthlyKwh' });
    }

    if (!isFiniteNumber(room.monthlyCost)) {
      return res.status(400).json({ error: 'Each roomSummary entry must include a numeric monthlyCost' });
    }
  }

  next();
}
