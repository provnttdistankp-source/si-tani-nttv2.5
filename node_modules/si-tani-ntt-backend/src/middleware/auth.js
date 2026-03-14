import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "sitani-ntt-secret";

export function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    SECRET,
    { expiresIn: "8h" }
  );
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return res.status(401).json({ message: "Token tidak ditemukan." });
  }

  try {
    req.user = jwt.verify(token, SECRET);
    return next();
  } catch {
    return res.status(401).json({ message: "Token tidak valid atau sudah kedaluwarsa." });
  }
}

export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Akses ditolak." });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Anda tidak memiliki hak akses untuk aksi ini." });
    }

    return next();
  };
}
