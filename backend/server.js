require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDb } = require('./db');


const authRoutes = require('./routes/auth');
const habitRoutes = require('./routes/habits');
const dashboardRoutes = require('./routes/dashboardRoutes');
const profileRoutes = require('./routes/profile');
const rewardsRoutes = require("./routes/rewards");
const socialRoutes = require("./routes/social");

const app = express();
app.use(cors());

app.use(bodyParser.json());

const uploadsDir = path.join(__dirname, 'uploads');
const avatarsDir = path.join(uploadsDir, 'avatars');
fs.mkdirSync(avatarsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));
initDb();

app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/profile', profileRoutes);
app.use("/api/rewards", rewardsRoutes);
app.use("/api/social", socialRoutes);

app.get('/', (req, res) => res.send('Checkpointly backend running'));
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});


const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Checkpointly server listening on ${port}`));