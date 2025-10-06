const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(cors());
app.use(express.static("public"));

// === DATABASE CONFIGURATION ===
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://orbitalcomms_db_user:4tS7tXkv1KCs9Cz5UjBc9QKmGdHG1WOq@dpg-d3gkqendiees73d7m8m0-a.oregon-postgres.render.com/orbitalcomms_db",
  ssl: { rejectUnauthorized: false },
});

// === USER TABLE ===
app.get("/init-db", async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'User',
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    res.send("✅ Table 'users' ready");
  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
});

// === SURVEY TABLE ===
app.get("/init-survey-db", async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS surveys (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        city VARCHAR(100),
        age INT,
        gender VARCHAR(50),
        type_of_impact TEXT,
        damage_to_housing TEXT,
        loss_of_crops TEXT,
        loss_of_property TEXT,
        health_affected TEXT,
        experience TEXT,
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    res.send("✅ Table 'surveys' ready");
  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
});

// === API ROUTES ===
// Users
app.get("/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const exists = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    if (exists.rows.length > 0) return res.status(400).json({ message: "User exists" });
    await pool.query("INSERT INTO users (name, email, password) VALUES ($1,$2,$3)", [name,email,password]);
    res.json({ message: `User ${name} registered` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    const user = result.rows[0];
    if (!user) return res.status(400).json({ message: "User not found" });
    if (user.password !== password) return res.status(400).json({ message: "Incorrect password" });
    res.json({ message: `Welcome back, ${user.name}!` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Survey
app.post("/survey", async (req, res) => {
  const { name, email, city, age, gender, type_of_impact, damage_to_housing, loss_of_crops, loss_of_property, health_affected, experience } = req.body;
  try {
    await pool.query(
      `INSERT INTO surveys (name,email,city,age,gender,type_of_impact,damage_to_housing,loss_of_crops,loss_of_property,health_affected,experience)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [name,email,city,age,gender,type_of_impact,damage_to_housing,loss_of_crops,loss_of_property,health_affected,experience]
    );
    res.json({ message: "Survey submitted " });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/survey/:email", async (req, res) => {
  const { email } = req.params;
  try {
    const result = await pool.query("SELECT name,email FROM users WHERE email=$1", [email]);
    if (result.rows.length === 0) return res.status(404).json({ message: "User not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Serve HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
