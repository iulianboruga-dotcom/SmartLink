const jwt = require('jsonwebtoken');

// Verifică token-ul JWT din header Authorization: Bearer <token>
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token lipsă sau invalid' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, role, email }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token expirat sau invalid' });
  }
}

// Verifică că utilizatorul are rolul cerut
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Neautentificat' });
    if (req.user.role !== role) {
      return res.status(403).json({ error: `Acces interzis. Necesar rol: ${role}` });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
