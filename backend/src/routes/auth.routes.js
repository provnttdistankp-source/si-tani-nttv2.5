import express from "express";
import bcrypt from "bcryptjs";
import { readDb, writeDb, generateId } from "../utils/db.js";
import { signToken, authRequired } from "../middleware/auth.js";
import { pushAuditLog } from "../utils/audit.js";

const router = express.Router();

function clientMeta(req) {
  return {
    ip: req.headers["x-forwarded-for"]?.split(",")?.[0]?.trim() || req.socket?.remoteAddress || req.ip || null,
    userAgent: req.headers["user-agent"] || null
  };
}

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const db = await readDb();
    const user = db.users.find((item) => item.email.toLowerCase() === String(email || "").toLowerCase());
    const meta = clientMeta(req);

    if (!user) {
      pushAuditLog(db, {
        action: "login",
        status: "failed",
        resource: "auth",
        entityName: String(email || "Tanpa email"),
        description: "Percobaan login gagal karena email tidak ditemukan.",
        actorEmail: String(email || "").toLowerCase() || null,
        ip: meta.ip,
        userAgent: meta.userAgent
      });
      await writeDb(db);
      return res.status(401).json({ message: "Email atau kata sandi salah." });
    }

    const isValid = await bcrypt.compare(String(password || ""), user.password);

    if (!isValid) {
      pushAuditLog(db, {
        action: "login",
        status: "failed",
        resource: "auth",
        entityId: user.id,
        entityName: user.email,
        description: "Percobaan login gagal karena kata sandi salah.",
        actorId: user.id,
        actorName: user.name,
        actorEmail: user.email,
        actorRole: user.role,
        ip: meta.ip,
        userAgent: meta.userAgent
      });
      await writeDb(db);
      return res.status(401).json({ message: "Email atau kata sandi salah." });
    }

    user.lastLoginAt = new Date().toISOString();
    user.lastLoginIp = meta.ip;
    user.lastActivityAt = user.lastLoginAt;

    pushAuditLog(db, {
      action: "login",
      status: "success",
      resource: "auth",
      entityId: user.id,
      entityName: user.email,
      description: "Pengguna berhasil masuk ke sistem.",
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      actorRole: user.role,
      ip: meta.ip,
      userAgent: meta.userAgent
    });

    await writeDb(db);
    const token = signToken(user);
    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        regionCode: user.regionCode,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, role = "user" } = req.body || {};
    const db = await readDb();

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Nama, email, dan kata sandi wajib diisi." });
    }

    const exists = db.users.some((item) => item.email.toLowerCase() === String(email).toLowerCase());
    if (exists) {
      return res.status(409).json({ message: "Email sudah terdaftar." });
    }

    const hashed = await bcrypt.hash(String(password), 10);
    const user = {
      id: generateId("user", db.users),
      name,
      email,
      password: hashed,
      role,
      phone: "",
      status: "active",
      avatar: name[0]?.toUpperCase() || "U",
      regionCode: db.regencies[0]?.code,
      lastLoginAt: null,
      lastLoginIp: null,
      lastActivityAt: null
    };

    db.users.push(user);
    pushAuditLog(db, {
      action: "register",
      status: "success",
      resource: "users",
      entityId: user.id,
      entityName: user.email,
      description: "Akun baru berhasil dibuat.",
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      actorRole: user.role,
      ...clientMeta(req)
    });
    await writeDb(db);

    return res.status(201).json({
      message: "Registrasi berhasil.",
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    next(error);
  }
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body || {};
  return res.json({
    message: `Instruksi reset kata sandi telah disimulasikan untuk ${email || "akun Anda"}.`
  });
});

router.get("/me", authRequired, async (req, res, next) => {
  try {
    const db = await readDb();
    const user = db.users.find((item) => item.id === req.user.id);

    if (!user) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan." });
    }

    user.lastActivityAt = new Date().toISOString();
    await writeDb(db);

    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      regionCode: user.regionCode,
      avatar: user.avatar,
      lastLoginAt: user.lastLoginAt,
      lastActivityAt: user.lastActivityAt
    });
  } catch (error) {
    next(error);
  }
});

export default router;
