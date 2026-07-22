// ============================================================
// SERVER.JS — Backend complet avec création automatique des tables
// ============================================================

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// Configuration de la base de données PostgreSQL
// ============================================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ============================================================
// Création automatique des tables (AJOUTÉ)
// ============================================================
async function initDatabase() {
    try {
        console.log('📦 Création des tables si elles n\'existent pas...');
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                first_name TEXT NOT NULL,
                farm_name TEXT NOT NULL,
                address TEXT,
                password_hash TEXT NOT NULL,
                species TEXT DEFAULT 'poule',
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS lots (
                id TEXT PRIMARY KEY,
                user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
                lot_number TEXT,
                incubator TEXT,
                species TEXT,
                breed TEXT,
                origin TEXT,
                breeder_lay_date DATE,
                target_rate DECIMAL(5,2),
                notes TEXT,
                collection_date DATE,
                collection_quantity INTEGER DEFAULT 0,
                collection_cracked INTEGER DEFAULT 0,
                collection_validated BOOLEAN DEFAULT FALSE,
                incubation_date DATE,
                incubation_validated BOOLEAN DEFAULT FALSE,
                candling7_date DATE,
                candling7_clear INTEGER DEFAULT 0,
                candling7_mortality INTEGER DEFAULT 0,
                candling7_validated BOOLEAN DEFAULT FALSE,
                candling14_date DATE,
                candling14_contaminated INTEGER DEFAULT 0,
                candling14_mortality INTEGER DEFAULT 0,
                candling14_validated BOOLEAN DEFAULT FALSE,
                hatching_date DATE,
                hatching_malformation INTEGER DEFAULT 0,
                hatching_dead INTEGER DEFAULT 0,
                hatching_validated BOOLEAN DEFAULT FALSE,
                costs_eggs DECIMAL(10,2) DEFAULT 0,
                costs_energy DECIMAL(10,2) DEFAULT 0,
                costs_feed DECIMAL(10,2) DEFAULT 0,
                costs_labor DECIMAL(10,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS clients (
                id TEXT PRIMARY KEY,
                user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                contact TEXT,
                chicks_ordered INTEGER DEFAULT 0,
                total_amount DECIMAL(10,2) DEFAULT 0,
                lot_id TEXT REFERENCES lots(id) ON DELETE SET NULL,
                status TEXT DEFAULT 'reserved',
                delivered_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS temp_logs (
                id TEXT PRIMARY KEY,
                user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
                lot_id TEXT REFERENCES lots(id) ON DELETE CASCADE,
                date DATE NOT NULL,
                temperature DECIMAL(4,1),
                humidity INTEGER,
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY,
                user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                text TEXT NOT NULL,
                type TEXT DEFAULT 'info',
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        
        console.log('✅ Tables créées/vérifiées avec succès');
    } catch (err) {
        console.error('❌ Erreur lors de la création des tables:', err.message);
    }
}

// ============================================================
// Middleware
// ============================================================
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

// ============================================================
// Middleware d'authentification
// ============================================================
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token manquant' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide' });
  }
};

// ============================================================
// ROUTES D'AUTHENTIFICATION
// ============================================================

// Inscription
app.post('/api/auth/register', async (req, res) => {
  try {
    const { firstName, farmName, address, password, species } = req.body;
    
    if (!firstName || !farmName || !password) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }
    
    const existing = await pool.query('SELECT id FROM users WHERE first_name = $1', [firstName]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Ce nom est déjà pris' });
    }
    
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await pool.query(
      `INSERT INTO users (id, first_name, farm_name, address, password_hash, species)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, firstName, farmName, address || '', hashedPassword, species || 'poule']
    );
    
    const token = jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({
      token,
      user: { id, firstName, farmName, address: address || '', species: species || 'poule' }
    });
  } catch (err) {
    console.error('Erreur inscription:', err);
    res.status(500).json({ error: 'Erreur serveur: ' + err.message });
  }
});

// Connexion
app.post('/api/auth/login', async (req, res) => {
  try {
    const { firstName, password } = req.body;
    
    if (!firstName || !password) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }
    
    const result = await pool.query('SELECT * FROM users WHERE first_name = $1', [firstName]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Nom ou mot de passe incorrect' });
    }
    
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Nom ou mot de passe incorrect' });
    }
    
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        farmName: user.farm_name,
        address: user.address,
        species: user.species
      }
    });
  } catch (err) {
    console.error('Erreur connexion:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer l'utilisateur courant
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, first_name, farm_name, address, species FROM users WHERE id = $1',
      [req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    const user = result.rows[0];
    res.json({
      id: user.id,
      firstName: user.first_name,
      farmName: user.farm_name,
      address: user.address,
      species: user.species
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================================
// ROUTES POUR LES LOTS
// ============================================================

app.get('/api/lots', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM lots WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur récupération lots:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/lots', authenticate, async (req, res) => {
  try {
    const {
      lotNumber, incubator, species, breed, origin, breederLayDate, targetRate, notes,
      collectionDate, collectionQuantity, collectionCracked, collectionValidated,
      incubationDate, incubationValidated,
      candling7Date, candling7Clear, candling7Mortality, candling7Validated,
      candling14Date, candling14Contaminated, candling14Mortality, candling14Validated,
      hatchingDate, hatchingMalformation, hatchingDead, hatchingValidated,
      costs
    } = req.body;

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const costs_eggs = costs?.eggs || 0;
    const costs_energy = costs?.energy || 0;
    const costs_feed = costs?.feed || 0;
    const costs_labor = costs?.labor || 0;

    await pool.query(
      `INSERT INTO lots (
        id, user_id, lot_number, incubator, species, breed, origin, breeder_lay_date, target_rate, notes,
        collection_date, collection_quantity, collection_cracked, collection_validated,
        incubation_date, incubation_validated,
        candling7_date, candling7_clear, candling7_mortality, candling7_validated,
        candling14_date, candling14_contaminated, candling14_mortality, candling14_validated,
        hatching_date, hatching_malformation, hatching_dead, hatching_validated,
        costs_eggs, costs_energy, costs_feed, costs_labor
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14,
                $15, $16,
                $17, $18, $19, $20,
                $21, $22, $23, $24,
                $25, $26, $27, $28,
                $29, $30, $31, $32)`,
      [id, req.userId, lotNumber, incubator, species, breed, origin, breederLayDate, targetRate, notes,
        collectionDate, collectionQuantity, collectionCracked, collectionValidated,
        incubationDate, incubationValidated,
        candling7Date, candling7Clear, candling7Mortality, candling7Validated,
        candling14Date, candling14Contaminated, candling14Mortality, candling14Validated,
        hatchingDate, hatchingMalformation, hatchingDead, hatchingValidated,
        costs_eggs, costs_energy, costs_feed, costs_labor
      ]
    );
    
    const result = await pool.query('SELECT * FROM lots WHERE id = $1', [id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erreur création lot:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/lots/:id', authenticate, async (req, res) => {
  try {
    const lotId = req.params.id;
    
    const check = await pool.query('SELECT user_id FROM lots WHERE id = $1', [lotId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Lot non trouvé' });
    }
    if (check.rows[0].user_id !== req.userId) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const {
      lotNumber, incubator, species, breed, origin, breederLayDate, targetRate, notes,
      collectionDate, collectionQuantity, collectionCracked, collectionValidated,
      incubationDate, incubationValidated,
      candling7Date, candling7Clear, candling7Mortality, candling7Validated,
      candling14Date, candling14Contaminated, candling14Mortality, candling14Validated,
      hatchingDate, hatchingMalformation, hatchingDead, hatchingValidated,
      costs
    } = req.body;

    const costs_eggs = costs?.eggs || 0;
    const costs_energy = costs?.energy || 0;
    const costs_feed = costs?.feed || 0;
    const costs_labor = costs?.labor || 0;

    await pool.query(
      `UPDATE lots SET
        lot_number = $1, incubator = $2, species = $3, breed = $4, origin = $5, 
        breeder_lay_date = $6, target_rate = $7, notes = $8,
        collection_date = $9, collection_quantity = $10, collection_cracked = $11, collection_validated = $12,
        incubation_date = $13, incubation_validated = $14,
        candling7_date = $15, candling7_clear = $16, candling7_mortality = $17, candling7_validated = $18,
        candling14_date = $19, candling14_contaminated = $20, candling14_mortality = $21, candling14_validated = $22,
        hatching_date = $23, hatching_malformation = $24, hatching_dead = $25, hatching_validated = $26,
        costs_eggs = $27, costs_energy = $28, costs_feed = $29, costs_labor = $30
      WHERE id = $31`,
      [lotNumber, incubator, species, breed, origin, breederLayDate, targetRate, notes,
        collectionDate, collectionQuantity, collectionCracked, collectionValidated,
        incubationDate, incubationValidated,
        candling7Date, candling7Clear, candling7Mortality, candling7Validated,
        candling14Date, candling14Contaminated, candling14Mortality, candling14Validated,
        hatchingDate, hatchingMalformation, hatchingDead, hatchingValidated,
        costs_eggs, costs_energy, costs_feed, costs_labor,
        lotId
      ]
    );
    
    const result = await pool.query('SELECT * FROM lots WHERE id = $1', [lotId]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur mise à jour lot:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/lots/:id', authenticate, async (req, res) => {
  try {
    const lotId = req.params.id;
    
    const check = await pool.query('SELECT user_id FROM lots WHERE id = $1', [lotId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Lot non trouvé' });
    }
    if (check.rows[0].user_id !== req.userId) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }
    
    await pool.query('DELETE FROM lots WHERE id = $1', [lotId]);
    res.status(204).send();
  } catch (err) {
    console.error('Erreur suppression lot:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================================
// ROUTES POUR LES CLIENTS
// ============================================================

app.get('/api/clients', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM clients WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur récupération clients:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/clients', authenticate, async (req, res) => {
  try {
    const { name, contact, chicksOrdered, totalAmount, lotId, status, deliveredAt } = req.body;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    
    await pool.query(
      `INSERT INTO clients (id, user_id, name, contact, chicks_ordered, total_amount, lot_id, status, delivered_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, req.userId, name, contact || '', chicksOrdered || 0, totalAmount || 0, lotId || null, status || 'reserved', deliveredAt || null]
    );
    
    const result = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erreur création client:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/clients/:id', authenticate, async (req, res) => {
  try {
    const clientId = req.params.id;
    
    const check = await pool.query('SELECT user_id FROM clients WHERE id = $1', [clientId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }
    if (check.rows[0].user_id !== req.userId) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }
    
    const { name, contact, chicksOrdered, totalAmount, lotId, status, deliveredAt } = req.body;
    await pool.query(
      `UPDATE clients SET 
        name = $1, contact = $2, chicks_ordered = $3, total_amount = $4, 
        lot_id = $5, status = $6, delivered_at = $7
       WHERE id = $8`,
      [name, contact, chicksOrdered, totalAmount, lotId, status, deliveredAt, clientId]
    );
    
    const result = await pool.query('SELECT * FROM clients WHERE id = $1', [clientId]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur mise à jour client:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/clients/:id', authenticate, async (req, res) => {
  try {
    const clientId = req.params.id;
    
    const check = await pool.query('SELECT user_id FROM clients WHERE id = $1', [clientId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }
    if (check.rows[0].user_id !== req.userId) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }
    
    await pool.query('DELETE FROM clients WHERE id = $1', [clientId]);
    res.status(204).send();
  } catch (err) {
    console.error('Erreur suppression client:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================================
// ROUTES POUR LES TEMPÉRATURES
// ============================================================

app.get('/api/temp-logs', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM temp_logs WHERE user_id = $1 ORDER BY date DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur récupération températures:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/temp-logs', authenticate, async (req, res) => {
  try {
    const { lotId, date, temperature, humidity, notes } = req.body;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    
    await pool.query(
      `INSERT INTO temp_logs (id, user_id, lot_id, date, temperature, humidity, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, req.userId, lotId, date, temperature, humidity, notes || '']
    );
    
    const result = await pool.query('SELECT * FROM temp_logs WHERE id = $1', [id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erreur création température:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/temp-logs/:id', authenticate, async (req, res) => {
  try {
    const logId = req.params.id;
    
    const check = await pool.query('SELECT user_id FROM temp_logs WHERE id = $1', [logId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Entrée non trouvée' });
    }
    if (check.rows[0].user_id !== req.userId) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }
    
    await pool.query('DELETE FROM temp_logs WHERE id = $1', [logId]);
    res.status(204).send();
  } catch (err) {
    console.error('Erreur suppression température:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================================
// ROUTES POUR LES NOTIFICATIONS
// ============================================================

app.get('/api/notifications', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur récupération notifications:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/notifications', authenticate, async (req, res) => {
  try {
    const { title, text, type } = req.body;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    
    await pool.query(
      `INSERT INTO notifications (id, user_id, title, text, type)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, req.userId, title, text, type || 'info']
    );
    
    const result = await pool.query('SELECT * FROM notifications WHERE id = $1', [id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erreur création notification:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/notifications', authenticate, async (req, res) => {
  try {
    await pool.query('DELETE FROM notifications WHERE user_id = $1', [req.userId]);
    res.status(204).send();
  } catch (err) {
    console.error('Erreur suppression notifications:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================================
// ROUTES POUR LES STATISTIQUES
// ============================================================

app.get('/api/stats', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM lots WHERE user_id = $1',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur récupération statistiques:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================================
// ROUTE DE TEST
// ============================================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: '🚀 Serveur Tico Farm en ligne' });
});

// ============================================================
// DÉMARRAGE DU SERVEUR
// ============================================================

pool.connect()
    .then(async () => {
        console.log('✅ Connecté à PostgreSQL');
        await initDatabase();
    })
    .catch(err => console.error('❌ Erreur de connexion PostgreSQL:', err));
// ============================================================
// ROUTE DE TEST - Création d'un utilisateur (À SUPPRIMER APRÈS)
// ============================================================
app.get('/api/create-test-user', async (req, res) => {
    try {
        const bcrypt = require('bcrypt');
        const { Pool } = require('pg');
        
        // Connexion à la base
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        
        const firstName = 'Jean';
        const farmName = 'Ferme Egbame';
        const address = 'Adetikopé';
        const password = 'test1234';  // ← Changez ce mot de passe
        const species = 'poule';
        
        // Vérifier si l'utilisateur existe déjà
        const existing = await pool.query('SELECT id FROM users WHERE first_name = $1', [firstName]);
        if (existing.rows.length > 0) {
            return res.json({ 
                success: false, 
                message: '❌ L\'utilisateur existe déjà. Essayez de vous connecter directement.' 
            });
        }
        
        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        
        // Insérer l'utilisateur
        await pool.query(
            `INSERT INTO users (id, first_name, farm_name, address, password_hash, species)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, firstName, farmName, address, hashedPassword, species]
        );
        
        res.json({
            success: true,
            message: '✅ Utilisateur créé avec succès !',
            user: { id, firstName, farmName, address, species }
        });
    } catch (err) {
        console.error('Erreur création test:', err);
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});
app.listen(PORT, () => {
  console.log(`🚀 Serveur Tico Farm démarré sur le port ${PORT}`);
  console.log(`📊 Base de données: ${process.env.DATABASE_URL ? '✅ Configurée' : '❌ Non configurée'}`);
});
